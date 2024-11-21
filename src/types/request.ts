import { IInventory } from './inventory';
import { IProduct } from './product';
import { IUser } from './user';

declare global {
    namespace Express {
        interface Request {
            _user?: IUser;
            _inventory?: IInventory;
            _product?: IProduct;
        }
    }
}