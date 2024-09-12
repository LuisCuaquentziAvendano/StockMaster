import { Router } from 'express';
import ProductsController from '../controllers/products.controller';
import middlewares from '../middlewares';
import roles from '../constants/roles';

const router = Router();
router.get('/getProductById',
    middlewares.validateRole([roles.ADMIN_USER, roles.STOCK_USER, roles.QUERY_USER]),
    ProductsController.getProductById);
router.get('/getProductsByQuery',
    middlewares.validateRole([roles.ADMIN_USER, roles.STOCK_USER, roles.QUERY_USER]),
    ProductsController.getProductsByQuery);
    
router.post('/createProduct',
    middlewares.validateRole([roles.ADMIN_USER, roles.STOCK_USER]),
    ProductsController.createProduct);
router.put('/editProduct',
    middlewares.validateRole([roles.ADMIN_USER, roles.STOCK_USER]),
    ProductsController.editProduct);
router.delete('/deleteProduct',
    middlewares.validateRole([roles.ADMIN_USER, roles.STOCK_USER]),
    ProductsController.deleteProduct);

export default router;