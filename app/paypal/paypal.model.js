const checkoutNodeJssdk = require('@paypal/checkout-server-sdk');
const { ServerError } = require('../errors');

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

async function getOrder(orderId) {
	const request = new checkoutNodeJssdk.orders.OrdersGetRequest(orderId);
	return client()
		.execute(request)
		.then(resp => resp.result)
		.catch(err => {
			throw new ServerError(`PaypalError - statusCode: ${err.statusCode}, ${err.message}`);
		});
}

module.exports = function createPaypalModel() {
	return { getOrder };
};
