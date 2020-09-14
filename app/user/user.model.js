const { UnauthorizedError, BadRequestError, ServerError } = require('../errors');
const { CognitoIdentityProvider } = require('@aws-sdk/client-cognito-identity-provider');

const cognitoClient = new CognitoIdentityProvider({ region: process.env.COGNITO_POOL_REGION });

module.exports = function createUserModel({ paypalModel }) {
	async function findById(userId) {
		try {
			const results = await cognitoClient.adminGetUser({
				UserPoolId: process.env.COGNITO_POOL_ID,
				Username: userId, // cognito user id is named username
			});
			return results.UserAttributes.reduce((user, att) => {
				user[att.Name] = att.Value;
				return user;
			}, {});
		} catch (err) {
			console.error(err);
			throw new UnauthorizedError(err);
		}
	}

	function addCreditFromOrder(userId, orderId) {
		return paypalModel
			.getAccessToken()
			.then(({ access_token }) => {
				return Promise.all([findById(userId), paypalModel.getOrder(orderId, access_token)]);
			})
			.then(([user, order]) => {
				const orderAmt = Number(order.purchase_units[0].amount.value);
				if (Number.isNaN(orderAmt)) {
					throw new ServerError(`Expected a number from paypal, but got ${order.purchase_units[0].amount.value}`);
				}
				const orderDate = new Date(order.create_time);
				const currentCredit = Number(user['custom:credit'] || 0);
				const lastOrderDate = new Date(user['custom:last_order_date'] || '1970-01-01');
				if (lastOrderDate >= orderDate) {
					throw new BadRequestError(`Can't add credit from old order`);
				}
				const newCredit = (orderAmt + currentCredit).toFixed(2);
				return cognitoClient
					.adminUpdateUserAttributes({
						UserAttributes: [
							{ Name: 'custom:credit', Value: newCredit },
							{ Name: 'custom:last_order_date', Value: orderDate.toISOString() },
							{ Name: 'custom:last_order_id', Value: order.id },
						],
						UserPoolId: process.env.COGNITO_POOL_ID,
						Username: userId,
					})
					.then(() => {
						user['custom:credit'] = newCredit;
						user['custom:last_order_date'] = orderDate.toISOString();
						user['custom:last_order_id'] = order.id;
						return user;
					});
			});
	}

	return { findById, addCreditFromOrder };
};
