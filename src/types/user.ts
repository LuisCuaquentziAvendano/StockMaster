import { UserStatus } from "./status";
import { Schema } from 'mongoose';

export interface IUser {
    _id?: Schema.Types.ObjectId;
    email: string;
    password: string;
    name: string;
    status: UserStatus;
    token?: string;
}

export enum UserRoles {
    ADMIN = 'admin',
    STOCK = 'stock',
    QUERY = 'query',
    NONE = 'none'
}

export const UserRoles2 = Object.freeze([
    UserRoles.ADMIN,
    UserRoles.STOCK,
    UserRoles.QUERY,
    UserRoles.NONE
]) as string[];

export interface AssignedRole {
    user: Schema.Types.ObjectId;
    role: UserRoles;
}