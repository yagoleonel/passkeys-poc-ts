import { Entity, Column, PrimaryGeneratedColumn, ManyToOne } from 'typeorm';

@Entity()
export class Passkeys {
    @Column({ type: "varchar", length: 255, primary: true })
    id!: string;

    @Column({ type: "varchar", length: 255 })
    userId!: string;

    @Column({ type: "varchar", length: 255 })
    webAuthnUserID!: string;

    @Column({ type: "text" })
    publicKey!: string;

    @Column({ type: "int" })
    counter!: number;

    @Column({ type: "varchar", length: 255 })
    deviceType!: string;

    @Column({ type: "boolean" })
    backedUp!: boolean;

    @Column({ type: "varchar", length: 255 })
    transports!: string;
}

