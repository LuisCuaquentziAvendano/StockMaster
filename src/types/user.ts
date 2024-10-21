import { UserRoles } from '../utils/roles';
import { UserStatus } from '../utils/status';
import { Schema } from 'mongoose';

export interface IUser {
    _id?: Schema.Types.ObjectId;
    email: string;
    password: string;
    name: string;
    status: UserStatus;
    token?: string;
    role?: UserRoles;
}

export interface AssignedRole {
    user: Schema.Types.ObjectId;
    role: UserRoles;
}