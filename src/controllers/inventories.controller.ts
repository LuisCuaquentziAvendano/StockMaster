import { Request, Response } from 'express';
import { startSession, mongo, UpdateWriteOpResult } from 'mongoose';
import Inventory from '../models/inventory';
import User from '../models/user';
import { NativeTypes, isNativeType } from '../types/nativeTypes';
import { HTTP_STATUS_CODES } from '../types/httpStatusCodes';
import { IInventory } from '../types/inventory';
import { AssignedRole, UserRoles, IUser, UserRoles2 } from '../types/user';
import { GeneralUseStatus, UserStatus } from '../types/status';
import Product from '../models/product';
import { productFieldNameDB } from '../types/product';
import { InventoriesValidations } from './_inventoriesValidations.controller';

export class InventoriesController {
    static getInventory(req: Request, res: Response) {
        const user = req.user;
        const inventory = req.inventory;
        const data: Record<any, any> = {
            id: inventory._id,
            name: inventory.name
        };
        const assignedRole = inventory.roles.find(role => role.user.toString() == user._id.toString());
        data.role = assignedRole.role;
        if ([UserRoles.ADMIN, UserRoles.QUERY].includes(assignedRole.role)) {
            data.fields = inventory.fields;
        } else {
            const fields: Record<string, string> = {};
            Object.keys(inventory.fields).forEach(field => {
                if (inventory.fields[field].visible) {
                    fields[field] = inventory.fields[field].type;
                }
            });
            data.fields = fields;
        }
        res.send(data);
    }

    static createInventory(req: Request, res: Response) {
        const name = req.body.name;
        if (!InventoriesValidations.isValidName(name)) {
            res.status(HTTP_STATUS_CODES.BAD_REQUEST).send({ error: 'Invalid inventory data' });
            return;
        }
        const user = req.user;
        const assignedRole: AssignedRole = {
            user: user._id,
            role: UserRoles.ADMIN
        };
        const inventory: IInventory = {
            name,
            roles: [assignedRole],
            status: GeneralUseStatus.ACTIVE
        };
        Inventory.create(inventory)
        .then((inventory: IInventory) => {
            res.status(HTTP_STATUS_CODES.CREATED).send({ id: inventory._id });
        }).catch(() => {
            res.sendStatus(HTTP_STATUS_CODES.SERVER_ERROR);
        });
    }

    static deleteInventory(req: Request, res: Response) {
        const inventory = req.inventory;
        let session: any;
        startSession().then(_s => {
            session = _s;
            session.startTransaction();
            return Promise.all([
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

    static createField(req: Request, res: Response) {
        const fieldsToSet = req.body;
        if (!Array.isArray(fieldsToSet)) {
            res.status(HTTP_STATUS_CODES.BAD_REQUEST).send({ error: 'Body is not an array' });
            return;
        }
        let validFields = true;
        const inventory = req.body.inventory;
        const setNulls: Record<string, null> = {};
        fieldsToSet.forEach(objectData => {
            if (!validFields || !isNativeType(NativeTypes.OBJECT, objectData)) {
                validFields = false;
                return;
            }
            const field = objectData.field;
            const type = InventoriesValidations.validType(objectData.type);
            const visible = objectData.visible;
            if (
                !type
                || !InventoriesValidations.isValidNewField(field, inventory.fields)
                || !InventoriesValidations.isValidVisible(visible)
            ) {
                validFields = false;
                return;
            }
            inventory.fields[field] = {
                type,
                visible
            };
            const fieldName = productFieldNameDB(field);
            setNulls[fieldName] = null;
        });
        if (!validFields) {
            res.status(HTTP_STATUS_CODES.BAD_REQUEST).send({ error: 'Invalid inventory fields' });
            return;
        }
        let session: mongo.ClientSession;
        startSession().then(_s => {
            session = _s;
            session.startTransaction();
            return Promise.all([
                Inventory.updateOne({
                    _id: inventory._id
                }, {
                    fields: inventory.fields
                }),
                Product.updateMany({
                    inventory: inventory._id
                }, {
                    $set: [setNulls]
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

    static updateField(req: Request, res: Response) {
        const inventory = req.inventory;
        const field = InventoriesValidations.validExistingField(req.body.field, inventory.fields);
        const newName = req.body.newName;
        const visible = req.body.visible;
        let setNewName = false;
        if (field && InventoriesValidations.isValidVisible(visible)) {
            inventory.fields[field].visible = visible;
        }
        if (field && InventoriesValidations.isValidNewField(newName, inventory.fields)) {
            const oldField = inventory.fields[field];
            inventory.fields[newName] = {
                type: oldField.type,
                visible: oldField.visible
            };
            delete inventory.fields[field];
            setNewName = true;
        }
        const oldNameDB = productFieldNameDB(field);
        const newNameDB = productFieldNameDB(field);
        let session: mongo.ClientSession;
        startSession().then(_s => {
            session = _s;
            session.startTransaction();
            if (setNewName) {
                return Promise.all([
                    Inventory.updateOne({
                        _id: inventory._id
                    }, {
                        fields: inventory.fields
                    }),
                    Product.updateMany({
                        inventory: inventory._id
                    }, {
                        $set: { [newNameDB]: [oldNameDB] },
                        $unset: { [oldNameDB]: '' }
                    })
                ]);
            }
            return Promise.all([
                Inventory.updateOne({
                    _id: inventory._id
                }, {
                    fields: inventory.fields
                }),
                (Promise.resolve() as unknown as UpdateWriteOpResult)
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

    static deleteField(req: Request, res: Response) {
        const inventory = req.inventory;
        const field = InventoriesValidations.validExistingField(req.body.field, inventory.fields);
        if (!field) {
            res.status(HTTP_STATUS_CODES.BAD_REQUEST).send({ error: 'Field not found' });
            return;
        }
        delete inventory.fields[field];
        const fieldName = productFieldNameDB(field);
        let session: mongo.ClientSession;
        startSession().then(_s => {
            session = _s;
            session.startTransaction();
            return Promise.all([
                Inventory.updateOne({
                    _id: inventory._id
                }, {
                    fields: inventory.fields
                }),
                Product.updateMany({
                    inventory: inventory._id
                }, {
                    $unset: { [fieldName]: '' }
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

    static getPermissions(req: Request, res: Response) {
        const inventory = req.inventory;
        Promise.all(
            inventory.roles.map(assignedRole => {
                return User.aggregate([
                    { $match: { _id: assignedRole.user } },
                    { $project: { _id: 0, name: 1, email: 1 } },
                    { $addFields: { role: assignedRole.role } }
                ]);
            })
        ).then((permissions => {
            const data = permissions.map(p => p[0]);
            res.send(data);
        })).catch((err) => {
            console.log(err.message);
            res.sendStatus(HTTP_STATUS_CODES.SERVER_ERROR);
        });
    }

    static modifyPermissions(req: Request, res: Response) {
        const email = req.body.email;
        const role = req.body.role;
        const user = req.user;
        if (!InventoriesValidations.isValidRoleAssignment(email, role, user)) {
            res.status(HTTP_STATUS_CODES.BAD_REQUEST).send({ error: 'Invalid permission data' });
            return;
        }
        const inventory = req.inventory;
        User.findOne({
            email: email,
            status: UserStatus.ACTIVE
        }).then((user: IUser) => {
            if (!user) {
                res.status(HTTP_STATUS_CODES.BAD_REQUEST).send({ error: 'Email not registered' });
                throw new Error('');
            }
            inventory.roles = inventory.roles.filter(role => role.user.toString() != user._id.toString());
            if (role != UserRoles.NONE) {
                inventory.roles.push({
                    user: user._id,
                    role
                });
            }
            return Inventory.updateOne({
                _id: inventory._id
            }, {
                roles: inventory.roles
            });
        }).then(() => {
            res.sendStatus(HTTP_STATUS_CODES.SUCCESS);
        }).catch((error: Error) => {
            if (error.message != '') {
                res.sendStatus(HTTP_STATUS_CODES.SERVER_ERROR);
            }
        });
    }
}

export default InventoriesValidations;