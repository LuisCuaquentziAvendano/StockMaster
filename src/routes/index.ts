import { Router, json, Request, Response } from 'express';
import users from './users.routes';
import inventories from './inventories.routes';
import products from './products.routes';
import sales from './sales.routes';
import middlewares from '../middlewares';

const router = Router();
router.use(json());

/**
 * @swagger
 * /api:
 *   get:
 *     tags: ["default"]
 *     responses:
 *       200:
 *         description: API connection successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/APIworking'
 * 
 * components:
 *   schemas:
 *     APIworking:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *           example: "Stock Master API"
 * 
 *     Error:
 *       type: object
 *       properties:
 *         error:
 *           type: string
 *           example: "Invalid data"
 * 
 *     NotFound:
 *       type: object
 *       properties:
 *         error:
 *           type: string
 *           example: "Inventory not found"
 */
router.get('/', (req: Request, res: Response) => {
    res.send({ message: 'Stock Master API' });
});

router.use('/users', users);

router.use('/inventories',
    middlewares.validateToken,
    inventories);

router.use('/products',
    middlewares.validateToken,
    middlewares.getInventory,
    products);

router.use('/sales',
    middlewares.validateToken,
    middlewares.getInventory,
    sales);

export default router;