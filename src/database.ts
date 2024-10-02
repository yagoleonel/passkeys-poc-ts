import { DataSource } from "typeorm";
import { User } from "./entity/user.model";
import { Passkeys } from "./entity/passkeys.model";

export const database = new DataSource({
    type: "sqlite",
    database: "mydb.sqlite",
    synchronize: true,
    entities: [__dirname + "/entity/*.ts"]
})


export const UserRepository = database.getRepository(User);
export const PassKeysRepository = database.getRepository(Passkeys);