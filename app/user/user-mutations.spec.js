const request = require('supertest');
const { v4: uuid } = require('uuid');
const { expect, assert } = require('chai');

describe('User mutations:', function() {
	before(async function() {
		await this.sequelize.model('paypalOrders').destroy({ where: {} });
		this.server = this.createServer();

		this.getUser = async () => {
			const { statusCode, body } = await request(this.server)
				.post('/graphql')
				.send({
					query: `query {
							self {
								credit
							}
						}`,
				})
				.set('Authorization', `Bearer ${this.testUserToken}`);

			if (statusCode !== 200) throw new Error(`Error: ${body.errors}`);
			return body.data.self;
		};
	});

	describe('applyCreditFromPaypal, when the user has already created an order', function() {
		before(async function() {
			this.expectedOrderId = uuid();
			this.expectedPurchaseAmt = 2.51;

			this.mockPaypalClient.setResponse(201, { id: this.expectedOrderId, status: 'CREATED' });

			await this.updateTestUser({ credit: '10.00' });

			let { statusCode, body } = await request(this.server)
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

			this.paypalCaptureResponse = {
				id: this.expectedOrderId,
				status: 'COMPLETED',
				payer: {
					payer_id: uuid(),
					name: { given_name: 'Bob', surname: 'Bobington' },
					email_address: 'bob@bobington.com',
				},
			};

			this.mockPaypalClient.setResponse(201, this.paypalCaptureResponse);

			({ statusCode, body } = await request(this.server)
				.post('/graphql')
				.send({
					query: `mutation applyCreditFromPaypal($orderId: String!) {
						applyCreditFromPaypal(orderId: $orderId) {
							id
							email
							credit
							unlimitedUsage
						}
					}`,
					variables: { orderId: this.expectedOrderId },
				})
				.set('Authorization', `Bearer ${this.testUserToken}`));

			if (statusCode !== 200) throw new Error(`Error: ${body.errors}`);

			this.applyResult = body.data.applyCreditFromPaypal;
		});

		it("applies the correct amount to the user's account", function() {
			expect(this.applyResult.credit).to.equal(10 + this.expectedPurchaseAmt);
		});

		it("updates the order in the db with the user's information", async function() {
			const order = await this.sequelize.model('paypalOrders').findOne({ where: { orderId: this.expectedOrderId } });
			assert.isOk(order, "Didn't find order in database");
			expect(order.userId).to.equal(this.testUserId);
			expect(order.orderId).to.equal(this.expectedOrderId);
			expect(order.orderStatus).to.equal('COMPLETED');
			expect(order.currencyCode).to.equal('USD');
			expect(order.amount).to.equal(this.expectedPurchaseAmt);
			expect(order.applied).to.equal(true);
			expect(order.refunded).to.equal(false);
			expect(order.payerId).to.equal(this.paypalCaptureResponse.payer.payer_id);
			expect(order.payerGivenName).to.equal(this.paypalCaptureResponse.payer.name.given_name);
			expect(order.payerSurname).to.equal(this.paypalCaptureResponse.payer.name.surname);
			expect(order.payerEmail).to.equal(this.paypalCaptureResponse.payer.email_address);
		});

		describe('when the order has already been applied', function() {
			before(async function() {
				this.result = await request(this.server)
					.post('/graphql')
					.send({
						query: `mutation applyCreditFromPaypal($orderId: String!) {
						applyCreditFromPaypal(orderId: $orderId) {
							id
							email
							credit
							unlimitedUsage
						}
					}`,
						variables: { orderId: this.expectedOrderId },
					})
					.set('Authorization', `Bearer ${this.testUserToken}`);
			});

			it('returns a 500 error', function() {
				expect(this.result.statusCode).to.equal(500);
			});

			it("does not affect the user's credit", async function() {
				const user = await this.getUser();
				expect(user.credit).to.equal(10 + this.expectedPurchaseAmt);
			});
		});
	});

	describe('applyCreditFromPaypal, when the order does not exist', function() {
		before(async function() {
			this.expectedOrderId = uuid();
			this.expectedPurchaseAmt = 2.51;

			await this.updateTestUser({ credit: '10.00' });

			this.paypalCaptureResponse = {
				id: this.expectedOrderId,
				status: 'COMPLETED',
				payer: {
					payer_id: uuid(),
					name: { given_name: 'Bob', surname: 'Bobington' },
					email_address: 'bob@bobington.com',
				},
			};

			this.mockPaypalClient.setResponse(201, this.paypalCaptureResponse);

			this.result = await request(this.server)
				.post('/graphql')
				.send({
					query: `mutation applyCreditFromPaypal($orderId: String!) {
						applyCreditFromPaypal(orderId: $orderId) {
							id
							email
							credit
							unlimitedUsage
						}
					}`,
					variables: { orderId: this.expectedOrderId },
				})
				.set('Authorization', `Bearer ${this.testUserToken}`);
		});

		it('returns a 500 error', function() {
			expect(this.result.statusCode).to.equal(500);
		});

		it("does not affect the user's credit", async function() {
			const user = await this.getUser();
			expect(user.credit).to.equal(10);
		});
	});
});
