import { Router } from 'express';
import ProductsController from '../controllers/products.controller';
import middlewares from '../middlewares';
import { UserRoles } from '../utils/roles';

const router = Router();
router.get('/getProductById',
    middlewares.validateRole([UserRoles.ADMIN_USER, UserRoles.STOCK_USER, UserRoles.QUERY_USER]),
    ProductsController.getProductById);
router.get('/getProductsByQuery',
    middlewares.validateRole([UserRoles.ADMIN_USER, UserRoles.STOCK_USER, UserRoles.QUERY_USER]),
    ProductsController.getProductsByQuery);
    
router.post('/createProduct',
    middlewares.validateRole([UserRoles.ADMIN_USER, UserRoles.STOCK_USER]),
    ProductsController.createProduct);
router.put('/editProduct',
    middlewares.validateRole([UserRoles.ADMIN_USER, UserRoles.STOCK_USER]),
    ProductsController.editProduct);
router.delete('/deleteProduct',
    middlewares.validateRole([UserRoles.ADMIN_USER, UserRoles.STOCK_USER]),
    ProductsController.deleteProduct);

export default router;