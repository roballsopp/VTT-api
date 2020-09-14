const { UnauthorizedError } = require('../errors');
const { CognitoIdentityProvider } = require('@aws-sdk/client-cognito-identity-provider');

const cognitoClient = new CognitoIdentityProvider({ region: process.env.COGNITO_POOL_REGION });

module.exports = function createUserModel() {
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

	async function addCredit(userId, dollarsToAdd) {
		try {
			const user = await findById(userId);
			const currentCredit = Number(user['custom:credit']);
			const newCredit = (dollarsToAdd + currentCredit).toFixed(2);
			await cognitoClient.adminUpdateUserAttributes({
				UserAttributes: [{ Name: 'custom:credit', Value: newCredit }],
				UserPoolId: process.env.COGNITO_POOL_ID,
				Username: userId,
			});
			user['custom:credit'] = newCredit;
			return user;
		} catch (err) {
			console.error(err);
			throw new UnauthorizedError(err);
		}
	}

	return { findById, addCredit };
};
