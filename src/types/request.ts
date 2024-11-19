import { IInventory } from './inventory';
import { IProduct } from './product';
import { IUser } from './user';

declare global {
    namespace Express {
        interface Request {
            _user?: IUser;
            inventory?: IInventory;
            product?: IProduct;
        }
    }
}