import { Router } from 'express';
import { InventoriesController } from '../controllers/inventories.controller';
import middlewares from '../middlewares';
import { UserRoles } from '../types/user';

const router = Router();
router.get('/getInventory',
    middlewares.getInventory,
    middlewares.validateRole([UserRoles.ADMIN, UserRoles.STOCK, UserRoles.QUERY]),
    InventoriesController.getInventory);
router.post('/createInventory',
    InventoriesController.createInventory);
router.delete('/deleteInventory',
    middlewares.getInventory,
    middlewares.validateRole([UserRoles.ADMIN]),
    InventoriesController.deleteInventory);

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

router.get('/getPermissions',
    middlewares.getInventory,
    middlewares.validateRole([UserRoles.ADMIN]),
    InventoriesController.getPermissions);
router.put('/modifyPermissions',
    middlewares.getInventory,
    middlewares.validateRole([UserRoles.ADMIN]),
    InventoriesController.modifyPermissions);

export default router;