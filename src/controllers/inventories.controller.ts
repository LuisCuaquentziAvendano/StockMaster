import { Request, Response } from 'express';
import { startSession, mongo, UpdateWriteOpResult } from 'mongoose';
import Inventory from '../models/inventory';
import User from '../models/user';
import { isNativeType, NativeTypes } from '../types/nativeTypes';
import { HTTP_STATUS_CODES } from '../types/httpStatusCodes';
import { IInventory } from '../types/inventory';
import { AssignedRole, UserRoles, IUser, RolesShowAllFields } from '../types/user';
import { GeneralUseStatus, UserStatus } from '../types/status';
import Product from '../models/product';
import { FIELDS, IProduct } from '../types/product';
import { InventoriesValidations } from './_inventoriesValidations.controller';
import { insensitive } from '../types/insensitive';

export class InventoriesController {
/**
 * @swagger
 * /api/inventories/createInventory:
 *   post:
 *     tags: ["inventories"]
 *     parameters:
 *       - name: authorization
 *         in: header
 *         required: true
 *         schema:
 *           type: string
 *           example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI2NzA5Mjk1N2IxMzhiZWJkODhlNmY2YzIiLCJ0aW1lc3RhbXAiOjE3Mjg2NTQyMDEwNjEsImlhdCI6MTcyODY1NDIwMX0.mRF6grWO3WjfLgY_jx2fMu9L_ibevSu8WBMJgykf6TU"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateInventory'
 *     responses:
 *       201:
 *         description: Inventory created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CreateInventorySuccess'
 *       400:
 *         description: Invalid data
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
 *     CreateInventory:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *           example: "My first inventory"
 * 
 *     CreateInventorySuccess:
 *       type: object
 *       properties:
 *         inventory:
 *           type: string
 *           example: "6709865e4441a6a26ba4bf10"
 */
    static createInventory(req: Request, res: Response) {
        if (!isNativeType(NativeTypes.OBJECT, req.body)) {
            res.status(HTTP_STATUS_CODES.BAD_REQUEST).send({ error: 'Body is not an object' });
            return;
        }
        const name = req.body.name;
        if (!InventoriesValidations._name(name)) {
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
            res.status(HTTP_STATUS_CODES.CREATED).send({ inventory: inventory._id });
        }).catch(() => {
            res.sendStatus(HTTP_STATUS_CODES.SERVER_ERROR);
        });
    }

/**
 * @swagger
 * /api/inventories/getInventory:
 *   get:
 *     tags: ["inventories"]
 *     description: "No visible fields will be hidden to users with 'query' role."
 *     parameters:
 *       - name: authorization
 *         in: header
 *         required: true
 *         schema:
 *           type: string
 *           example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI2NzA5Mjk1N2IxMzhiZWJkODhlNmY2YzIiLCJ0aW1lc3RhbXAiOjE3Mjg2NTQyMDEwNjEsImlhdCI6MTcyODY1NDIwMX0.mRF6grWO3WjfLgY_jx2fMu9L_ibevSu8WBMJgykf6TU"
 *       - name: inventory
 *         in: header
 *         required: true
 *         schema:
 *           type: string
 *           example: "6709865e4441a6a26ba4bf10"
 *     responses:
 *       200:
 *         description: Inventory retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/InventorySchema'
 *       401:
 *         description: Invalid authentication
 *       404:
 *         description: Inventory not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/NotFound'
 *       500:
 *         description: Server error
 * 
 * components:
 *   schemas:
 *     InventorySchema:
 *       type: object
 *       properties:
 *         inventory:
 *           type: string
 *           example: "6709865e4441a6a26ba4bf10"
 *         name:
 *           type: string
 *           example: "My first inventory"
 *         fields:
 *           example:
 *             name:
 *               type: "string"
 *               visible: true
 *             price:
 *               type: "float"
 *               visible: true
 *             stock:
 *               type: "integer"
 *               visible: false
 *         role:
 *           type: string
 *           enum:
 *             - admin
 *             - stock
 *             - query
 *           example: "admin"
 */
    static getInventory(req: Request, res: Response) {
        const user = req.user;
        const inventory = req.inventory;
        const showAllFields = RolesShowAllFields.includes(user.role);
        const data: Record<any, any> = {
            inventory: inventory._id,
            name: inventory.name,
            fields: InventoriesValidations.visibleFields(inventory.fields, showAllFields),
            role: user.role
        };
        res.send(data);
    }

/**
 * @swagger
 * /api/inventories/getPermissions:
 *   get:
 *     tags: ["inventories"]
 *     description: "Only 'admin' user can access to this endpoint."
 *     parameters:
 *       - name: authorization
 *         in: header
 *         required: true
 *         schema:
 *           type: string
 *           example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI2NzA5Mjk1N2IxMzhiZWJkODhlNmY2YzIiLCJ0aW1lc3RhbXAiOjE3Mjg2NTQyMDEwNjEsImlhdCI6MTcyODY1NDIwMX0.mRF6grWO3WjfLgY_jx2fMu9L_ibevSu8WBMJgykf6TU"
 *       - name: inventory
 *         in: header
 *         required: true
 *         schema:
 *           type: string
 *           example: "6709865e4441a6a26ba4bf10"
 *     responses:
 *       200:
 *         description: Permissions retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/InventoryPermissions'
 *       401:
 *         description: Invalid authentication
 *       404:
 *         description: Inventory not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/NotFound'
 *       500:
 *         description: Server error
 * 
 * components:
 *   schemas:
 *     InventoryPermissions:
 *       type: array
 *       items:
 *         type: object
 *         properties:
 *           name:
 *             type: string
 *             example: "John Doe"
 *           email:
 *             type: string
 *             format: email
 *             example: "john.doe@gmail.com"
 *           role:
 *             type: string
 *             enum:
 *               - admin
 *               - stock
 *               - query
 *             example: "query"
 */
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
        })).catch(() => {
            res.sendStatus(HTTP_STATUS_CODES.SERVER_ERROR);
        });
    }

/**
 * @swagger
 * /api/inventories/createField:
 *   put:
 *     tags: ["inventories"]
 *     description: "Only 'admin' user can access to this endpoint."
 *     parameters:
 *       - name: authorization
 *         in: header
 *         required: true
 *         schema:
 *           type: string
 *           example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI2NzA5Mjk1N2IxMzhiZWJkODhlNmY2YzIiLCJ0aW1lc3RhbXAiOjE3Mjg2NTQyMDEwNjEsImlhdCI6MTcyODY1NDIwMX0.mRF6grWO3WjfLgY_jx2fMu9L_ibevSu8WBMJgykf6TU"
 *       - name: inventory
 *         in: header
 *         required: true
 *         schema:
 *           type: string
 *           example: "6709865e4441a6a26ba4bf10"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateField'
 *     responses:
 *       200:
 *         description: Field created successfully
 *       400:
 *         description: Invalid data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Invalid authentication
 *       404:
 *         description: Inventory not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/NotFound'
 *       500:
 *         description: Server error
 * 
 * components:
 *   schemas:
 *     CreateField:
 *       type: array
 *       items:
 *         type: object
 *         properties:
 *           field:
 *             type: string
 *             example: "stock"
 *           type:
 *             type: string
 *             enum:
 *               - integer
 *               - float
 *               - string
 *               - boolean
 *               - array
 *               - datetime
 *               - image
 *             example: "integer"
 *           visible:
 *             type: boolean
 *             example: false
 */
    static createField(req: Request, res: Response) {
        const fieldsToSet = req.body;
        if (!isNativeType(NativeTypes.ARRAY, fieldsToSet)) {
            res.status(HTTP_STATUS_CODES.BAD_REQUEST).send({ error: 'Body is not an array' });
            return;
        }
        let validFields = true;
        const inventory = req.inventory;
        const setNulls: Record<string, null> = {};
        const fieldsMap = InventoriesValidations.insensitiveFields(inventory.fields);
        fieldsToSet.forEach((objectData: Record<string, any>) => {
            if (!validFields || !isNativeType(NativeTypes.OBJECT, objectData)) {
                validFields = false;
                return;
            }
            const field = objectData.field;
            const type = InventoriesValidations.dataType(objectData.type);
            const visible = objectData.visible;
            if (
                !type
                || !InventoriesValidations.newField(field, fieldsMap)
                || !InventoriesValidations.visible(visible)
            ) {
                validFields = false;
                return;
            }
            inventory.fields[field] = {
                type,
                visible
            };
            const fieldName = InventoriesController.formatProductField(field);
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
                    $set: setNulls
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

/**
 * @swagger
 * /api/inventories/updateField:
 *   put:
 *     tags: ["inventories"]
 *     description: "Only 'admin' user can access to this endpoint. They can be updated the field name, the visibility or both in one request."
 *     parameters:
 *       - name: authorization
 *         in: header
 *         required: true
 *         schema:
 *           type: string
 *           example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI2NzA5Mjk1N2IxMzhiZWJkODhlNmY2YzIiLCJ0aW1lc3RhbXAiOjE3Mjg2NTQyMDEwNjEsImlhdCI6MTcyODY1NDIwMX0.mRF6grWO3WjfLgY_jx2fMu9L_ibevSu8WBMJgykf6TU"
 *       - name: inventory
 *         in: header
 *         required: true
 *         schema:
 *           type: string
 *           example: "6709865e4441a6a26ba4bf10"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateField'
 *     responses:
 *       200:
 *         description: Field updated successfully
 *       400:
 *         description: Invalid data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Invalid authentication
 *       404:
 *         description: Inventory not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/NotFound'
 *       500:
 *         description: Server error
 * 
 * components:
 *   schemas:
 *     UpdateField:
 *       type: object
 *       properties:
 *         field:
 *           type: string
 *           example: "stock"
 *         newName:
 *           type: string
 *           example: "units"
 *         visible:
 *           type: boolean
 *           example: true
 */
    static updateField(req: Request, res: Response) {
        if (!isNativeType(NativeTypes.OBJECT, req.body)) {
            res.status(HTTP_STATUS_CODES.BAD_REQUEST).send({ error: 'Body is not an object' });
            return;
        }
        const inventory = req.inventory;
        const fieldsMap = InventoriesValidations.insensitiveFields(inventory.fields);
        const field = InventoriesValidations.existingField(req.body.field, fieldsMap);
        const newName = req.body.newName;
        const visible = req.body.visible;
        let setNewName = false;
        if (field && InventoriesValidations.visible(visible)) {
            inventory.fields[field].visible = visible;
        }
        if (field && InventoriesValidations.newField(newName, fieldsMap)) {
            const oldField = inventory.fields[field];
            inventory.fields[newName] = {
                type: oldField.type,
                visible: oldField.visible
            };
            delete inventory.fields[field];
            setNewName = true;
        }
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
                    Product.find({
                        inventory: inventory._id
                    })
                ]);
            }
            return Promise.all([
                Inventory.updateOne({
                    _id: inventory._id
                }, {
                    fields: inventory.fields
                }),
                (Promise.resolve() as unknown as IProduct[])
            ]);
        }).then((result) => {
            if (setNewName) {
                const data = result[1];
                return Promise.all(
                    data.map((product: IProduct) => {
                        const oldFieldName = insensitive(field);
                        const newFieldName = insensitive(newName);
                        product.fields[newFieldName] = product.fields[oldFieldName];
                        delete product.fields[oldFieldName];
                        return Product.updateOne({
                            _id: product._id
                        }, {
                            fields: product.fields
                        });
                    })
                );
            }
            return (Promise.resolve() as unknown as UpdateWriteOpResult[]);
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

/**
 * @swagger
 * /api/inventories/deleteField:
 *   put:
 *     tags: ["inventories"]
 *     description: "Only 'admin' user can access to this endpoint."
 *     parameters:
 *       - name: authorization
 *         in: header
 *         required: true
 *         schema:
 *           type: string
 *           example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI2NzA5Mjk1N2IxMzhiZWJkODhlNmY2YzIiLCJ0aW1lc3RhbXAiOjE3Mjg2NTQyMDEwNjEsImlhdCI6MTcyODY1NDIwMX0.mRF6grWO3WjfLgY_jx2fMu9L_ibevSu8WBMJgykf6TU"
 *       - name: inventory
 *         in: header
 *         required: true
 *         schema:
 *           type: string
 *           example: "6709865e4441a6a26ba4bf10"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/DeleteField'
 *     responses:
 *       200:
 *         description: Field deleted successfully
 *       400:
 *         description: Invalid data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Invalid authentication
 *       404:
 *         description: Inventory not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/NotFound'
 *       500:
 *         description: Server error
 * 
 * components:
 *   schemas:
 *     DeleteField:
 *       type: object
 *       properties:
 *         field:
 *           type: string
 *           example: "stock"
 */
    static deleteField(req: Request, res: Response) {
        if (!isNativeType(NativeTypes.OBJECT, req.body)) {
            res.status(HTTP_STATUS_CODES.BAD_REQUEST).send({ error: 'Body is not an object' });
            return;
        }
        const inventory = req.inventory;
        const fieldsMap = InventoriesValidations.insensitiveFields(inventory.fields);
        const field = InventoriesValidations.existingField(req.body.field, fieldsMap);
        if (!field) {
            res.status(HTTP_STATUS_CODES.BAD_REQUEST).send({ error: 'Field not found' });
            return;
        }
        delete inventory.fields[field];
        const fieldName = InventoriesController.formatProductField(field);
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

/**
 * @swagger
 * /api/inventories/modifyPermission:
 *   put:
 *     tags: ["inventories"]
 *     description: "Only 'admin' user can access to this endpoint."
 *     parameters:
 *       - name: authorization
 *         in: header
 *         required: true
 *         schema:
 *           type: string
 *           example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI2NzA5Mjk1N2IxMzhiZWJkODhlNmY2YzIiLCJ0aW1lc3RhbXAiOjE3Mjg2NTQyMDEwNjEsImlhdCI6MTcyODY1NDIwMX0.mRF6grWO3WjfLgY_jx2fMu9L_ibevSu8WBMJgykf6TU"
 *       - name: inventory
 *         in: header
 *         required: true
 *         schema:
 *           type: string
 *           example: "6709865e4441a6a26ba4bf10"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ModifyPermission'
 *     responses:
 *       200:
 *         description: Permission updated successfully
 *       400:
 *         description: Invalid data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Invalid authentication
 *       404:
 *         description: Inventory not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/NotFound'
 *       500:
 *         description: Server error
 * 
 * components:
 *   schemas:
 *     ModifyPermission:
 *       type: object
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           example: "john.doe@gmail.com"
 *         role:
 *           type: string
 *           enum:
 *             - stock
 *             - query
 *             - none
 *           example: "query"
 */
    static modifyPermission(req: Request, res: Response) {
        if (!isNativeType(NativeTypes.OBJECT, req.body)) {
            res.status(HTTP_STATUS_CODES.BAD_REQUEST).send({ error: 'Body is not an object' });
            return;
        }
        const email = req.body.email;
        const role = req.body.role;
        const user = req.user;
        if (!InventoriesValidations.roleAssignment(email, role, user)) {
            res.status(HTTP_STATUS_CODES.BAD_REQUEST).send({ error: 'Invalid permission data' });
            return;
        }
        const inventory = req.inventory;
        User.findOne({
            email: email,
            status: UserStatus.ACTIVE
        }, {
            password: 0
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

/**
 * @swagger
 * /api/inventories/deleteInventory:
 *   delete:
 *     tags: ["inventories"]
 *     description: "Only 'admin' user can access to this endpoint."
 *     parameters:
 *       - name: authorization
 *         in: header
 *         required: true
 *         schema:
 *           type: string
 *           example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI2NzA5Mjk1N2IxMzhiZWJkODhlNmY2YzIiLCJ0aW1lc3RhbXAiOjE3Mjg2NTQyMDEwNjEsImlhdCI6MTcyODY1NDIwMX0.mRF6grWO3WjfLgY_jx2fMu9L_ibevSu8WBMJgykf6TU"
 *       - name: inventory
 *         in: header
 *         required: true
 *         schema:
 *           type: string
 *           example: "6709865e4441a6a26ba4bf10"
 *     responses:
 *       200:
 *         description: Inventory deleted successfully
 *       401:
 *         description: Invalid authentication
 *       404:
 *         description: Inventory not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/NotFound'
 *       500:
 *         description: Server error
 */
    static deleteInventory(req: Request, res: Response) {
        const inventory = req.inventory;
        let session: mongo.ClientSession;
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

    private static formatProductField(field: string) {
        return `${FIELDS}.${insensitive(field)}`;
    }
}

export default InventoriesValidations;