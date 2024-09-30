import { Router } from 'express';
import UsersController from '../controllers/users.controller';
import middlewares from '../middlewares';

const router = Router();
router.post('/registerUser', UsersController.registerUser);
router.put('/verifyUser/:token', UsersController.verifyUser);
router.get('/getToken', UsersController.getToken);
router.get('/generateNewToken',
    middlewares.validateToken,
    UsersController.setNewToken);
router.get('/getInventories',
    middlewares.validateToken,
    UsersController.getInventories);
router.put('/editPassword',
    middlewares.validateToken,
    UsersController.editPassword);
router.delete('/deleteUser',
    middlewares.validateToken,
    UsersController.deleteUser);

export default router;