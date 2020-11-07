const { UnauthorizedError, BadRequestError, ForbiddenError } = require('../errors');
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

	async function addCreditFromOrder(userId, orderId) {
		if (!userId) throw new ForbiddenError('Missing session user.');
		if (!orderId) throw new BadRequestError(`Order id required.`);

		const [user, order] = await Promise.all([findById(userId), paypalModel.findOrder(userId, orderId)]);

		if (!user) throw new BadRequestError(`Couldn't find user ${userId}`);
		if (!order) throw new BadRequestError(`Couldn't find an order for id ${orderId}`);
		if (order.applied) throw new ForbiddenError('Order already applied.');

		const newCredit = (order.amount + user.credit).toFixed(2);

		await cognitoClient.adminUpdateUserAttributes({
			UserAttributes: [{ Name: 'custom:credit', Value: newCredit }],
			UserPoolId: COGNITO_POOL_ID,
			Username: userId,
		});

		await paypalModel.markOrderApplied(userId, orderId);

		user.credit = newCredit;
		return user;
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
	}
}
