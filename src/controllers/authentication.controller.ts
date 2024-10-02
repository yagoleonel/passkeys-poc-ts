import { Request, Response } from "express";
import { PassKeysRepository, UserRepository } from "../database";
import { AuthenticationResponseJSON, PublicKeyCredentialRequestOptionsJSON } from "@simplewebauthn/server/script/deps";
import { generateAuthenticationOptions, verifyAuthenticationResponse } from "@simplewebauthn/server";
import { generateChallenge, isoUint8Array } from "@simplewebauthn/server/helpers";
import { User } from "../entity/user.model";


interface IAuthentication {
    user: User;
    options: PublicKeyCredentialRequestOptionsJSON;
}

const authentications = new Map<number, IAuthentication>();

export class AuthenticationController {
    static async start(req: Request, res: Response) {
        const username = req.body.username as string;
        if (!username) {
            return res.status(400).json({ message: "username is required" });
        }
        const user = await UserRepository.findOne({
            where: { username }
        });

        console.log('user', user);

        if (!user) {
            return res.status(400).json({ message: "user not found" });
        }

        const passkeys = await PassKeysRepository.find({
            where: { userId: user.id }
        });

        if (!passkeys.length) {
            return res.status(400).json({ message: "no passkeys found" });
        }

        const options = await generateAuthenticationOptions({
            rpID: process.env.PASSKEYS_RP_ID!,
            userVerification: 'required',
            challenge: await generateChallenge(),
            // timeout of the authentication in ms (60 seconds)
            timeout: 60000,
            // this tells which credentials only we accept for that user
            allowCredentials: passkeys.map(passkey => ({
              id: passkey.id,
              transports: JSON.parse(passkey.transports),
            })),
        });

        const authenticationId = authentications.size + 1;
        authentications.set(authenticationId, { user, options });

        res.json({ authenticationId, options });
    }
    
    static async finish(req: Request, res: Response) {
        const authenticationId = Number(req.query.authenticationId);
        if (!authenticationId) {
            return res.status(400).json({ message: "authenticationId is required" });
        }
        
        const authentication = authentications.get(authenticationId);
        if (!authentication) {
            return res.status(400).json({ message: "authentication not found" });
        }

        const currentOptions = authentication.options;
        const user = authentication.user;

        const data: AuthenticationResponseJSON = req.body;

        const userDb = await UserRepository.findOne({
            where: { id: user.id }
        })
        if (!userDb) {
            return res.status(400).json({ message: "user not found" });
        }

        const passkey = await PassKeysRepository.findOne({
            where: { id: data.id, userId: user.id }
        });
        if (!passkey) {
            return res.status(400).json({ message: "passkey not found" });
        }
        
        let verification;
        try {
            verification = await verifyAuthenticationResponse(
              {
                response: data,
                expectedChallenge: currentOptions.challenge,
                expectedOrigin: process.env.PASSKEYS_ORIGIN!.split(','),
                expectedRPID: process.env.PASSKEYS_RP_ID!,
                authenticator: {
                    credentialID: passkey.id,
                    credentialPublicKey: isoUint8Array.fromHex(passkey.publicKey),
                    counter: passkey.counter,
                    transports: JSON.parse(passkey.transports),
                },
            });
        } catch (error) {
            console.error(error);
            return res.status(400).json({ message: "authentication failed" });
        }

        if (!verification.verified) {
            return res.status(400).json({ message: "authentication failed" });
        }

        console.log(verification);

        passkey.counter = verification.authenticationInfo.newCounter;

        res.json({ message: "authentication successful" });
    }
}