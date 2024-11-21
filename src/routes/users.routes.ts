import { Router } from 'express';
import passport from 'passport';
import { UsersController } from '../controllers';
import { validateToken } from '../middlewares';
import { FRONTEND_URL } from '../utils/envVariables';

const router = Router();

router.post('/register', UsersController.register);

router.post('/login', UsersController.login);

router.get('/googleAuth',
    passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get('/googleRegister',
    passport.authenticate('google', { failureRedirect: FRONTEND_URL }),
    UsersController.googleRegister);

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