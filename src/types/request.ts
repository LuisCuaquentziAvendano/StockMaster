import { IInventory } from "./inventory";
import { IUser } from "./user";

declare global {
    namespace Express {
        interface Request {
            user?: IUser;
            inventory?: IInventory;
        }
    }
}