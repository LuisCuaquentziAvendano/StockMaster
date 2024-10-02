import { Schema } from "mongoose";

export interface LoginJwtPayload {
    _id: Schema.Types.ObjectId,
    timestamp: number
}