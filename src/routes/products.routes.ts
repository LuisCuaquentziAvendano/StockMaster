import { Router } from 'express';
import ProductsController from '../controllers/products.controller';
import middlewares from '../middlewares';
import { UserRoles } from '../types/user';

const router = Router();
router.get('/getProductById',
    middlewares.validateRole([UserRoles.ADMIN, UserRoles.STOCK, UserRoles.QUERY]),
    middlewares.getProduct,
    ProductsController.getProductById);
router.get('/getProductsByQuery',
    middlewares.validateRole([UserRoles.ADMIN, UserRoles.STOCK, UserRoles.QUERY]),
    ProductsController.getProductsByQuery);
    
router.post('/createProduct',
    middlewares.validateRole([UserRoles.ADMIN, UserRoles.STOCK]),
    ProductsController.createProduct);
router.put('/updateProduct',
    middlewares.validateRole([UserRoles.ADMIN, UserRoles.STOCK]),
    middlewares.getProduct,
    ProductsController.updateProduct);
router.delete('/deleteProduct',
    middlewares.validateRole([UserRoles.ADMIN, UserRoles.STOCK]),
    middlewares.getProduct,
    ProductsController.deleteProduct);

export default router;