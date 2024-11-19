import { Router, Request, Response, NextFunction } from 'express';
import passport from 'passport';
import { UsersController } from '../controllers';
import { validateToken } from '../middlewares';
import { FRONTEND_URL } from '../utils/envVariables';

const router = Router();

router.post('/register', UsersController.register);

router.post('/login', UsersController.login);

router.get('/googleAuth',
    (req: Request, res: Response, next: NextFunction) => { res.setHeader('Access-Control-Allow-Origin', '*'); next(); },
    passport.authenticate('google', { scope: ['profile', 'email'] }));

router.post('/googleResponse',
    passport.authenticate('google', { failureRedirect: '/login' }),
    (req: Request, res: Response) => {
        res.redirect(`${FRONTEND_URL}/inventories`);
    });

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