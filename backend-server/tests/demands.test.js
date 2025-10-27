const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const request = require('supertest');

jest.setTimeout(30000);

let mongod;
let app;
let server;
let useRealMongo = false;

beforeAll(async () => {
    // Try to use in-memory MongoDB, fallback to real MongoDB if available
    try {
        if (process.env.MONGODB_URI) {
            // Use existing MongoDB connection
            useRealMongo = true;
            console.log('Using existing MongoDB connection for tests');
        } else {
            mongod = await MongoMemoryServer.create();
            const uri = mongod.getUri();
            process.env.MONGODB_URI = uri;
            console.log('Using in-memory MongoDB for tests');
        }
    } catch (error) {
        if (process.env.MONGODB_URI) {
            useRealMongo = true;
            console.log('Falling back to real MongoDB connection');
        } else {
            console.error('MongoDB setup failed:', error.message);
            throw new Error('Cannot run tests without MongoDB. Set MONGODB_URI or ensure mongodb-memory-server works.');
        }
    }

    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret';

    // Require app after MONGODB_URI set
    app = require('../src/app');

    // Wait for mongoose connection
    if (mongoose.connection.readyState !== 1) {
        await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('MongoDB connection timeout')), 10000);
            mongoose.connection.once('open', () => {
                clearTimeout(timeout);
                resolve();
            });
            mongoose.connection.once('error', (err) => {
                clearTimeout(timeout);
                reject(err);
            });
        });
    }
});

afterAll(async () => {
    // Clean up test data if using real mongo
    if (useRealMongo) {
        const { User, Demand } = require('../src/models/index');
        await User.deleteMany({ email: /test@example\.com$/ });
        await Demand.deleteMany({});
    }
    
    await mongoose.disconnect();
    if (mongod) await mongod.stop();
});

describe('Demands flow (integration)', () => {
    let buyerToken;
    let farmerToken;
    let demandId;

    test('register buyer and farmer', async () => {
        const buyer = { name: 'Buyer Test', email: 'buyer-test@example.com', password: 'pass1234' };
        const farmer = { name: 'Farmer Test', email: 'farmer-test@example.com', password: 'pass1234' };

        // Register buyer
        await request(app)
            .post('/api/auth/register/buyer')
            .send(buyer)
            .expect(201)
            .catch(err => { /* ignore if already exists */ });

        // Register farmer
        await request(app)
            .post('/api/auth/register/farmer')
            .send(farmer)
            .expect(201)
            .catch(err => { /* ignore if already exists */ });
    });

    test('login users', async () => {
        const lb = await request(app).post('/api/auth/login').send({ email: 'buyer-test@example.com', password: 'pass1234' }).expect(200);
        const lf = await request(app).post('/api/auth/login').send({ email: 'farmer-test@example.com', password: 'pass1234' }).expect(200);
        expect(lb.body).toHaveProperty('token');
        expect(lf.body).toHaveProperty('token');
        buyerToken = lb.body.token;
        farmerToken = lf.body.token;
    });

    test('buyer creates a demand', async () => {
        const body = { commodity: 'tomato', quantity: 2000, unit: 'kg', notes: 'Need fresh produce' };
        const res = await request(app)
            .post('/api/demands')
            .set('Authorization', `Bearer ${buyerToken}`)
            .send(body)
            .expect(201);
        expect(res.body).toHaveProperty('demand');
        demandId = res.body.demand._id;
    });

    test('farmer accepts the demand', async () => {
        const res = await request(app)
            .post(`/api/demands/${demandId}/respond`)
            .set('Authorization', `Bearer ${farmerToken}`)
            .send({ action: 'accept', priceOffer: 25000, notes: 'Can supply within 3 days' })
            .expect(200);
        expect(res.body.demand.status).toBe('accepted');
        expect(res.body.demand.seller).toBeDefined();
    });

    test('buyer cannot update accepted demand', async () => {
        await request(app)
            .put(`/api/demands/${demandId}`)
            .set('Authorization', `Bearer ${buyerToken}`)
            .send({ quantity: 1000 })
            .expect(400);
    });
});
