import { Request, Response } from "express";
import { User } from "../entity/user.model";
import { database, UserRepository } from "../database";

export class UserController {
    public static async create (req: Request, res: Response) {
        if (!req.body.username) {
            res.status(400).json({ error: "username is required" });
            return;
        }
        const user = new User();
        user.username = req.body.username;
        await UserRepository.save(user);
        res.json(user);
    }
}