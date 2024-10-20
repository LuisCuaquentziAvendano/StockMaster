import { Router } from 'express';
import UsersController from '../controllers/users.controller';
import middlewares from '../middlewares';

const router = Router();

router.post('/register', UsersController.register);

router.post('/login', UsersController.login);

router.get('/getData',
    middlewares.validateToken,
    UsersController.getData);

router.get('/getInventories',
    middlewares.validateToken,
    UsersController.getInventories);

router.put('/verifyEmail/:token', UsersController.verifyEmail);

router.put('/generateNewToken',
    middlewares.validateToken,
    UsersController.generateNewToken);

router.put('/updateData',
    middlewares.validateToken,
    UsersController.updateData);

router.put('/updatePassword',
    middlewares.validateToken,
    UsersController.updatePassword);
    
router.delete('/deleteUser',
    middlewares.validateToken,
    UsersController.deleteUser);

export default router;