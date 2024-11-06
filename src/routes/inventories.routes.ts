import { Router } from 'express';
import { InventoriesController } from '../controllers';
import { getInventory, validateRole } from '../middlewares';
import { UserRoles } from '../utils/roles';

const router = Router();

router.post('/createInventory',
    InventoriesController.createInventory);

router.get('/getInventory',
    getInventory,
    validateRole([UserRoles.ADMIN, UserRoles.STOCK, UserRoles.QUERY]),
    InventoriesController.getInventory);

router.get('/getPermissions',
    getInventory,
    validateRole([UserRoles.ADMIN]),
    InventoriesController.getPermissions);

router.put('/updateData',
    getInventory,
    validateRole([UserRoles.ADMIN]),
    InventoriesController.updateData);

router.put('/createField',
    getInventory,
    validateRole([UserRoles.ADMIN]),
    InventoriesController.createField);

router.put('/updateField',
    getInventory,
    validateRole([UserRoles.ADMIN]),
    InventoriesController.updateField);

router.put('/deleteField',
    getInventory,
    validateRole([UserRoles.ADMIN]),
    InventoriesController.deleteField);

router.put('/modifyPermission',
    getInventory,
    validateRole([UserRoles.ADMIN]),
    InventoriesController.modifyPermission);

router.delete('/deleteInventory',
    getInventory,
    validateRole([UserRoles.ADMIN]),
    InventoriesController.deleteInventory);

export default router;