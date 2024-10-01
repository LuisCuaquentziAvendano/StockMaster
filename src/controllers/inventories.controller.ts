import { Request, Response } from 'express';
import Inventory from '../models/inventory';
import User from '../models/user';
import { NativeTypes, isNativeType } from '../types/nativeTypes';
import { Regex, isType } from '../types/regex';
import { HTTP_STATUS_CODES } from '../types/httpStatusCodes';
import { IInventory, InventoryDataTypes, ParserTokens } from '../types/inventory';
import { AssignedRole, UserRoles, IUser } from '../types/user';
import { GeneralUseStatus, UserStatus } from '../types/status';
import { Operators } from '../types/queryOperators';

class InventoriesController {
    static getSchema(req: Request, res: Response) {
        const schema = req.inventory.fields;
        res.send(schema);
    }

    static createtSchema(req: Request, res: Response) {
        if (!isNativeType(NativeTypes.STRING, req.body.name)
            || !isType(Regex.INVENTORY_NAME, req.body.name)) {
            res.status(HTTP_STATUS_CODES.BAD_REQUEST).send({ error: 'Invalid inventory data' });
            return;
        }
        const name = req.body.name as string;
        const user = req.user;
        const assignedRole: AssignedRole = {
            user: user._id,
            role: UserRoles.ADMIN
        };
        const inventory: IInventory = {
            name,
            fields: {},
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

    static deleteSchema(req: Request, res: Response) {
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
        const key = req.body.key;
        const value = req.body.value;
        const inventory = req.inventory;
        if (!isNativeType(NativeTypes.STRING, key)
            || !isType(Regex.INVENTORY_FIELD, key)
            || key in inventory.fields
            || key in InventoryDataTypes
            || key in ParserTokens
            || key in Operators.ALL
            || !(value in InventoryDataTypes)) {
            res.status(HTTP_STATUS_CODES.BAD_REQUEST).send({ error: 'Invalid inventory field' });
            return;
        }
        inventory.fields[key] = value;
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

    static editFieldName(req: Request, res: Response) {
        const key = req.body.key;
        const newName = req.body.newName;
        const inventory = req.inventory;
        if (!(key in inventory.fields)) {
            res.status(HTTP_STATUS_CODES.BAD_REQUEST).send({ error: 'Field not found' });
            return;
        }
        if (!isNativeType(NativeTypes.STRING, newName)
            || !isType(Regex.INVENTORY_FIELD, newName)
            || newName in inventory.fields
            || newName in InventoryDataTypes
            || newName in ParserTokens
            || newName in Operators.ALL) {
            res.status(HTTP_STATUS_CODES.BAD_REQUEST).send({ error: 'Invalid inventory field' });
            return;
        }
        // update products fields
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
        const key = req.body.key;
        const inventory = req.inventory;
        if (!(key in inventory.fields)) {
            res.status(HTTP_STATUS_CODES.BAD_REQUEST).send({ error: 'Field not found' });
            return;
        }
        delete inventory.fields[key];
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

    static modifyPermissions(req: Request, res: Response) {
        const emailToAdd = req.body.email;
        const inventory = req.inventory;
        User.findOne({
            email: emailToAdd,
            status: UserStatus.ACTIVE
        }).then((user: IUser) => {
            if (!user) {
                res.sendStatus(HTTP_STATUS_CODES.BAD_REQUEST).send({ error: 'Email not registered' });
                throw new Error('');
            }
            // send invitation by email
        }).catch((error: Error) => {
            if (error.message != '')
                res.sendStatus(HTTP_STATUS_CODES.SERVER_ERROR);
        });
    }

    static confirmInvitation(req: Request, res: Response) {
        // 
    }
}

export default InventoriesController;