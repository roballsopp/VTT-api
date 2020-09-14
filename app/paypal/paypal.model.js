const url = require('url');
const axios = require('axios');
const { UnauthorizedError, ServerError } = require('../errors');

async function getAccessToken() {
	const params = new url.URLSearchParams({ grant_type: 'client_credentials' });
	const authString = Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_SECRET}`).toString('base64');
	try {
		const resp = await axios({
			method: 'POST',
			url: `${process.env.PAYPAL_API}/v1/oauth2/token`,
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
				Authorization: `Basic ${authString}`,
			},
			data: params.toString(),
		});
		return resp.data;
	} catch (e) {
		throw new UnauthorizedError(e.response.data.message);
	}
}

async function getOrder(orderId, accessToken) {
	return axios({
		method: 'GET',
		url: `${process.env.PAYPAL_API}/v2/checkout/orders/${orderId}`,
		headers: {
			Accept: `application/json`,
			Authorization: `Bearer ${accessToken}`,
		},
	})
		.catch(err => {
			throw new ServerError(err.response.data.message);
		})
		.then(resp => {
			if (resp.data.error) {
				throw new ServerError(resp.data.error);
			}
			return resp.data;
		});
}

module.exports = function createPaypalModel() {
	return { getOrder, getAccessToken };
};
