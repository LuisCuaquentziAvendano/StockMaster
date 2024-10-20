import { Router } from 'express';
import { InventoriesController } from '../controllers/inventories.controller';
import middlewares from '../middlewares';
import { UserRoles } from '../types/user';

const router = Router();

router.post('/createInventory',
    InventoriesController.createInventory);

router.get('/getInventory',
    middlewares.getInventory,
    middlewares.validateRole([UserRoles.ADMIN, UserRoles.STOCK, UserRoles.QUERY]),
    InventoriesController.getInventory);

router.get('/getPermissions',
    middlewares.getInventory,
    middlewares.validateRole([UserRoles.ADMIN]),
    InventoriesController.getPermissions);

router.put('/createField',
    middlewares.getInventory,
    middlewares.validateRole([UserRoles.ADMIN]),
    InventoriesController.createField);

router.put('/updateField',
    middlewares.getInventory,
    middlewares.validateRole([UserRoles.ADMIN]),
    InventoriesController.updateField);

router.put('/deleteField',
    middlewares.getInventory,
    middlewares.validateRole([UserRoles.ADMIN]),
    InventoriesController.deleteField);

router.put('/modifyPermission',
    middlewares.getInventory,
    middlewares.validateRole([UserRoles.ADMIN]),
    InventoriesController.modifyPermission);

router.delete('/deleteInventory',
    middlewares.getInventory,
    middlewares.validateRole([UserRoles.ADMIN]),
    InventoriesController.deleteInventory);

export default router;