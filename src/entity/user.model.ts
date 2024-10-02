import { Entity, PrimaryGeneratedColumn, Column, OneToMany, EntityTarget, Repository, EntitySchema } from "typeorm"
import { IUser } from "../types/user.interface"
import { IPasskeys } from "../types/passkeys.interface"

@Entity("User")
export class User implements IUser {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ type: "varchar", length: 255, unique: true })
  username!: string
}