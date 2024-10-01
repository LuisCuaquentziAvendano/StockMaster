import { Router } from 'express';
import UsersController from '../controllers/users.controller';
import middlewares from '../middlewares';

const router = Router();
router.post('/register', UsersController.register);
router.put('/verifyEmail/:token', UsersController.verifyEmail);
router.get('/login', UsersController.login);
router.get('/generateNewToken',
    middlewares.validateToken,
    UsersController.generateNewToken);
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