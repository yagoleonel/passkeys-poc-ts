import express, { Router } from "express";
import path from "path";
import { RegistrationController } from "./controllers/registration.controller";
import { UserController } from "./controllers/user.controller";
import { AuthenticationController } from "./controllers/authentication.controller";

export const frontendRoutes = Router().get("/", express.static(path.join(__dirname, '../public')));

export const backendRoutes = Router()
    // 1 - Return the user passkeys credentials available
    .post("/user", UserController.create)
    // 2 - Register one user passkeys credential
    .post("/registration/start", RegistrationController.start)
    // 3 - Finish the user registration
    .post("/registration/finish", RegistrationController.finish)
    // 4 - Start user athentication with passkeys
    .post("/authentication/start", AuthenticationController.start)
    // 5 - Finish the user authentication, return token
    .post("/authentication/finish", AuthenticationController.finish)