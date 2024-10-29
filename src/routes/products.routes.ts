import { Router } from 'express';
import { ProductsController } from '../controllers';
import { getProduct, validateRole } from '../middlewares';
import { UserRoles } from '../utils/roles';

const router = Router();

router.post('/createProduct',
    validateRole([UserRoles.ADMIN, UserRoles.STOCK]),
    ProductsController.createProduct);

router.get('/getProductById',
    validateRole([UserRoles.ADMIN, UserRoles.STOCK, UserRoles.QUERY]),
    getProduct,
    ProductsController.getProductById);

router.get('/getProductsByQuery',
    validateRole([UserRoles.ADMIN, UserRoles.STOCK, UserRoles.QUERY]),
    ProductsController.getProductsByQuery);

router.put('/updateProduct',
    validateRole([UserRoles.ADMIN, UserRoles.STOCK]),
    getProduct,
    ProductsController.updateProduct);

router.delete('/deleteProduct',
    validateRole([UserRoles.ADMIN, UserRoles.STOCK]),
    getProduct,
    ProductsController.deleteProduct);

export default router;