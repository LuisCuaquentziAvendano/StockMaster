import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { isEmail } from 'validator';
import User from '../models/user';
import { IUser } from '../types/user';
import { UserStatus } from '../types/status';
import { HTTP_STATUS_CODES } from '../types/httpStatusCodes';
import { NativeTypes, isNativeType } from '../types/nativeTypes';
import { isType, Regex } from '../types/regex';
import { LoginJwtPayload } from '../types/loginJwtPayload';

class UsersController {
    static register(req: Request, res: Response) {
        const [validData, user] = UsersController.validateData(req);
        if (!validData) {
            res.status(HTTP_STATUS_CODES.BAD_REQUEST).send({ error: 'Invalid user data' });
            return;
        }
        Promise.all([
            User.countDocuments({ email: user.email }),
            bcrypt.hash(user.password, 10)
        ]).then(result => {
            const [docs, passwordHash] = result;
            if (docs > 0) {
                res.status(HTTP_STATUS_CODES.BAD_REQUEST).send({ error: 'Email already registered' });
                throw new Error('');
            }
            user.password = passwordHash;
            user.status = UserStatus.ACTIVE;
            user.token = UsersController.createToken(user.email);
            return User.create(user);
        }).then((userCreated: IUser) => {
            res.status(HTTP_STATUS_CODES.CREATED).send({ token: userCreated.token });
        }).catch((error: Error) => {
            if (error.message != '')
                res.sendStatus(HTTP_STATUS_CODES.SERVER_ERROR);
        });
    }

    static login(req: Request, res: Response) {
        const email = req.body.email as string;
        const password = req.body.password as string;
        User.findOne({
            email,
            status: UserStatus.ACTIVE
        }).then((user: IUser) => {
            if (!user) {
                res.sendStatus(HTTP_STATUS_CODES.UNAUTHORIZED);
                throw new Error('');
            }
            return Promise.all([user, bcrypt.compare(password, user.password)]);
        }).then(result => {
            const [user, validLogin] = result;
            if (validLogin) {
                res.send({ token: user.token });
            } else {
                res.sendStatus(HTTP_STATUS_CODES.UNAUTHORIZED);
            }
        }).catch((error: Error) => {
            if (error.message != '')
                res.sendStatus(HTTP_STATUS_CODES.SERVER_ERROR);
        });
    }

    static verifyEmail(req: Request, res: Response) {
        // 
    }

    static generateNewToken(req: Request, res: Response) {
        // 
    }

    static getInventories(req: Request, res: Response) {
        // 
    }

    static deleteUser(req: Request, res: Response) {
        // 
    }

    static editPassword(req: Request, res: Response) {
        // 
    }

    private static createToken(email: string): string {
        const secretKey = process.env.JWT_KEY;
        const payload: LoginJwtPayload = { email, timestamp: Date.now() };
        const token = jwt.sign(payload, secretKey);
        return token;
    }

    private static validateData(req: Request): [boolean, IUser] {
        const name: string = req.body.name;
        const email: string = req.body.email;
        const password: string = req.body.password;
        const user: IUser = {
            name,
            email,
            password,
            status: UserStatus.ACTIVE  // cuando se implemente la verificación, cambiar a estatus nuevo
        };
        if (!isNativeType(NativeTypes.STRING, req.body.name)
            || !isNativeType(NativeTypes.STRING, req.body.email)
            || !isNativeType(NativeTypes.STRING, req.body.password)
            || !isEmail(email)
            || !isType(Regex.USER_NAME, name)
            || !isType(Regex.USER_PASSWORD, password)) {
            return [false, user];
        }
        return [true, user];
    }
}

export default UsersController;