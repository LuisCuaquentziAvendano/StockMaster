import { Request, Response } from 'express';
import Product from '../models/product';
import { IProduct, ProductFields } from '../types/product';
import { HTTP_STATUS_CODES } from '../types/httpStatusCodes';
import { Parser } from './_parser.controller';
import { GeneralUseStatus } from '../types/status';
import { InventoriesValidations } from './_inventoriesValidations.controller';
import { ProductsValidations } from './_productsValidations.controller';
import { FieldsMap, insensitive, InsensitiveString } from '../types/insensitive';
import { InventoryDataTypes, InventoryFields } from '../types/inventory';
import { isNativeType, isObject, NativeTypes } from '../types/nativeTypes';
import { RolesShowAllFields } from '../types/user';

class ProductsController {
    private static readonly PRODUCTS_PER_PAGE = 20;

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
        const valid = ProductsController.setProductFields(product.fields, fields, inventory.fields, insInventory);
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

    static updateProduct(req: Request, res: Response) {
        const fields = req.body;
        const inventory = req.inventory;
        const product = req.product;
        const insInventory = InventoriesValidations.insensitiveFields(inventory.fields);
        const valid = ProductsController.setProductFields(product.fields, fields, inventory.fields, insInventory);
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

    private static setProductFields(productFields: ProductFields, fields: Record<any, any>, inventoryFields: InventoryFields, insInventory: FieldsMap): boolean {
        if (!isObject(fields)) {
            return false;
        }
        for (const [key, value] of Object.entries(fields)) {
            const currentSensitiveField = InventoriesValidations.existingField(key, insInventory);
            if(!currentSensitiveField) {
                return false;
            }
            const expectedValueType = inventoryFields[currentSensitiveField].type;
            const validatedValue = ProductsValidations.validProductValue(expectedValueType, value);
            if(isNativeType(NativeTypes.UNDEFINED, validatedValue)) {
                return false;
            }
            productFields[insensitive(currentSensitiveField)] = validatedValue;
        }
        // check images uploaded
        return true;
    }
}

export default ProductsController;