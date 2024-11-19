import { Router } from 'express';
import { SalesRecordsController } from '../controllers';
import { validateRole } from '../middlewares';
import { UserRoles } from '../utils/roles';

const router = Router();

router.get('/getSalesByParameter',
    SalesRecordsController.getSalesByParameter);

router.get('/getAllSalesRecords',
    SalesRecordsController.getAllSalesRecords);

router.post('/createSalesRecord',
    SalesRecordsController.createSalesRecord);

router.put('/updateSalesRecord',
    SalesRecordsController.updateSalesRecord);

router.delete('/deleteSalesRecord',
    SalesRecordsController.deleteSalesRecord);
    
export default router;