import { Request, Response } from 'express';
import { startSession, mongo, Schema } from 'mongoose';
import { hash, compare } from 'bcrypt';
import { sign } from 'jsonwebtoken';
import { User, Inventory, Product } from '../models';
import { IUser, IInventory, LoginJwtPayload } from '../types';
import { UserRoles } from '../utils/roles';
import { GeneralUseStatus, UserStatus } from '../utils/status';
import { HTTP_STATUS_CODES } from '../utils/httpStatusCodes';
import { UsersValidations } from './_usersUtils';
import { isNativeType, NativeTypes } from '../utils/nativeTypes';
import { JWT_KEY } from '../utils/envVariables';
import { socket } from './socket.controller';

export class UsersController {
    private static readonly ENCRYPTION_ROUNDS = 10;

/**
 * @swagger
 * /api/users/register:
 *   post:
 *     tags: ["users"]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterUser'
 *     responses:
 *       201:
 *         description: User successfully registered
 *       400:
 *         description: Invalid user data or email already registered
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 * 
 * components:
 *   schemas:
 *     RegisterUser:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *           example: "John Doe"
 *         email:
 *           type: string
 *           format: email
 *           example: "john.doe@gmail.com"
 *         password:
 *           type: string
 *           format: password
 *           example: "password"
 */
    static register(req: Request, res: Response) {
        if (!isNativeType(NativeTypes.OBJECT, req.body)) {
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
            status: UserStatus.ACTIVE
        };
        let session: mongo.ClientSession;
        Promise.all([
            startSession(),
            User.countDocuments({ email: user.email }),
            hash(user.password, UsersController.ENCRYPTION_ROUNDS)
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
            res.sendStatus(HTTP_STATUS_CODES.CREATED);
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

/**
 * @swagger
 * /api/users/login:
 *   post:
 *     tags: ["users"]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginUser'
 *     responses:
 *       200:
 *         description: User successfully logged in
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginUserSuccess'
 *       400:
 *         description: Invalid user data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Invalid authentication
 *       500:
 *         description: Server error
 * 
 * components:
 *   schemas:
 *     LoginUser:
 *       type: object
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           example: "john.doe@gmail.com"
 *         password:
 *           type: string
 *           format: password
 *           example: "password"
 * 
 *     LoginUserSuccess:
 *       type: object
 *       properties:
 *         authorization:
 *           type: string
 *           example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI2NzA5Mjk1N2IxMzhiZWJkODhlNmY2YzIiLCJ0aW1lc3RhbXAiOjE3Mjg2NTQyMDEwNjEsImlhdCI6MTcyODY1NDIwMX0.mRF6grWO3WjfLgY_jx2fMu9L_ibevSu8WBMJgykf6TU"
 */
    static login(req: Request, res: Response) {
        if (!isNativeType(NativeTypes.OBJECT, req.body)) {
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
            return Promise.all([user, compare(password, user.password)]);
        }).then(result => {
            const [user, validLogin] = result;
            if (validLogin) {
                const io = socket.getIO();
                io.emit("joinRoom", user.token);
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

/**
 * @swagger
 * /api/users/getData:
 *   get:
 *     tags: ["users"]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Data retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserData'
 *       401:
 *         description: Invalid authentication
 *       500:
 *         description: Server error
 * 
 * components:
 *   schemas:
 *     UserData:
 *       type: object
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           example: "john.doe@gmail.com"
 *         name:
 *           type: string
 *           example: "John Doe"
 */
    static getData(req: Request, res: Response) {
        const user = req._user;
        const data = {
            email: user.email,
            name: user.name
        };
        res.send(data);
    }

/**
 * @swagger
 * /api/users/getInventories:
 *   get:
 *     tags: ["users"]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Inventories retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserInventories'
 *       401:
 *         description: Invalid authentication
 *       500:
 *         description: Server error
 * 
 * components:
 *   schemas:
 *     UserInventories:
 *       type: array
 *       items:
 *         type: object
 *         properties:
 *           inventory:
 *             type: string
 *             example: "6709865e4441a6a26ba4bf10"
 *           name:
 *             type: string
 *             example: "My first inventory"
 *           role:
 *             type: string
 *             enum:
 *               - admin
 *               - stock
 *               - query
 *             example: "query"
 */
    static getInventories(req: Request, res: Response) {
        const user = req._user;
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

/**
 * @swagger
 * /api/users/generateNewToken:
 *   put:
 *     tags: ["users"]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Token updated successfully
 *       401:
 *         description: Invalid authentication
 *       500:
 *         description: Server error
 */
    static generateNewToken(req: Request, res: Response) {
        const user = req._user;
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

/**
 * @swagger
 * /api/users/updateData:
 *   put:
 *     tags: ["users"]
 *     parameters:
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateUserData'
 *     responses:
 *       200:
 *         description: User data updated successfully
 *       400:
 *         description: Invalid user data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Invalid authentication
 *       500:
 *         description: Server error
 * 
 * components:
 *   schemas:
 *     UpdateUserData:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *           example: "John Doe"
 */
    static updateData(req: Request, res: Response) {
        if (!isNativeType(NativeTypes.OBJECT, req.body)) {
            res.status(HTTP_STATUS_CODES.BAD_REQUEST).send({ error: 'Body is not an object' });
            return;
        }
        const name = req.body.name;
        if (!UsersValidations._name(name)) {
            res.status(HTTP_STATUS_CODES.BAD_REQUEST).send({ error: 'Invalid user data' });
            return;
        }
        const user = req._user;
        User.updateOne({
            _id: user._id
        }, {
            name
        }).then(() => {
            res.sendStatus(HTTP_STATUS_CODES.SUCCESS);
        }).catch(() => {
            res.sendStatus(HTTP_STATUS_CODES.SERVER_ERROR);
        });
    }

/**
 * @swagger
 * /api/users/updatePassword:
 *   put:
 *     tags: ["users"]
 *     description: "Updating the password also generates a new token."
 *     parameters:
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdatePasswordUser'
 *     responses:
 *       200:
 *         description: Password updated successfully
 *       400:
 *         description: Invalid user data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Invalid authentication
 *       500:
 *         description: Server error
 * 
 * components:
 *   schemas:
 *     UpdatePasswordUser:
 *       type: object
 *       properties:
 *         password:
 *           type: string
 *           format: password
 *           example: "password"
 */
    static updatePassword(req: Request, res: Response) {
        if (!isNativeType(NativeTypes.OBJECT, req.body)) {
            res.status(HTTP_STATUS_CODES.BAD_REQUEST).send({ error: 'Body is not an object' });
            return;
        }
        const password = req.body.password;
        if (!UsersValidations.password(password)) {
            res.status(HTTP_STATUS_CODES.BAD_REQUEST).send({ error: 'Invalid user data' });
            return;
        }
        const user = req._user;
        const token = UsersController.createToken(user._id);
        hash(password, UsersController.ENCRYPTION_ROUNDS)
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
        });
    }

/**
 * @swagger
 * /api/users/deleteUser:
 *   delete:
 *     tags: ["users"]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User deleted successfully
 *       401:
 *         description: Invalid authentication
 *       500:
 *         description: Server error
 */
    static deleteUser(req: Request, res: Response) {
        const user = req._user;
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
    
    private static createToken(_id: Schema.Types.ObjectId): string {
        const payload: LoginJwtPayload = { _id, timestamp: Date.now() };
        const token = sign(payload, JWT_KEY);
        return token;
    }
}