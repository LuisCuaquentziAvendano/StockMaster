import { Request, Response } from 'express';
import { uploadImage } from '../middlewares';
import { Product } from '../models';
import { IProduct, ProductFields, FieldsMap, InsensitiveString, SensitiveString, insensitive } from '../types';
import { HTTP_STATUS_CODES } from '../utils/httpStatusCodes';
import { Parser } from './_parser';
import { GeneralUseStatus } from '../utils/status';
import { InventoriesValidations } from './_inventoriesUtils';
import { ProductsValidations } from './_productsUtils';
import { InventoryDataTypes } from '../utils/inventoryDataTypes';
import { isNativeType, NativeTypes } from '../utils/nativeTypes';
import { RolesShowAllFields } from '../utils/roles';
import { ImagesController } from './images.controller';

export class ProductsController {
    private static readonly PRODUCTS_PER_PAGE = 20;

/**
 * @swagger
 * /api/products/createProduct:
 *   post:
 *     tags: ["products"]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: inventory
 *         in: header
 *         required: true
 *         schema:
 *           type: string
 *           example: "6709865e4441a6a26ba4bf10"
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             $ref: '#/components/schemas/CreateProduct'
 *     responses:
 *       201:
 *         description: Product created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CreateProductSuccess'
 *       400:
 *         description: Invalid product data
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
 *     CreateProduct:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *           example: "Product A"
 *         price:
 *           type: string
 *           example: "25.50"
 *         isAvailable:
 *           type: boolean
 *           example: true
 * 
 *     CreateProductSuccess:
 *       type: object
 *       properties:
 *         product:
 *           type: string
 *           example: "6709865e4441a6a26ba4bf10"
 */
    static createProduct(req: Request, res: Response) {
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
        const imageFields = Object.keys(inventory.fields).filter((field: SensitiveString) => inventory.fields[field].type == InventoryDataTypes.IMAGE);
        uploadImage.fields(
            imageFields.map(
                field => ({ name: field, maxCount: 1 })
            )
        )(req, res, () => {
            const fields = req.body;
            ProductsValidations.setProductFields(product.fields, fields, inventory.fields, insInventory);
            ProductsController.setImageNames(req, product.fields);
            Product.create(product)
            .then((product: IProduct) => {
                res.status(HTTP_STATUS_CODES.CREATED).send({ product: product._id });
            }).catch(() => {
                res.sendStatus(HTTP_STATUS_CODES.SERVER_ERROR);
            });
        });
    }

/**
 * @swagger
 * /api/products/getProductById:
 *   get:
 *     tags: ["products"]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: inventory
 *         in: header
 *         required: true
 *         schema:
 *           type: string
 *           example: "6709865e4441a6a26ba4bf10"
 *       - name: product
 *         in: header
 *         required: true
 *         schema:
 *           type: string
 *           example: "5f4dcc3b5aa765d61d8327deb882cf99"
 *     responses:
 *       200:
 *         description: Product retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GetProductByIdSuccess'
 *       400:
 *         description: Invalid product ID
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Invalid authentication
 *       404:
 *         description: Product not found
 *       500:
 *         description: Server error
 * 
 * components:
 *   schemas:
 *     GetProductByIdSuccess:
 *       type: object
 *       properties:
 *         product:
 *           type: object
 *           properties:
 *             name:
 *               type: string
 *               example: "Product A"
 *             price:
 *               type: string
 *               example: "25.50"
 *             isAvailable:
 *               type: boolean
 *               example: true
 */
    static getProductById(req: Request, res: Response) {
        const user = req.user;
        const inventory = req.inventory;
        const product = req.product;
        const fieldsMap = InventoriesValidations.insensitiveFields(inventory.fields);
        const showAllFields = RolesShowAllFields.includes(user.role);
        const data: Record<any, any> = {
            inventory: inventory._id,
            product: product._id,
            fields: ProductsValidations.formatFields(inventory.fields, product.fields, fieldsMap, showAllFields)
        };
        res.send(data);
    }

/**
 * @swagger
 * /api/products/getProductsByQuery:
 *   get:
 *     tags: ["products"]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: inventory
 *         in: header
 *         required: true
 *         schema:
 *           type: string
 *       - name: query
 *         in: query
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Products fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GetProductsQuerySuccess'
 *       400:
 *         description: Invalid query
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
 *     GetProductsQuerySuccess:
 *       type: object
 *       properties:
 *         products:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               product:
 *                 type: string
 *                 example: "6709865e4441a6a26ba4bf10"
 *               fields:
 *                 type: object
 *                 example: { "price": "25.50", "name": "Product A", "isAvailable": true }
 *         totalProducts:
 *           type: integer
 *           example: 100
 *         currentPage:
 *           type: integer
 *           example: 1
 *         lastPage:
 *           type: integer
 *           example: 5
 */
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

/**
 * @swagger
 * /api/products/updateProduct:
 *   put:
 *     tags: ["products"]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: inventory
 *         in: header
 *         required: true
 *         schema:
 *           type: string
 *           example: "6709865e4441a6a26ba4bf10"
 *       - name: product
 *         in: header
 *         required: true
 *         schema:
 *           type: string
 *           example: "5f4dcc3b5aa765d61d8327deb882cf99"
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             $ref: '#/components/schemas/UpdateProduct'
 *     responses:
 *       200:
 *         description: Product updated successfully
 *       400:
 *         description: Invalid product field
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Invalid authentication
 *       404:
 *         description: Product not found
 *       500:
 *         description: Server error
 * 
 * components:
 *   schemas:
 *     UpdateProduct:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *           example: "Product A"
 *         price:
 *           type: string
 *           example: "25.50"
 *         isAvailable:
 *           type: boolean
 *           example: true
 */
    static updateProduct(req: Request, res: Response) {
        const inventory = req.inventory;
        const product = req.product;
        const insInventory = InventoriesValidations.insensitiveFields(inventory.fields);
        const imageFields = Object.keys(inventory.fields).filter((field: SensitiveString) => inventory.fields[field].type == InventoryDataTypes.IMAGE);
        uploadImage.fields(
            imageFields.map(
                field => ({ name: field, maxCount: 1 })
            )
        )(req, res, () => {
            const fields = req.body;
            ProductsValidations.setProductFields(product.fields, fields, inventory.fields, insInventory);
            ProductsController.setImageNames(req, product.fields);
            Product.updateOne({
                _id: product._id
            }, {
                fields: product.fields
            }).then(() => {
                res.sendStatus(HTTP_STATUS_CODES.SUCCESS);
            }).catch(() => {
                res.sendStatus(HTTP_STATUS_CODES.SERVER_ERROR);
            });
        });
    }

/**
 * @swagger
 * /api/products/deleteProduct:
 *   delete:
 *     tags: ["products"]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: inventory
 *         in: header
 *         required: true
 *         schema:
 *           type: string
 *           example: "6709865e4441a6a26ba4bf10"
 *       - name: product
 *         in: header
 *         required: true
 *         schema:
 *           type: string
 *           example: "5f4dcc3b5aa765d61d8327deb882cf99"
 *     responses:
 *       200:
 *         description: Product deleted successfully
 *       400:
 *         description: Invalid product ID
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Invalid authentication
 *       404:
 *         description: Product not found
 *       500:
 *         description: Server error
 * 
 * components:
 *   schemas:
 *     DeleteProductSuccess:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *           example: "Product successfully deleted"
 */
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

    static setImageNames(req: Request, productFields: ProductFields) {
        if (!req.files) {
            return;
        }
        Object.keys(req.files).forEach(field => {
            if (req.files.length == 0) {
                return;
            }
            const file = (req.files as Record<string, any[]>)[field][0];
            const insField = insensitive(file.fieldname);
            productFields[insField] = file.key;
        });
    }
}