const request = require('supertest');
const { v4: uuid } = require('uuid');
const { expect, assert } = require('chai');

describe('Paypal mutations:', function() {
	before(async function() {
		await this.sequelize.model('paypalOrders').destroy({ where: {} });
	});

	describe('createPaypalOrder, when the user is logged in', function() {
		before(async function() {
			this.expectedOrderId = uuid();
			this.expectedPurchaseAmt = 2.51;

			this.mockPaypalClient.setResponse(201, { id: this.expectedOrderId, status: 'CREATED' });

			const server = this.createServer();

			const { statusCode, body } = await request(server)
				.post('/graphql')
				.send({
					query: `mutation createPaypalOrder($purchaseAmt: Float!) {
					createPaypalOrder(purchaseAmt: $purchaseAmt) {
						orderId
					}
				}`,
					variables: { purchaseAmt: this.expectedPurchaseAmt },
				})
				.set('Authorization', `Bearer ${this.testUserToken}`);

			if (statusCode !== 200) throw new Error(`Error: ${body.errors}`);

			this.createResult = body.data.createPaypalOrder;
		});

		it('returns the correct order id', function() {
			expect(this.createResult.orderId).to.equal(this.expectedOrderId);
		});

		it('adds a record to the database', async function() {
			const order = await this.sequelize.model('paypalOrders').findOne({ where: { orderId: this.expectedOrderId } });
			assert.isOk(order, "Didn't find order in database");
			expect(order.userId).to.equal(this.testUserId);
			expect(order.orderId).to.equal(this.expectedOrderId);
			expect(order.orderStatus).to.equal('CREATED');
			expect(order.currencyCode).to.equal('USD');
			expect(order.amount).to.equal(this.expectedPurchaseAmt);
		});
	});

	describe('createPaypalOrder, when the user is not logged in', function() {
		before(async function() {
			this.expectedOrderId = uuid();
			this.expectedPurchaseAmt = 2.51;

			this.mockPaypalClient.setResponse(201, { id: this.expectedOrderId, status: 'CREATED' });

			const server = this.createServer();

			this.result = await request(server)
				.post('/graphql')
				.send({
					query: `mutation createPaypalOrder($purchaseAmt: Float!) {
					createPaypalOrder(purchaseAmt: $purchaseAmt) {
						orderId
					}
				}`,
					variables: { purchaseAmt: this.expectedPurchaseAmt },
				});
		});

		it('returns a 401 error', function() {
			expect(this.result.statusCode).to.equal(401);
		});
	});
});
