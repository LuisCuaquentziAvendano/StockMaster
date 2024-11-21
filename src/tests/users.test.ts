import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { connect, disconnect } from 'mongoose';
import { app } from '../app';
import { Inventory, Product, User } from '../models';
import { GeneralUseStatus, UserStatus } from '../utils/status';

let mongoServer: MongoMemoryServer;
let authorization: string;
let name = 'John Doe';
let email = 'john.doe@gmail.com';
let password = 'password';
let inventoryId1: string;
let inventoryId2: string;
let inventoryName1: string;
let inventoryName2: string;
let productId: string;

beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const url = mongoServer.getUri();
    await connect(url);
});

afterAll(async () => {
    await disconnect();
    await mongoServer.stop();
});

describe('Testing the endpoint to register', () => {
    it('Missing parameter should return error', async () => {
        let response = await request(app)
            .post('/api/users/register')
            .send({ email, password })
            .set('Content-Type', 'application/json');
        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error');
        
        response = await request(app)
            .post('/api/users/register')
            .send({ name, password })
            .set('Content-Type', 'application/json');
        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error');
        
        response = await request(app)
            .post('/api/users/register')
            .send({ name, email })
            .set('Content-Type', 'application/json');
        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error');
    });

    it('Invalid parameter should return error', async () => {
        let response = await request(app)
            .post('/api/users/register')
            .send({ name: 'John Doe 2', email, password })
            .set('Content-Type', 'application/json');
        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error');

        response = await request(app)
            .post('/api/users/register')
            .send({ name, email: 'john.doe', password })
            .set('Content-Type', 'application/json');
        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error');

        response = await request(app)
            .post('/api/users/register')
            .send({ name, email, password: 'pass' })
            .set('Content-Type', 'application/json');
        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error');
    });

    it('Valid data should allow registration', async () => {
        const response = await request(app)
            .post('/api/users/register')
            .send({ name, email, password })
            .set('Content-Type', 'application/json');
        expect(response.status).toBe(201);
    });

    it('Same email should return error', async () => {
        const response = await request(app)
            .post('/api/users/register')
            .send({ name, email, password })
            .set('Content-Type', 'application/json');
        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error');
    });
});

describe('Testing the endpoint to login', () => {
    it('Invalid email should return unauthorized', async () => {
        const response = await request(app)
            .post('/api/users/login')
            .send({ email: 'john.doe2@gmail.com', password })
            .set('Content-Type', 'application/json');
        expect(response.status).toBe(401);
    });

    it('Invalid password should return unauthorized', async () => {
        const response = await request(app)
            .post('/api/users/login')
            .send({ email, password: 'password123' })
            .set('Content-Type', 'application/json');
        expect(response.status).toBe(401);
    });

    it('Valid data should allow login', validLogin);
});

describe('Testing the endpoint to get data', () => {
    it('The user data should be returned', getDataSuccessful);
});

describe('Testing the endpoint to get inventories', () => {
    it('The inventories returned should be the same as created', async () => {
        inventoryName1 = 'My first inventory';
        let response = await request(app)
            .post('/api/inventories/createInventory')
            .send({ name: inventoryName1 })
            .set('authorization', authorization)
            .set('Content-Type', 'application/json');
        inventoryId1 = response.body.inventory;
        
        inventoryName2 = 'My second inventory';
        response = await request(app)
            .post('/api/inventories/createInventory')
            .send({ name: inventoryName2 })
            .set('authorization', authorization)
            .set('Content-Type', 'application/json');
        inventoryId2 = response.body.inventory;

        response = await request(app)
            .get('/api/users/getInventories')
            .set('authorization', authorization);
        expect(response.status).toBe(200);
        const inventories = response.body;
        expect(Array.isArray(inventories)).toBe(true);
        expect(inventories.length).toBe(2);
        if (inventoryId1 != inventories[0].inventory) {
            [inventoryId1, inventoryId2] = [inventoryId2, inventoryId1];
            [inventoryName1, inventoryName2] = [inventoryName2, inventoryName1];
        }
        expect(inventories[0]).toHaveProperty('inventory', inventoryId1);
        expect(inventories[0]).toHaveProperty('name', inventoryName1);
        expect(inventories[0]).toHaveProperty('role', 'admin');
        expect(inventories[1]).toHaveProperty('inventory', inventoryId2);
        expect(inventories[1]).toHaveProperty('name', inventoryName2);
        expect(inventories[1]).toHaveProperty('role', 'admin');

        response = await request(app)
            .post('/api/products/createProduct')
            .set('authorization', authorization)
            .set('inventory', inventoryId1);
        productId = response.body.product;
    });
});

describe('Testing the endpoint to generate a new token', () => {
    it('Generating a new token', async () => {
        const response = await request(app)
            .put('/api/users/generateNewToken')
            .set('authorization', authorization);
        expect(response.status).toBe(200);
    });

    it('Request with same token should return unauthorized', getDataFailed);

    it('Login again to get new token', validLogin);

    it('Request with new token should work', getDataSuccessful);
});

describe('Testing the endpoint to update the data', () => {
    name = 'John';
    it('Updating the data', async () => {
        const response = await request(app)
            .put('/api/users/updateData')
            .send({ name })
            .set('authorization', authorization)
            .set('Content-Type', 'application/json');
        expect(response.status).toBe(200);
    });

    it('Data should be updated', getDataSuccessful);
});

describe('Testing the endpoint to update the password', () => {
    password = 'password2';
    it('Updating the password', async () => {
        const response = await request(app)
            .put('/api/users/updatePassword')
            .send({ password })
            .set('authorization', authorization)
            .set('Content-Type', 'application/json');
        expect(response.status).toBe(200);
    });

    it('Request with same token should return unauthorized', getDataFailed);

    it('Login again with new password to get new token', validLogin);

    it('Request with new token should work', getDataSuccessful);
});

describe('Testing the endpoint to delete a user', () => {
    it('Deleting the user', async () => {
        const response = await request(app)
            .delete('/api/users/deleteUser')
            .set('authorization', authorization);
        expect(response.status).toBe(200);
    });

    it('Request to get data should be return unauthorized', getDataFailed);

    it('Request to an entity that depends on the user shouldn\'t be accessed', async () => {
        const userCount = await User.countDocuments({
            email,
            status: UserStatus.ACTIVE
        });
        expect(userCount).toBe(0);

        const inventoryCount = await Inventory.countDocuments({
            _id: inventoryId1,
            status: GeneralUseStatus.ACTIVE
        });
        expect(inventoryCount).toBe(0);

        const productCount = await Product.countDocuments({
            _id: productId,
            status: GeneralUseStatus.ACTIVE
        });
        expect(productCount).toBe(0);
    });
});

async function validLogin() {
    const response = await request(app)
        .post('/api/users/login')
        .send({ email, password })
        .set('Content-Type', 'application/json');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('authorization');
    authorization = `Bearer ${response.body.authorization}`;
}

async function getDataSuccessful() {
    const response = await request(app)
        .get('/api/users/getData')
        .set('authorization', authorization);
    expect(response.status).toBe(200);
    expect(Object.keys(response.body).length).toBe(2);
    expect(response.body).toHaveProperty('name', name);
    expect(response.body).toHaveProperty('email', email);
}

async function getDataFailed() {
    const response = await request(app)
        .get('/api/users/getData')
        .set('authorization', authorization);
    expect(response.status).toBe(401);
}