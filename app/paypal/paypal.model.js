const { ForbiddenError, BadRequestError } = require('../errors');
const checkoutNodeJssdk = require('@paypal/checkout-server-sdk');

const clientId = process.env.PAYPAL_CLIENT_ID;
const clientSecret = process.env.PAYPAL_SECRET;

function environment() {
	if (process.env.NODE_ENV === 'production') {
		return new checkoutNodeJssdk.core.LiveEnvironment(clientId, clientSecret);
	}
	return new checkoutNodeJssdk.core.SandboxEnvironment(clientId, clientSecret);
}

function client() {
	return new checkoutNodeJssdk.core.PayPalHttpClient(environment());
}

module.exports = function createPaypalModel({ sequelize }) {
	const paypalOrdersTable = sequelize.model('paypalOrders');

	async function findOrder(userId, orderId) {
		if (!userId) throw new ForbiddenError('Missing session user.');
		if (!orderId) throw new BadRequestError(`Order id required.`);
		return paypalOrdersTable.findOne({ where: { userId, orderId } });
	}

	async function markOrderApplied(userId, orderId) {
		if (!userId) throw new ForbiddenError('Missing session user.');
		if (!orderId) throw new BadRequestError(`Order id required.`);

		const dbOrder = await findOrder(userId, orderId);

		if (!dbOrder) {
			throw new BadRequestError(`Cannot find order ${orderId} for user ${userId}`);
		}

		return dbOrder.update({ applied: true });
	}

	async function createOrder(userId, purchaseAmt) {
		if (!userId) throw new ForbiddenError('Missing session user.');

		if (!Number.isFinite(purchaseAmt)) {
			throw new BadRequestError(`Expected a number for purchaseAmt, but got ${purchaseAmt}`);
		}

		const request = new checkoutNodeJssdk.orders.OrdersCreateRequest();
		request.requestBody({
			intent: 'CAPTURE',
			purchase_units: [
				{
					amount: {
						value: purchaseAmt,
						currency_code: 'USD',
					},
				},
			],
			application_context: {
				shipping_preference: 'NO_SHIPPING',
			},
		});

		const { result: order } = await client().execute(request);

		return paypalOrdersTable.create({
			userId,
			orderId: order.id,
			orderStatus: order.status,
			currencyCode: 'USD',
			amount: purchaseAmt,
		});
	}

	async function captureOrder(userId, orderId) {
		if (!userId) throw new ForbiddenError('Missing session user.');
		if (!orderId) throw new BadRequestError(`Order id required.`);

		const request = new checkoutNodeJssdk.orders.OrdersCaptureRequest(orderId);
		const resp = await client().execute(request);
		const order = resp.result;

		if (resp.statusCode >= 400) {
			throw new BadRequestError(`PaypalError - statusCode: ${resp.status_code}, ${resp.result}`);
		}

		const dbOrder = await findOrder(userId, orderId);

		if (!dbOrder) {
			throw new BadRequestError(`Cannot find order ${orderId} for user ${userId}`);
		}

		return dbOrder.update({
			orderStatus: order.status,
			payerId: order.payer.payer_id,
			payerGivenName: order.payer.name.given_name,
			payerSurname: order.payer.name.surname,
			payerEmail: order.payer.email_address,
		});
	}

	return { createOrder, findOrder, captureOrder, markOrderApplied };
};
