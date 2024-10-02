import { Request, Response } from "express";
import { PassKeysRepository, UserRepository } from "../database";

import { generateRegistrationOptions, verifyRegistrationResponse } from "@simplewebauthn/server";

import { isoUint8Array, generateChallenge, isoBase64URL } from "@simplewebauthn/server/helpers";
import { PublicKeyCredentialCreationOptionsJSON, RegistrationResponseJSON } from "@simplewebauthn/server/script/deps";
import { Passkeys } from "../entity/passkeys.model";

const Registration: Map<number, PublicKeyCredentialCreationOptionsJSON> = new Map();

export class RegistrationController {
    static async start(req: Request, res: Response) {
        const username = req.body.username as string;
        if (!username) {
            return res.status(400).json({ message: "username is required" });
        }
        const user = await UserRepository.findOne({
            where: { username }
        });
        if (!user) {
            return res.status(400).json({ message: "user not found" });
        }

        const passkeys = await PassKeysRepository.find({
            where: { userId: user.id }
        });

        const challenge = await generateChallenge();
        
        const options = await generateRegistrationOptions({
            rpName: process.env.PASSKEYS_RP_NAME!,
            rpID: process.env.PASSKEYS_RP_ID!,
            challenge,
            userID: isoUint8Array.fromUTF8String(user.id),
            userName: user.username,
            userDisplayName: user.username,
            attestationType: 'direct',
            // Prevent users from re-registering existing authenticators
            excludeCredentials: passkeys?.map(passkey => ({
              id: passkey.id,
            })),
            timeout: 60000,
            authenticatorSelection: {
              // Defaults
              residentKey: 'preferred',
              userVerification: 'required', // Will always require MFA (PIN, fingerprint, etc.)
              // Optional
              authenticatorAttachment: req.query.attachment as AuthenticatorAttachment || 'platform', //cross-platform (suggest to use mobile phone or usb stick even from a PC browser) | platform (suggest to use the platform authenticator)
            }
        });

        const registrationId = Registration.size + 1;

        Registration.set(registrationId, options)

        // data that we need to validate again in the later request
        res.send({registrationId, options});
    }
    
    static async finish(req: Request, res: Response) {
        const registrationId = Number(req.query.registrationId);
        if (!registrationId) {
            return res.status(400).json({ message: "registrationId is required" });
        }

        const data: RegistrationResponseJSON = req.body;
        
        const currentOptions = Registration.get(registrationId);
        if (!currentOptions) {
            return res.status(400).json({ message: "registrationId not found" });
        }

        console.log(data);

        const verification = await verifyRegistrationResponse({
            response: data,
            expectedChallenge: currentOptions.challenge,
            expectedOrigin: process.env.PASSKEYS_ORIGIN!.split(','),
            expectedRPID: process.env.PASSKEYS_RP_ID!,
        });

        console.log(verification)

        if (!verification.verified) {
            return res.status(400).json({ message: "registration failed" });
        }

        const { registrationInfo } = verification;
        const {
          credentialID,
          credentialPublicKey,
          counter,
          credentialDeviceType,
          credentialBackedUp,
        } = registrationInfo!;

        const newPasskey: Passkeys = {
            // The user ID from the database
            userId: isoBase64URL.toUTF8String(currentOptions.user.id),
            // The user ID from the webauthn response
            webAuthnUserID: currentOptions.user.id,
            // A unique identifier for the credential
            id: credentialID,
            // The public key bytes, used for subsequent authentication signature verification
            publicKey: isoUint8Array.toHex(credentialPublicKey),
            // The number of times the authenticator has been used on this site so far
            counter,
            // Whether the passkey is single-device or multi-device
            deviceType: credentialDeviceType,
            // Whether the passkey has been backed up in some way
            backedUp: credentialBackedUp,
            // The transports supported by the authenticator
            transports: JSON.stringify(data.response.transports || []),
        };
    
        console.log("PUBLIC KEY", Buffer.from(credentialPublicKey).toString('base64'));

        PassKeysRepository.save(newPasskey);

        console.log("Passkey registered", newPasskey);

        res.json({ message: "registration successful" });
    }
}