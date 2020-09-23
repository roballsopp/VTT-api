const { UnauthorizedError, BadRequestError, ServerError } = require('../errors');
const { CognitoIdentityProvider } = require('@aws-sdk/client-cognito-identity-provider');
const { COGNITO_POOL_ID, COGNITO_POOL_REGION } = require('../config');

const cognitoClient = new CognitoIdentityProvider({ region: COGNITO_POOL_REGION });

module.exports = function createUserModel({ paypalModel }) {
	async function findById(userId) {
		try {
			const results = await cognitoClient.adminGetUser({
				UserPoolId: COGNITO_POOL_ID,
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

	async function getCredit(userId) {
		const user = await findById(userId);
		return Number(user['custom:credit'] || 0);
	}

	function addCreditFromOrder(userId, orderId) {
		return Promise.all([findById(userId), paypalModel.getOrder(orderId)]).then(([user, order]) => {
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
					UserPoolId: COGNITO_POOL_ID,
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

	async function applyTranscriptionFee(userId, fee) {
		return findById(userId).then(user => {
			const credit = Number(user['custom:credit'] || 0);
			const newCredit = (credit - fee).toFixed(2);
			return cognitoClient
				.adminUpdateUserAttributes({
					UserAttributes: [{ Name: 'custom:credit', Value: newCredit }],
					UserPoolId: COGNITO_POOL_ID,
					Username: userId,
				})
				.then(() => {
					user['custom:credit'] = newCredit;
					return user;
				});
		});
	}

	return { findById, addCreditFromOrder, getCredit, applyTranscriptionFee };
};
