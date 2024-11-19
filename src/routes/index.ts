import { Router, json, Request, Response } from 'express';
import users from './users.routes';
import inventories from './inventories.routes';
import products from './products.routes';
import sales from './sales.routes';
import images from './images.routes';
import salesRecords from './salesRecords.routes'
import { getInventory, getProduct, validateRole, validateToken } from '../middlewares';
import { UserRoles } from '../utils/roles';

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
 * 
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 */
router.get('/', (req: Request, res: Response) => {
    res.send({ message: 'Stock Master API' });
});

router.use('/users', users);

router.use('/inventories',
    validateToken,
    inventories);

router.use('/products',
    validateToken,
    getInventory,
    products);

router.use('/sales',
    validateToken,
    getInventory,
    sales);

router.use('/images',
    validateToken,
    getInventory,
    validateRole([UserRoles.ADMIN, UserRoles.STOCK, UserRoles.QUERY]),
    getProduct,
    images
);

router.use('/salesRecords',
    validateToken,
    getInventory,
    validateRole([UserRoles.ADMIN, UserRoles.STOCK]),
    salesRecords);

export default router;