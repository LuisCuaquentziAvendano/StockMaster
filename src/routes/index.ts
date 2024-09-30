import { Router, json, Request, Response } from 'express';
import users from './users.routes';
import inventories from './inventories.routes';
import products from './products.routes';
import sales from './sales.routes';
import middlewares from '../middlewares';
import { UserRoles } from '../types/userRoles';

const router = Router();
router.use(json());

router.get('/', (req: Request, res: Response) => {
    res.send('Stock Master API');
});

router.use('/users', users);
router.use('/inventories',
    middlewares.validateToken,
    middlewares.getInventory,
    middlewares.validateRole([UserRoles.ADMIN]),
    inventories);
router.use('/products',
    middlewares.validateToken,
    middlewares.getInventory,
    products);
router.use('/sales',
    middlewares.validateToken,
    middlewares.getInventory,
    middlewares.validateRole([UserRoles.ADMIN, UserRoles.STOCK, UserRoles.QUERY]),
    sales);

export default router;