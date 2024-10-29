import { Router } from 'express';
import { UsersController } from '../controllers';
import { validateToken } from '../middlewares';

const router = Router();

router.post('/register', UsersController.register);

router.post('/login', UsersController.login);

router.get('/getData',
    validateToken,
    UsersController.getData);

router.get('/getInventories',
    validateToken,
    UsersController.getInventories);

router.put('/generateNewToken',
    validateToken,
    UsersController.generateNewToken);

router.put('/updateData',
    validateToken,
    UsersController.updateData);

router.put('/updatePassword',
    validateToken,
    UsersController.updatePassword);
    
router.delete('/deleteUser',
    validateToken,
    UsersController.deleteUser);

export default router;