import { Router } from 'express';
import ProductsController from '../controllers/products.controller';
import middlewares from '../middlewares';
import { UserRoles } from '../types/userRoles';

const router = Router();
router.get('/getProductById',
    middlewares.validateRole([UserRoles.ADMIN, UserRoles.STOCK, UserRoles.QUERY]),
    ProductsController.getProductById);
router.get('/getProductsByQuery',
    middlewares.validateRole([UserRoles.ADMIN, UserRoles.STOCK, UserRoles.QUERY]),
    ProductsController.getProductsByQuery);
    
router.post('/createProduct',
    middlewares.validateRole([UserRoles.ADMIN, UserRoles.STOCK]),
    ProductsController.createProduct);
router.put('/editProduct',
    middlewares.validateRole([UserRoles.ADMIN, UserRoles.STOCK]),
    ProductsController.editProduct);
router.delete('/deleteProduct',
    middlewares.validateRole([UserRoles.ADMIN, UserRoles.STOCK]),
    ProductsController.deleteProduct);

export default router;