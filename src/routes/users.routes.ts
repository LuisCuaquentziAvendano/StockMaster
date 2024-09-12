import { Router } from 'express';
import UsersController from '../controllers/users.controller';
import middlewares from '../middlewares';

const router = Router();
router.post('/registerUser', UsersController.registerUser);
router.put('/verifyUser/:token', UsersController.verifyUser);
router.get('/getToken', UsersController.getToken);
router.get('/setNewToken', UsersController.setNewToken);
router.put('/deleteToken', UsersController.deleteToken);
router.get('/getInventories',
    middlewares.validateToken,
    UsersController.getInventories);
router.put('/editPassword/:token', UsersController.editPassword);
router.delete('/deleteUser', UsersController.deleteUser);

export default router;