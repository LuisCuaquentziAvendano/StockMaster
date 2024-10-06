import { Request, Response } from 'express';
import Product from '../models/product';
import { IProduct, ProductFields } from '../types/product';
import { HTTP_STATUS_CODES } from '../types/httpStatusCodes';
import { Parser } from './_parser.controller';
import { GeneralUseStatus } from '../types/status';
import { InventoriesValidations } from './_inventoriesValidations.controller';
import { ProductsValidations } from './_productsValidations.contoller';
import { insensitive } from '../types/insensitive';
import { InventoryDataTypes } from '../types/inventory';

class ProductsController {
    static getProductById(req: Request, res: Response) {
        const id = req.body.id; 
    
        Product.findById(id)
        .then(product => {
            if (!product) {
                res.sendStatus(HTTP_STATUS_CODES.NOT_FOUND); 
                return;
            }
    
            res.status(HTTP_STATUS_CODES.SUCCESS).send(product); 
        })
        .catch(error => {
            res.sendStatus(HTTP_STATUS_CODES.SERVER_ERROR); 
        });
    }

    static getProductsByQuery(req: Request, res: Response) {
        const query = req.body.query;

        if (!query) {
            res.status(HTTP_STATUS_CODES.BAD_REQUEST).send('A query is required');
            return;
        }

        const inventory = req.inventory; 
        const insInventory = InventoriesValidations.insensitiveFields(inventory.fields);
        const [validQuery, mongooseQuery] = Parser.evalQuery(query, inventory.fields, insInventory);

        if (!validQuery) {
            res.status(HTTP_STATUS_CODES.BAD_REQUEST).send('Invalid query format');
            return;
        }

        Product.find(mongooseQuery)
        .then(products => {
            if (products.length === 0) {
                res.status(HTTP_STATUS_CODES.NOT_FOUND).send('No products found');
                return;
            }

            res.status(HTTP_STATUS_CODES.SUCCESS).send(products);
        })
        .catch(error => {
            res.status(HTTP_STATUS_CODES.SERVER_ERROR).send('Internal Server Error');
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

        for (const [key, value] of Object.entries(fields)) {
            const currentSensitiveField = InventoriesValidations.existingField(key, insInventory);

            if(!currentSensitiveField) {
                res.sendStatus(HTTP_STATUS_CODES.BAD_REQUEST);
                return;
            }

            const expectedValueType = inventory.fields[currentSensitiveField].type;

            //temp IMAGE type ignore
            if (expectedValueType === InventoryDataTypes.IMAGE) {
                continue;
            }

            const validatedValue = ProductsValidations.validProductValue(expectedValueType, value);

            if(validatedValue === undefined) {
                res.sendStatus(HTTP_STATUS_CODES.BAD_REQUEST);
                return;
            }

            product.fields[insensitive(currentSensitiveField)] = validatedValue;
        }

        Product.create(product)
        .then(product => {
            res.status(HTTP_STATUS_CODES.CREATED).send(product);
        }).catch(error => {
            res.sendStatus(HTTP_STATUS_CODES.SERVER_ERROR);
        });
    }

    static editProduct(req: Request, res: Response) {
        const fields = req.body;
        const productId = req.body._id; 
        const inventory = req.inventory;
        const insInventory = InventoriesValidations.insensitiveFields(inventory.fields);
    
        Product.findById(productId)
        .then(product => {
            if (!product) {
                res.sendStatus(HTTP_STATUS_CODES.BAD_REQUEST);
                return;
            }

            for (const [key, value] of Object.entries(fields)) {
                if (key === "_id") {
                    console.log("me salte esto");
                    continue;
                }
                console.log(key);

                const currentSensitiveField = InventoriesValidations.existingField(key, insInventory);

                if (!currentSensitiveField) {
                    res.sendStatus(HTTP_STATUS_CODES.NOT_FOUND);
                    return;
                }

                const expectedValueType = inventory.fields[currentSensitiveField].type;

                // ignore IMAGE typess
                if (expectedValueType === InventoryDataTypes.IMAGE) {
                    continue;
                }

                const validatedValue = ProductsValidations.validProductValue(expectedValueType, value);

                if (validatedValue === undefined) {
                    res.sendStatus(HTTP_STATUS_CODES.BAD_REQUEST);
                    return;
                }

                product.fields[insensitive(currentSensitiveField)] = validatedValue;
            }
            product.markModified('fields');
            return product.save(); 
        })
        .then(updatedProduct => {
            res.status(HTTP_STATUS_CODES.SUCCESS).send(updatedProduct);
        })
        .catch(error => {
            res.sendStatus(HTTP_STATUS_CODES.SERVER_ERROR);
        });
    }
    

    static deleteProduct(req: Request, res: Response) {
        const productId = req.body._id;
    
        Product.findOneAndUpdate(
            { _id: productId }, 
            { status: GeneralUseStatus.DELETED },
            { new: true }
        )
        .then(product => {
            if (!product) {
                res.sendStatus(HTTP_STATUS_CODES.NOT_FOUND); 
                return;
            }
            res.status(HTTP_STATUS_CODES.SUCCESS).send(product); 
        })
        .catch(error => {
            res.sendStatus(HTTP_STATUS_CODES.SERVER_ERROR); 
        });
    }
}

export default ProductsController;