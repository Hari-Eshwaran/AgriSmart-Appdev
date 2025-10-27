const fetch = require('node-fetch');

class DemandTester {
    constructor() {
        this.baseURL = process.env.BASE_URL || 'http://localhost:3000/api';
        this.tokens = {};
        this.data = {};
    }

    async run() {
        console.log('🔬 Running Demand workflow tests');
        try {
            await this.testHealth();
            await this.registerUsers();
            await this.loginUsers();
            await this.createDemand();
            await this.farmerResponds();
            await this.edgeCases();
            console.log('✅ Demand workflow tests completed');
        } catch (err) {
            console.error('❌ Test failed:', err.message);
        }
    }

    async req(path, opts = {}) {
        const res = await fetch(`${this.baseURL}${path}`, opts);
        const text = await res.text();
        let json = null;
        try { json = JSON.parse(text); } catch(e) {}
        return { res, body: json || text };
    }

    async testHealth() {
        const { res } = await this.req('/health');
        if (!res.ok) throw new Error('Health check failed');
        console.log('✔ health ok');
    }

    async registerUsers() {
        // Clean up not attempted here - rely on test env
        const buyer = { name: 'Test Buyer', email: 'testbuyer@example.com', password: 'pass1234', role: 'buyer' };
        const farmer = { name: 'Test Farmer', email: 'testfarmer@example.com', password: 'pass1234', role: 'farmer' };

        await this.req('/auth/register/buyer', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(buyer) });
        await this.req('/auth/register/farmer', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(farmer) });
        console.log('✔ registered users (idempotent if exists)');
    }

    async loginUsers() {
        const loginBuyer = await this.req('/auth/login', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ email: 'testbuyer@example.com', password: 'pass1234' }) });
        const loginFarmer = await this.req('/auth/login', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ email: 'testfarmer@example.com', password: 'pass1234' }) });

        if (loginBuyer.res.ok && loginBuyer.body && loginBuyer.body.token) {
            this.tokens.buyer = loginBuyer.body.token;
        }
        if (loginFarmer.res.ok && loginFarmer.body && loginFarmer.body.token) {
            this.tokens.farmer = loginFarmer.body.token;
        }
        console.log('✔ logged in users');
    }

    async createDemand() {
        const body = { commodity: 'tomato', quantity: 2000, unit: 'kg', notes: 'Need fresh produce' };
        const { res, body: resp } = await this.req('/demands', { method: 'POST', headers: { 'Content-Type':'application/json', 'Authorization': `Bearer ${this.tokens.buyer}` }, body: JSON.stringify(body) });
        if (res.status !== 201) throw new Error('Create demand failed: ' + res.status);
        this.data.demand = resp.demand || resp;
        console.log('✔ demand created', this.data.demand._id || 'no-id');
    }

    async farmerResponds() {
        const id = this.data.demand._id;
        const { res, body } = await this.req(`/demands/${id}/respond`, { method: 'POST', headers: { 'Content-Type':'application/json', 'Authorization': `Bearer ${this.tokens.farmer}` }, body: JSON.stringify({ action: 'accept', priceOffer: 25000, notes: 'Can supply within 3 days' }) });
        if (!res.ok) throw new Error('Farmer respond failed');
        console.log('✔ farmer accepted demand');
    }

    async edgeCases() {
        // try buyer updating an accepted demand -> should fail
        const id = this.data.demand._id;
        const { res } = await this.req(`/demands/${id}`, { method: 'PUT', headers: { 'Content-Type':'application/json', 'Authorization': `Bearer ${this.tokens.buyer}` }, body: JSON.stringify({ quantity: 1000 }) });
        if (res.ok) throw new Error('Buyer should not be able to update accepted demand');
        console.log('✔ update rejected as expected');
    }
}

const tester = new DemandTester();
tester.run();
