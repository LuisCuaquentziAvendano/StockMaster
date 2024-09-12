import { Router } from 'express';
import SalesController from '../controllers/sales.controller';

const router = Router();
router.post('/makePurchase', SalesController.makePurchase);
router.get('/getPurchaseOrder', SalesController.getPurchaseOrder);

export default router;