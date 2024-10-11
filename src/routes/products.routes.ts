import { Router } from 'express';
import multer from 'multer';
import ProductsController from '../controllers/products.controller';
import middlewares from '../middlewares';
import { UserRoles } from '../types/user';

const router = Router();
const upload = multer();
router.get('/getProductById',
    middlewares.validateRole([UserRoles.ADMIN, UserRoles.STOCK, UserRoles.QUERY]),
    middlewares.getProduct,
    ProductsController.getProductById);
router.get('/getProductsByQuery',
    middlewares.validateRole([UserRoles.ADMIN, UserRoles.STOCK, UserRoles.QUERY]),
    ProductsController.getProductsByQuery);
    
router.post('/createProduct',
    middlewares.validateRole([UserRoles.ADMIN, UserRoles.STOCK]),
    upload.none(),
    ProductsController.createProduct);
router.put('/updateProduct',
    middlewares.validateRole([UserRoles.ADMIN, UserRoles.STOCK]),
    middlewares.getProduct,
    upload.none(),
    ProductsController.updateProduct);
router.delete('/deleteProduct',
    middlewares.validateRole([UserRoles.ADMIN, UserRoles.STOCK]),
    middlewares.getProduct,
    ProductsController.deleteProduct);

export default router;