import { Router } from 'express';
import InventoriesController from '../controllers/inventories.controller';

const router = Router();
router.get('/getSchema', InventoriesController.getSchema);
router.post('/createSchema', InventoriesController.createtSchema);
router.delete('/deleteSchema', InventoriesController.deleteSchema);

router.post('/createField', InventoriesController.createField);
router.put('/editFieldName', InventoriesController.editFieldName);
router.delete('/deleteField', InventoriesController.deleteField);

router.put('/modifyPermissions', InventoriesController.modifyPermissions);
router.put('/confirmInvitation/:token', InventoriesController.confirmInvitation);

export default router;