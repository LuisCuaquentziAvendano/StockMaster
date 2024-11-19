import { Request, Response } from 'express';
import Stripe from 'stripe';
import BigNumber from 'bignumber.js';
import { Product, Sale } from '../models';
import { HTTP_STATUS_CODES } from '../utils/httpStatusCodes';
import { SaleStatus } from '../utils/status';
import { isNativeType, NativeTypes } from '../utils/nativeTypes';
import { STRIPE_KEY } from '../utils/envVariables';
import { socket } from './socket.controller';

const stripe = new Stripe(STRIPE_KEY); 

export class SalesController {
/**
 * @swagger
 * /api/sales/makePurchase:
 *   post:
 *     tags: ["sales"]
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
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateSale'
 *     responses:
 *       201:
 *         description: Sale created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CreateSaleSuccess'
 *       400:
 *         description: Invalid data or products
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 * 
 * components:
 *   schemas:
 *     CreateSale:
 *       type: object
 *       properties:
 *         customer:
 *           type: string
 *           example: "John Doe"
 *         paymentMethodId:
 *           type: string
 *           example: "pm_1JN2Yp2eZvKYlo2C8L9qzdHk"
 *         products:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               product_id:
 *                 type: string
 *                 example: "6709865e4441a6a26ba4bf10"
 *               price:
 *                 type: string
 *                 example: "19.99"
 *               amount:
 *                 type: string
 *                 example: "3"
 *     CreateSaleSuccess:
 *       type: object
 *       properties:
 *         saleId:
 *           type: string
 *           example: "6709865e4441a6a26ba4bf10"
 *         totalAmount:
 *           type: string
 *           example: "59.97"
 */
    static makePurchase(req: Request, res: Response) {
        if (!isNativeType(NativeTypes.OBJECT, req.body)) {
            res.status(HTTP_STATUS_CODES.BAD_REQUEST).send({ error: 'Body is not an object' });
            return;
        }
        
        const { customer, paymentMethodId, products } = req.body;
        const inventoryId = req._inventory._id;
        const productIds = products.map((p: any) => p.product_id);
        const io = socket.getIO();

        Product.find({ _id: { $in: productIds }, inventory: inventoryId })
        .then(dbProducts => {
            if (dbProducts.length !== products.length) {
                res.status(HTTP_STATUS_CODES.BAD_REQUEST).send('Invalid products.');
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
            if (products.length > 10) {
                const userToken = req._user.token; 
                io.to(userToken).emit("largeSaleNotification", {
                    message: "A large purchase of more than 10 items has been made!",
                    sale: savedSale
                });
            }
            res.status(HTTP_STATUS_CODES.CREATED).send(savedSale);
        })
        .catch(() => {
            res.status(HTTP_STATUS_CODES.SERVER_ERROR).send('Purchase failed');
        });
    }

/**
 * @swagger
 * /api/sales/refundPurchase:
 *   post:
 *     tags: ["sales"]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RefundPurchase'
 *     responses:
 *       200:
 *         description: Sale refunded successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RefundPurchaseSuccess'
 *       400:
 *         description: Sale not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 * 
 * components:
 *   schemas:
 *     RefundPurchase:
 *       type: object
 *       properties:
 *         saleId:
 *           type: string
 *           example: "6709865e4441a6a26ba4bf10"
 *     RefundPurchaseSuccess:
 *       type: object
 *       properties:
 *         saleId:
 *           type: string
 *           example: "6709865e4441a6a26ba4bf10"
 *         status:
 *           type: string
 *           example: "refunded"
 */
    static refundPurchase(req: Request, res: Response) {
        const { saleId } = req.body;
        const io = socket.getIO();
        
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
                const userToken = req._user.token; 
                console.log(userToken);
                io.to(userToken).emit("refundNotification", {
                    message: "A purchase refund has been made!",
                    refund: updatedSale
                });
                res.status(HTTP_STATUS_CODES.SUCCESS).send(updatedSale);
            }
        })
        .catch(() => {
            res.status(HTTP_STATUS_CODES.SERVER_ERROR).send('Internal Server Error');
        });
    }

/**
 * @swagger
 * /api/sales/getPurchaseOrder:
 *   get:
 *     tags: ["sales"]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/GetPurchaseOrder'
 *     responses:
 *       200:
 *         description: Purchase order retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GetPurchaseOrderSuccess'
 *       400:
 *         description: Sale not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 * 
 * components:
 *   schemas:
 *     GetPurchaseOrder:
 *       type: object
 *       properties:
 *         saleId:
 *           type: string
 *           example: "6709865e4441a6a26ba4bf10"
 *     GetPurchaseOrderSuccess:
 *       type: object
 *       properties:
 *         saleId:
 *           type: string
 *           example: "6709865e4441a6a26ba4bf10"
 *         totalAmount:
 *           type: string
 *           example: "59.97"
 *         products:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               product_id:
 *                 type: string
 *                 example: "6709865e4441a6a26ba4bf10"
 *               amount:
 *                 type: string
 *                 example: "3"
 */
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

/**
 * @swagger
 * /api/sales/getSalesByInventory:
 *   get:
 *     tags: ["sales"]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: inventory
 *         in: header
 *         required: true
 *         schema:
 *           type: string
 *           example: "6709865e4441a6a26ba4bf10"
 *     responses:
 *       200:
 *         description: Sales retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GetSalesByInventorySuccess'
 *       404:
 *         description: No sales found for this inventory
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 * 
 * components:
 *   schemas:
 *     GetSalesByInventorySuccess:
 *       type: object
 *       properties:
 *         sales:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               saleId:
 *                 type: string
 *                 example: "6709865e4441a6a26ba4bf10"
 *               totalAmount:
 *                 type: string
 *                 example: "59.97"
 *               status:
 *                 type: string
 *                 example: "confirmed"
 */
    static getSalesByInventory(req: Request, res: Response) {
        const inventoryId = req._inventory._id;

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