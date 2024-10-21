import { Router } from 'express';
import { SalesController } from '../controllers';
import { validateRole } from '../middlewares';
import { UserRoles } from '../utils/roles';

const router = Router();

router.post('/makePurchase',
    validateRole([UserRoles.ADMIN, UserRoles.STOCK, UserRoles.QUERY]),
    SalesController.makePurchase);

router.post('/refundPurchase',
    validateRole([UserRoles.ADMIN, UserRoles.STOCK, UserRoles.QUERY]),
    SalesController.refundPurchase);

router.get('/getPurchaseOrder',
    validateRole([UserRoles.ADMIN, UserRoles.STOCK, UserRoles.QUERY]),
    SalesController.getPurchaseOrder);

router.get('/getSalesByInventory',
    validateRole([UserRoles.ADMIN, UserRoles.STOCK]),
    SalesController.getSalesByInventory);

export default router;