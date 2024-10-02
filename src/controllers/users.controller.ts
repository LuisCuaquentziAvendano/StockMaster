import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { isEmail } from 'validator';
import User from '../models/user';
import { IUser } from '../types/user';
import { GeneralUseStatus, UserStatus } from '../types/status';
import { HTTP_STATUS_CODES } from '../types/httpStatusCodes';
import { NativeTypes, isNativeType } from '../types/nativeTypes';
import { isType, Regex } from '../types/regex';
import { LoginJwtPayload } from '../types/loginJwtPayload';
import Inventory from '../models/inventory';
import { IInventory } from '../types/inventory';
import { Schema } from 'mongoose';

class UsersController {
    static register(req: Request, res: Response) {
        const name = req.body.name;
        const email = req.body.email;
        const password = req.body.password;
        if (!isNativeType(NativeTypes.STRING, name)
            || !isType(Regex.USER_NAME, name)
            || !isNativeType(NativeTypes.STRING, email)
            || !isEmail(email)
            || !isNativeType(NativeTypes.STRING, password)
            || !isType(Regex.USER_PASSWORD, password)
        ) {
            res.status(HTTP_STATUS_CODES.BAD_REQUEST).send({ error: 'Invalid user data' });
            return;
        }
        const user: IUser = {
            name,
            email,
            password,
            status: UserStatus.ACTIVE  // debe ser estatus nuevo
        };
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
            return User.create(user);
        }).then((userCreated: IUser) => {
            const token = UsersController.createToken(userCreated._id);
            return User.findOneAndUpdate({
                _id: userCreated._id
            }, {
                token
            }, {
                new: true
            });
        }).then((userUpdated: IUser) => {
            res.status(HTTP_STATUS_CODES.CREATED).send({ authorization: userUpdated.token });  // no enviar token, solo correo de confirmación
        }).catch((error: Error) => {
            if (error.message != '') {
                res.sendStatus(HTTP_STATUS_CODES.SERVER_ERROR);
            }
        });
    }

    static login(req: Request, res: Response) {
        const email = req.body.email;
        const password = req.body.password;
        if (!isNativeType(NativeTypes.STRING, email)
            || !isEmail(email)
            || !isNativeType(NativeTypes.STRING, password)
            || !isType(Regex.USER_PASSWORD, password)
        ) {
            res.status(HTTP_STATUS_CODES.BAD_REQUEST).send({ error: 'Invalid user data' });
            return;
        }
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
                res.send({ authorization: user.token });
            } else {
                res.sendStatus(HTTP_STATUS_CODES.UNAUTHORIZED);
            }
        }).catch((error: Error) => {
            if (error.message != '') {
                res.sendStatus(HTTP_STATUS_CODES.SERVER_ERROR);
            }
        });
    }

    static verifyEmail(req: Request, res: Response) {
        // 
    }

    static getData(req: Request, res: Response) {
        const user = req.user;
        const data: IUser = {
            email: user.email,
            name: user.name
        };
        res.send(data);
    }

    static generateNewToken(req: Request, res: Response) {
        const user = req.user;
        const newToken = UsersController.createToken(user._id);
        User.updateOne({
            _id: user._id
        }, {
            token: newToken
        }).then(() => {
            res.sendStatus(HTTP_STATUS_CODES.SUCCESS);
        }).catch(() => {
            res.sendStatus(HTTP_STATUS_CODES.SERVER_ERROR);
        });
    }

    static getInventories(req: Request, res: Response) {
        const user = req.user;
        Inventory.find({
            roles: {
                $elemMatch: { user: user._id }
            },
            status: GeneralUseStatus.ACTIVE
        }, {
            name: 1,
            roles: 1
        }).then((inventories: IInventory[]) => {
            const data: Record<any, any>[] = [];
            inventories.forEach(inventory => {
                const assignedRole = inventory.roles.find(role => role.user.toString() == user._id.toString());
                data.push({
                    id: inventory._id,
                    name: inventory.name,
                    role: assignedRole.role
                });
            });
            res.send({ inventories: data });
        }).catch((err) => {
            console.log(err.message);
            res.sendStatus(HTTP_STATUS_CODES.SERVER_ERROR);
        });
    }

    static deleteUser(req: Request, res: Response) {
        const user = req.user;
        User.updateOne({
            _id: user._id
        }, {
            status: UserStatus.DELETED
        }).then(() => {
            res.sendStatus(HTTP_STATUS_CODES.SUCCESS);
        }).catch(() => {
            res.sendStatus(HTTP_STATUS_CODES.SERVER_ERROR);
        });
    }

    static editData(req: Request, res: Response) {
        // 
    }

    static editPassword(req: Request, res: Response) {
        // 
    }

    private static createToken(_id: Schema.Types.ObjectId): string {
        const secretKey = process.env.JWT_KEY;
        const payload: LoginJwtPayload = { _id, timestamp: Date.now() };
        const token = jwt.sign(payload, secretKey);
        return token;
    }
}

export default UsersController;