import { Request, Response } from 'express';
import { Product } from '../models';
import { IProduct, ProductFields, FieldsMap, InsensitiveString } from '../types';
import { HTTP_STATUS_CODES } from '../utils/httpStatusCodes';
import { Parser } from './_parser';
import { GeneralUseStatus } from '../utils/status';
import { InventoriesValidations } from './_inventoriesUtils';
import { ProductsValidations } from './_productsUtils';
import { InventoryDataTypes } from '../utils/inventoryDataTypes';
import { isNativeType, NativeTypes } from '../utils/nativeTypes';
import { RolesShowAllFields } from '../utils/roles';

export class ProductsController {
    private static readonly PRODUCTS_PER_PAGE = 20;

    static createProduct(req: Request, res: Response) {
        const fields = req.body;
        const inventory = req.inventory;
        const insInventory = InventoriesValidations.insensitiveFields(inventory.fields);
        const product: IProduct = {
            inventory: inventory._id,
            fields: {} as ProductFields,
            status: GeneralUseStatus.ACTIVE
        };
        Object.keys(insInventory).forEach((field: InsensitiveString) => {
            product.fields[field] = null;
        });
        const valid = ProductsValidations.setProductFields(product.fields, fields, inventory.fields, insInventory);
        if (!valid) {
            res.status(HTTP_STATUS_CODES.BAD_REQUEST).send({ error: 'Invalid product field' });
            return;
        }
        Product.create(product)
        .then((product: IProduct) => {
            res.status(HTTP_STATUS_CODES.CREATED).send({ product: product._id });
        }).catch(() => {
            res.sendStatus(HTTP_STATUS_CODES.SERVER_ERROR);
        });
    }

    static getProductById(req: Request, res: Response) {
        const user = req.user;
        const inventory = req.inventory;
        const product = req.product;
        const data: Record<any, any> = {
            product: product._id,
            inventory: inventory._id
        };
        const fieldsMap = InventoriesValidations.insensitiveFields(inventory.fields);
        const showAllFields = RolesShowAllFields.includes(user.role);
        if (showAllFields) {
            data.fields = product.fields;
        } else {
            data.fields = ProductsValidations.formatFields(inventory.fields, product.fields, fieldsMap, showAllFields);
        }
        res.send(data);
    }

    static getProductsByQuery(req: Request, res: Response) {
        const query = (req.query.query || '') as string;
        let page = req.query.page as string;
        let currentPage = 0;
        let totalProducts: number;
        let lastPage: number;
        if (
            isNativeType(NativeTypes.STRING, page)
            && Number.isInteger(page)
            && Number.parseInt(page) >= 0
        ) {
            currentPage = Number.parseInt(page);
        }
        const user = req.user;
        const inventory = req.inventory;
        const showAllFields = RolesShowAllFields.includes(user.role);
        const fieldsMap = InventoriesValidations.insensitiveFields(inventory.fields);
        const auxFieldsMap = {} as FieldsMap;
        Object.keys(fieldsMap).forEach((field: InsensitiveString) => {
            const senField = fieldsMap[field];
            if (inventory.fields[senField].type != InventoryDataTypes.IMAGE) {
                auxFieldsMap[field] = senField;
            }
        });
        const [validQuery, mongooseQuery] = Parser.evalQuery(query, inventory.fields, auxFieldsMap);
        if (!validQuery) {
            res.status(HTTP_STATUS_CODES.BAD_REQUEST).send({ error: 'Invalid query' });
            return;
        }
        const filters = {
            $and: [
                { inventory: inventory._id },
                { status: GeneralUseStatus.ACTIVE },
                { $expr: mongooseQuery }
            ]
        };
        Product.countDocuments(filters)
        .then(docs => {
            const maxPage = Math.max(Math.ceil(docs / ProductsController.PRODUCTS_PER_PAGE) - 1, 0);
            currentPage = Math.min(currentPage, maxPage);
            totalProducts = docs;
            lastPage = maxPage;
            return Product.find(filters)
                .skip(currentPage * ProductsController.PRODUCTS_PER_PAGE)
                .limit(ProductsController.PRODUCTS_PER_PAGE);
        }).then(products => {
            const data: Record<any, any> = {
                inventory: inventory._id,
                totalProducts,
                currentPage,
                lastPage
            };
            const newProducts = products.map(product => {
                const newProduct: Record<any, any> = {
                    product: product.id,
                    fields: ProductsValidations.formatFields(inventory.fields, product.fields, fieldsMap, showAllFields)
                };
                return newProduct;
            });
            data.products = newProducts;
            res.send(data);
        }).catch(() => {
            res.sendStatus(HTTP_STATUS_CODES.SERVER_ERROR);
        });
    }

    static updateProduct(req: Request, res: Response) {
        const fields = req.body;
        const inventory = req.inventory;
        const product = req.product;
        const insInventory = InventoriesValidations.insensitiveFields(inventory.fields);
        const valid = ProductsValidations.setProductFields(product.fields, fields, inventory.fields, insInventory);
        if (!valid) {
            res.status(HTTP_STATUS_CODES.BAD_REQUEST).send({ error: 'Invalid product field' });
            return;
        }
        Product.updateOne({
            _id: product._id
        }, {
            fields: product.fields
        }).then(() => {
            res.sendStatus(HTTP_STATUS_CODES.SUCCESS);
        })
        .catch(() => {
            res.sendStatus(HTTP_STATUS_CODES.SERVER_ERROR);
        });
    }
    
    static deleteProduct(req: Request, res: Response) {
        const product = req.product;
        Product.updateOne({
            _id: product._id
        }, {
            status: GeneralUseStatus.DELETED
        }).then(() => {
            res.sendStatus(HTTP_STATUS_CODES.SUCCESS); 
        })
        .catch(() => {
            res.sendStatus(HTTP_STATUS_CODES.SERVER_ERROR); 
        });
    }
}