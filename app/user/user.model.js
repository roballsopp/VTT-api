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
			const cognitoAttr = results.UserAttributes.reduce((user, att) => {
				user[att.Name] = att.Value;
				return user;
			}, {});
			return new User(cognitoAttr);
		} catch (err) {
			console.error(err);
			throw new UnauthorizedError(err);
		}
	}

	function addCreditFromOrder(userId, orderId) {
		return Promise.all([findById(userId), paypalModel.getOrder(orderId)]).then(([user, order]) => {
			const orderAmt = Number(order.purchase_units[0].amount.value);
			if (Number.isNaN(orderAmt)) {
				throw new ServerError(`Expected a number from paypal, but got ${order.purchase_units[0].amount.value}`);
			}
			const orderDate = new Date(order.create_time);
			if (user.lastOrderDate >= orderDate) {
				throw new BadRequestError(`Can't add credit from old order`);
			}
			const newCredit = (orderAmt + user.credit).toFixed(2);
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
					user.credit = newCredit;
					user.lastOrderDate = orderDate.toISOString();
					user.lastOrderId = order.id;
					return user;
				});
		});
	}

	async function applyTranscriptionFee(userId, fee) {
		return findById(userId).then(user => {
			if (user.unlimitedUsage) return user;
			const newCredit = (user.credit - fee).toFixed(2);
			return cognitoClient
				.adminUpdateUserAttributes({
					UserAttributes: [{ Name: 'custom:credit', Value: newCredit }],
					UserPoolId: COGNITO_POOL_ID,
					Username: userId,
				})
				.then(() => {
					user.credit = newCredit;
					return user;
				});
		});
	}

	return { findById, addCreditFromOrder, applyTranscriptionFee };
};

class User {
	constructor(cognitoUser) {
		this.id = cognitoUser.sub;
		this.email = cognitoUser.email;
		this.emailVerified = cognitoUser.email_verified === 'true';
		this.credit = Number(cognitoUser['custom:credit'] || 0);
		this.unlimitedUsage = cognitoUser['custom:unlimited_usage'] === '1';
		this.lastOrderDate = new Date(cognitoUser['custom:last_order_date'] || '1970-01-01');
		this.lastOrderId = cognitoUser['custom:last_order_id'];
	}
}
