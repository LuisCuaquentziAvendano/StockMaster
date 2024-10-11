import { Request, Response } from 'express';
import { startSession, mongo } from 'mongoose';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import User from '../models/user';
import { IUser, UserRoles } from '../types/user';
import { GeneralUseStatus, UserStatus } from '../types/status';
import { HTTP_STATUS_CODES } from '../types/httpStatusCodes';
import { LoginJwtPayload } from '../types/loginJwtPayload';
import Inventory from '../models/inventory';
import { IInventory } from '../types/inventory';
import { Schema } from 'mongoose';
import Product from '../models/product';
import { UsersValidations } from './_usersValidations.controller';
import { isObject } from '../types/nativeTypes';

class UsersController {
    private static readonly ENCRYPTION_ROUNDS = 10;

    static register(req: Request, res: Response) {
        if (!isObject(req.body)) {
            res.status(HTTP_STATUS_CODES.BAD_REQUEST).send({ error: 'Body is not an object' });
            return;
        }
        const name = req.body.name;
        const email = req.body.email;
        const password = req.body.password;
        if (
            !UsersValidations._name(name)
            || !UsersValidations.email(email)
            || !UsersValidations.password(password)
        ) {
            res.status(HTTP_STATUS_CODES.BAD_REQUEST).send({ error: 'Invalid user data' });
            return;
        }
        const user: IUser = {
            name,
            email,
            password,
            status: UserStatus.ACTIVE  // status should be new
        };
        let session: mongo.ClientSession;
        Promise.all([
            startSession(),
            User.countDocuments({ email: user.email }),
            bcrypt.hash(user.password, UsersController.ENCRYPTION_ROUNDS)
        ]).then(result => {
            session = result[0];
            session.startTransaction();
            const docs = result[1];
            const passwordHash = result[2];
            if (docs > 0) {
                res.status(HTTP_STATUS_CODES.BAD_REQUEST).send({ error: 'Email already registered' });
                throw new Error('');
            }
            user.password = passwordHash;
            return User.create(user);
        }).then((userCreated: IUser) => {
            const token = UsersController.createToken(userCreated._id);
            return User.updateOne({
                _id: userCreated._id
            }, {
                token
            });
        }).then(() => {
            return session.commitTransaction();
        }).then(() => {
            res.sendStatus(HTTP_STATUS_CODES.CREATED);  // send confirmation email
            session.endSession();
        }).catch((error: Error) => {
            if (error.message != '') {
                res.sendStatus(HTTP_STATUS_CODES.SERVER_ERROR);
            }
            if (session) {
                session.abortTransaction()
                .then(() => session.endSession());
            }
        });
    }

    static login(req: Request, res: Response) {
        if (!isObject(req.body)) {
            res.status(HTTP_STATUS_CODES.BAD_REQUEST).send({ error: 'Body is not an object' });
            return;
        }
        const email = req.body.email;
        const password = req.body.password;
        if (
            !UsersValidations.email(email)
            || !UsersValidations.password(password)
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
        const data = {
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
        }).then((inventories: IInventory[]) => {
            const data: Record<any, any>[] = [];
            inventories.forEach(inventory => {
                const assignedRole = inventory.roles.find(role => role.user.toString() == user._id.toString());
                data.push({
                    inventory: inventory._id,
                    name: inventory.name,
                    role: assignedRole.role
                });
            });
            res.send(data);
        }).catch(() => {
            res.sendStatus(HTTP_STATUS_CODES.SERVER_ERROR);
        });
    }

    static deleteUser(req: Request, res: Response) {
        const user = req.user;
        let session: mongo.ClientSession;
        Promise.all([
            startSession(),
            Inventory.find({
                roles: {
                    $elemMatch: { user: user._id, role: UserRoles.ADMIN }
                }
            })
        ]).then(result => {
            session = result[0];
            session.startTransaction();
            const inventoriesOwned = result[1];
            return Promise.all([
                User.updateOne({
                    _id: user._id
                }, {
                    status: UserStatus.DELETED
                }),
                ...inventoriesOwned.flatMap(inventory => [
                    Inventory.updateOne({
                        _id: inventory._id
                    }, {
                        status: GeneralUseStatus.DELETED
                    }),
                    Product.updateMany({
                        inventory: inventory._id
                    }, {
                        status: GeneralUseStatus.DELETED
                    })
                ]),
                Inventory.updateMany({
                    roles: {
                        $elemMatch: { user: user._id }
                    }
                }, {
                    $pull: {
                        roles: { user: user._id }
                    }
                })
            ]);
        }).then(() => {
            return session.commitTransaction();
        }).then(() => {
            res.sendStatus(HTTP_STATUS_CODES.SUCCESS);
            session.endSession();
        }).catch(() => {
            res.sendStatus(HTTP_STATUS_CODES.SERVER_ERROR);
            if (session) {
                session.abortTransaction()
                .then(() => session.endSession());
            }
        });
    }

    static updateData(req: Request, res: Response) {
        if (!isObject(req.body)) {
            res.status(HTTP_STATUS_CODES.BAD_REQUEST).send({ error: 'Body is not an object' });
            return;
        }
        const name = req.body.name;
        if (!UsersValidations._name(name)) {
            res.status(HTTP_STATUS_CODES.BAD_REQUEST).send({ error: 'Invalid user data' });
            return;
        }
        const user = req.user;
        User.updateOne({
            _id: user._id
        }, {
            name
        }).then(() => {
            res.sendStatus(HTTP_STATUS_CODES.SUCCESS);
        }).catch(() => {
            res.sendStatus(HTTP_STATUS_CODES.SERVER_ERROR);
        })
    }

    static updatePassword(req: Request, res: Response) {
        if (!isObject(req.body)) {
            res.status(HTTP_STATUS_CODES.BAD_REQUEST).send({ error: 'Body is not an object' });
            return;
        }
        const password = req.body.password;
        if (!UsersValidations.password(password)) {
            res.status(HTTP_STATUS_CODES.BAD_REQUEST).send({ error: 'Invalid user data' });
            return;
        }
        const user = req.user;
        const token = UsersController.createToken(user._id);
        bcrypt.hash(password, UsersController.ENCRYPTION_ROUNDS)
        .then(passwordHash => {
            return User.updateOne({
                _id: user._id
            }, {
                password: passwordHash,
                token
            });
        }).then(() => {
            res.sendStatus(HTTP_STATUS_CODES.SUCCESS);
        }).catch(() => {
            res.sendStatus(HTTP_STATUS_CODES.SERVER_ERROR);
        })
    }

    private static createToken(_id: Schema.Types.ObjectId): string {
        const secretKey = process.env.JWT_KEY;
        const payload: LoginJwtPayload = { _id, timestamp: Date.now() };
        const token = jwt.sign(payload, secretKey);
        return token;
    }
}

export default UsersController;