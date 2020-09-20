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

	function initTranscription(userId, operationId, fileName, cost) {
		return cognitoClient
			.adminUpdateUserAttributes({
				UserAttributes: [
					{ Name: 'custom:transcription_op', Value: operationId },
					{ Name: 'custom:transcription_state', Value: 'pending' },
					{ Name: 'custom:transcription_cost', Value: cost.toFixed(2) },
					{ Name: 'custom:transcription_file', Value: fileName },
				],
				UserPoolId: process.env.COGNITO_POOL_ID,
				Username: userId,
			})
			.then(() => {
				return findById(userId);
			});
	}

	async function failTranscription(userId, operationId) {
		return findById(userId).then(user => {
			const pendingOpId = user['custom:transcription_op'];
			const opState = user['custom:transcription_state'];

			if (opState !== 'pending') {
				throw new BadRequestError('Cannot fail transcription, operation already finished');
			}
			if (pendingOpId !== operationId) {
				throw new BadRequestError(`Op ${operationId} does not match last operation`);
			}
			return cognitoClient
				.adminUpdateUserAttributes({
					UserAttributes: [{ Name: 'custom:transcription_state', Value: 'error' }],
					UserPoolId: process.env.COGNITO_POOL_ID,
					Username: userId,
				})
				.then(() => {
					user['custom:transcription_state'] = 'error';
					return user;
				});
		});
	}

	async function finishTranscription(userId, operationId) {
		return findById(userId).then(user => {
			const pendingOpId = user['custom:transcription_op'];
			const opState = user['custom:transcription_state'];
			const credit = Number(user['custom:credit'] || 0);
			const cost = Number(user['custom:transcription_cost']);

			if (opState !== 'pending') {
				throw new BadRequestError('Cannot finish transcription, operation already finished');
			}
			if (pendingOpId !== operationId) {
				throw new BadRequestError(`Op ${operationId} does not match last operation`);
			}
			const newCredit = (credit - cost).toFixed(2);
			return cognitoClient
				.adminUpdateUserAttributes({
					UserAttributes: [
						{ Name: 'custom:credit', Value: newCredit },
						{ Name: 'custom:transcription_state', Value: 'success' },
					],
					UserPoolId: process.env.COGNITO_POOL_ID,
					Username: userId,
				})
				.then(() => {
					user['custom:credit'] = newCredit;
					user['custom:transcription_state'] = 'success';
					return user;
				});
		});
	}

	return { findById, addCreditFromOrder, getCredit, initTranscription, finishTranscription, failTranscription };
};
