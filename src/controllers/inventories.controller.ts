import { Request, Response } from 'express';
import Inventory from '../models/inventory';
import User from '../models/user';
import { NativeTypes, isNativeType } from '../types/nativeTypes';
import { Regex, insensitive, isType } from '../types/regex';
import { HTTP_STATUS_CODES } from '../types/httpStatusCodes';
import { IInventory, InventoryDataTypes, InventoryDataTypes2, ParserTokens, ParserTokens2 } from '../types/inventory';
import { AssignedRole, UserRoles, IUser } from '../types/user';
import { GeneralUseStatus, UserStatus } from '../types/status';
import { Operators } from '../types/queryOperators';
import { insensitiveInventory } from './_inventoryFields.controller';
import Product from '../models/product';

class InventoriesController {
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
        if (!isNativeType(NativeTypes.STRING, name)
            || !isType(Regex.INVENTORY_NAME, name)
        ) {
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
        Inventory.updateOne({
            _id: inventory._id
        }, {
            status: GeneralUseStatus.DELETED
        }).then(() => {
            res.sendStatus(HTTP_STATUS_CODES.SUCCESS);
        }).catch(() => {
            res.sendStatus(HTTP_STATUS_CODES.SERVER_ERROR);
        });
    }

    static createField(req: Request, res: Response) {
        const field = req.body.field;
        const type = req.body.type;
        const visible = req.body.visible;
        const inventory = req.inventory;
        const insType = insensitive(type);
        const insField = insensitive(field);
        const insentiveFields = insensitiveInventory(inventory.fields);
        if (!isNativeType(NativeTypes.STRING, field)
            || !isType(Regex.INVENTORY_FIELD, field)
            || !isNativeType(NativeTypes.STRING, type)
            || !isNativeType(NativeTypes.BOOLEAN, visible)
            || !InventoryDataTypes2.includes(insType)
            || insField in insentiveFields
            || InventoryDataTypes2.includes(insField)
            || ParserTokens2.includes(insField)
            || insField in Operators.ALL
        ) {
            res.status(HTTP_STATUS_CODES.BAD_REQUEST).send({ error: 'Invalid inventory field' });
            return;
        }
        inventory.fields[field] = {
            type,
            visible
        };
        Inventory.updateOne({
            _id: inventory._id
        }, {
            fields: inventory.fields
        }).then(() => {
            res.sendStatus(HTTP_STATUS_CODES.SUCCESS);
        }).catch(() => {
            res.sendStatus(HTTP_STATUS_CODES.SERVER_ERROR);
        });
    }

    static deleteField(req: Request, res: Response) {
        const field = req.body.field;
        const inventory = req.inventory;
        if (!isNativeType(NativeTypes.STRING, field)
            || !(field in inventory.fields)
        ) {
            res.status(HTTP_STATUS_CODES.BAD_REQUEST).send({ error: 'Field not found' });
            return;
        }
        delete inventory.fields[field];
        Inventory.updateOne({
            _id: inventory._id
        }, {
            fields: inventory.fields
        }).then(() => {
            const fieldName = 'fields.' + field;
            return Product.updateMany({
                inventory: inventory._id,
                status: GeneralUseStatus.ACTIVE
            }, {
                $unset: { [fieldName]: '' }
            });
        }).then(() => {
            res.sendStatus(HTTP_STATUS_CODES.SUCCESS);
        }).catch(() => {
            res.sendStatus(HTTP_STATUS_CODES.SERVER_ERROR);
        });
    }

    static getPermissions(req: Request, res: Response) {
        const inventory = req.inventory;
        Promise.all(
            inventory.roles.map(assignedRole => {
                return {
                    role: assignedRole.role,
                    user: User.findOne({
                        _id: assignedRole.user
                    }, {
                        _id: 0,
                        email: 1,
                        name: 1
                    })
                };
            })
        ).then((assignedRoles => {
            res.send({ permissions: assignedRoles });
        })).catch(() => {
            res.sendStatus(HTTP_STATUS_CODES.SERVER_ERROR);
        });
    }

    static modifyPermissions(req: Request, res: Response) {
        const email = req.body.email;
        const role = req.body.role;
        const user = req.user;
        if (!isNativeType(NativeTypes.STRING, email)
            || !isNativeType(NativeTypes.STRING, role)
            || !(role in UserRoles)
            || email == user.email
        ) {
            res.status(HTTP_STATUS_CODES.BAD_REQUEST).send({ error: 'Invalid data' });
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
        }).catch((error: Error) => {
            if (error.message != '') {
                res.sendStatus(HTTP_STATUS_CODES.SERVER_ERROR);
            }
        });
    }
}

export default InventoriesController;