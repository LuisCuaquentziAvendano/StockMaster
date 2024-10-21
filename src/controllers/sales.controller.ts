import { Request, Response } from 'express';
import { HTTP_STATUS_CODES } from '../types/httpStatusCodes';
import Product from '../models/product';
import Sale from '../models/sale';
import { SaleStatus } from '../types/status';
import BigNumber from 'bignumber.js';
import { isNativeType, NativeTypes } from '../types/nativeTypes';
import Stripe from 'stripe';
import { STRIPE_KEY } from '../types/envVariables';

const stripe = new Stripe(STRIPE_KEY); 

class SalesController {
    static makePurchase(req: Request, res: Response) {
        if (!isNativeType(NativeTypes.OBJECT, req.body)) {
            res.status(HTTP_STATUS_CODES.BAD_REQUEST).send({ error: 'Body is not an object' });
            return;
        }
        
        const { customer, paymentMethodId, products } = req.body;
        const inventoryId = req.inventory._id;
        const productIds = products.map((p: any) => p.product_id);

        Product.find({ _id: { $in: productIds }, inventory: inventoryId })
        .then(dbProducts => {
            if (dbProducts.length !== products.length) {
                res.status(HTTP_STATUS_CODES.BAD_REQUEST).send("Invalid products.");
                return;
            }

            const totalAmount = products.reduce((sum: BigNumber, product: any) => {
                const price = new BigNumber(product.price);
                const amount = new BigNumber(product.amount);
                return sum.plus(price.times(amount));
            }, new BigNumber(0));

            return stripe.paymentIntents.create({
                amount: totalAmount.multipliedBy(100).toFixed(0),
                currency: 'usd',
                payment_method: paymentMethodId,
                automatic_payment_methods: {
                    enabled: true,
                    allow_redirects: 'never', // no redirects for now
                },
                confirm: true
            });
        })
        .then(paymentIntent => {
            if (!paymentIntent) {
                res.status(HTTP_STATUS_CODES.SERVER_ERROR).send('Error creating payment intent.');
                return;
            }

            const sale = new Sale({
                customer,
                products,
                totalAmount: paymentIntent.amount.toFixed(2),
                inventory: inventoryId,
                paymentIntentId: paymentIntent.id,
                status: SaleStatus.CONFIRMED
            });

            return sale.save();
        })
        .then(savedSale => {
            res.status(HTTP_STATUS_CODES.CREATED).send(savedSale);
        })
        .catch(() => {
            res.status(HTTP_STATUS_CODES.SERVER_ERROR).send('Purchase failed');
        });
    }

      
    static refundPurchase(req: Request, res: Response) {
        const { saleId } = req.body;
        
        Sale.findById(saleId)
        .then(sale => {
            if (!sale) {
                res.status(HTTP_STATUS_CODES.NOT_FOUND).send('Sale not found');
                return;
            } 

            return stripe.refunds.create({ payment_intent: sale.paymentIntentId })
            .then((refund: { status: string; }) => {
                if (refund.status === 'succeeded') {
                    sale.status = SaleStatus.REFUNDED;
                    return sale.save();
                } else {
                    res.status(HTTP_STATUS_CODES.SERVER_ERROR).send('Refund failed');
                }
            });
        })
        .then(updatedSale => {
            if (updatedSale) {
                res.status(HTTP_STATUS_CODES.SUCCESS).send(updatedSale);
            }
        })
        .catch(() => {
            res.status(HTTP_STATUS_CODES.SERVER_ERROR).send('Internal Server Error');
        });
    }

    static getPurchaseOrder(req: Request, res: Response) {
        const { saleId } = req.body;

        Sale.findById(saleId)
        .then(sale => {
            if (!sale) {
                res.status(HTTP_STATUS_CODES.NOT_FOUND).send('Sale not found');
                return;
            }
            res.status(HTTP_STATUS_CODES.SUCCESS).send(sale);
        })
        .catch(() => {
            res.status(HTTP_STATUS_CODES.SERVER_ERROR).send('Error fetching the sale');
        });
    }

    static getSalesByInventory(req: Request, res: Response) {
        const inventoryId = req.inventory._id;

        Sale.find({ inventory: inventoryId })
        .then(sales => {
            if (!sales || sales.length === 0) {
                res.status(HTTP_STATUS_CODES.NOT_FOUND).send('No sales found for this inventory');
                return;
            }
            res.status(HTTP_STATUS_CODES.SUCCESS).send(sales);
        })
        .catch(() => {
            res.status(HTTP_STATUS_CODES.SERVER_ERROR).send('Internal Server Error');
        });
    }
}

export default SalesController;