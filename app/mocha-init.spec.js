const crypto = require('crypto');
const { GraphQLSchema } = require('graphql');
const chai = require('chai');
const { CognitoIdentityProvider } = require('@aws-sdk/client-cognito-identity-provider');
const { createServer } = require('./express');
const createModels = require('./models');
const connectToDb = require('./db');
const gqlQueries = require('./root-query.graphql');
const gqlMutations = require('./root-mutaton.graphql');
const { COGNITO_POOL_ID, COGNITO_CLIENT_SECRET, COGNITO_CLIENT_ID, COGNITO_POOL_REGION } = require('./config');

const cognitoClient = new CognitoIdentityProvider({ region: COGNITO_POOL_REGION });

chai.use(require('chai-spies'));

before(async function() {
	const testUserEmail = 'testy@mc-tester.com';
	const testUserPassword = 'Password1';

	try {
		await cognitoClient.adminDeleteUser({
			UserPoolId: COGNITO_POOL_ID,
			Username: testUserEmail,
		});
	} catch (e) {
		// user probably not found
		console.warn(e);
	}

	const { User } = await cognitoClient.adminCreateUser({
		UserPoolId: COGNITO_POOL_ID,
		Username: testUserEmail,
		UserAttributes: [
			{
				Name: 'email',
				Value: testUserEmail,
			},
			{
				Name: 'email_verified',
				Value: 'true',
			},
		],
	});

	await cognitoClient.adminSetUserPassword({
		UserPoolId: COGNITO_POOL_ID,
		Username: testUserEmail,
		Password: testUserPassword,
		Permanent: true,
	});

	const { AuthenticationResult } = await cognitoClient.adminInitiateAuth({
		AuthFlow: 'ADMIN_USER_PASSWORD_AUTH',
		ClientId: COGNITO_CLIENT_ID,
		UserPoolId: COGNITO_POOL_ID,
		AuthParameters: {
			USERNAME: testUserEmail,
			PASSWORD: testUserPassword,
			SECRET_HASH: crypto
				.createHmac('SHA256', COGNITO_CLIENT_SECRET)
				.update(`${testUserEmail}${COGNITO_CLIENT_ID}`)
				.digest('base64')
				.toString(),
		},
	});

	function updateTestUser(attributes) {
		return cognitoClient.adminUpdateUserAttributes({
			UserAttributes: Object.entries(attributes).map(([k, Value]) => ({ Name: `custom:${k}`, Value })),
			UserPoolId: COGNITO_POOL_ID,
			Username: User.Username,
		});
	}

	const graphqlSchema = new GraphQLSchema({ query: gqlQueries, mutation: gqlMutations });

	this.sequelize = await connectToDb({
		database: process.env.PG_DATABASE,
		user: process.env.PG_USER,
		password: process.env.PG_PWD,
		host: process.env.PG_HOST,
		logging: false,
	});

	this.models = createModels({ sequelize: this.sequelize });

	this.createServer = (modelOverrides = {}) => {
		return createServer(graphqlSchema, { ...this.models, ...modelOverrides });
	};

	this.testUserId = User.Username;
	this.testUserEmail = testUserEmail;
	this.testUserPassword = testUserPassword;
	this.testUserToken = AuthenticationResult.IdToken;
	this.updateTestUser = updateTestUser;
});
