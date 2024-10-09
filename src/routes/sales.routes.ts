import { Router } from 'express';
import SalesController from '../controllers/sales.controller';

const router = Router();
router.post('/makePurchase', SalesController.makePurchase);
router.put('/refundPurchase', SalesController.refundPurchase);
router.get('/getPurchaseOrder', SalesController.getPurchaseOrder);
router.get('/getSalesByInventory', SalesController.getSalesByInventory);


export default router;