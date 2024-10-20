import { Router } from 'express';
import SalesController from '../controllers/sales.controller';
import middlewares from '../middlewares';
import { UserRoles } from '../types/user';

const router = Router();

router.post('/makePurchase',
    middlewares.validateRole([UserRoles.ADMIN, UserRoles.STOCK, UserRoles.QUERY]),
    SalesController.makePurchase);

router.post('/refundPurchase',
    middlewares.validateRole([UserRoles.ADMIN, UserRoles.STOCK, UserRoles.QUERY]),
    SalesController.refundPurchase);

router.get('/getPurchaseOrder',
    middlewares.validateRole([UserRoles.ADMIN, UserRoles.STOCK, UserRoles.QUERY]),
    SalesController.getPurchaseOrder);

router.get('/getSalesByInventory',
    middlewares.validateRole([UserRoles.ADMIN, UserRoles.STOCK]),
    SalesController.getSalesByInventory);

export default router;