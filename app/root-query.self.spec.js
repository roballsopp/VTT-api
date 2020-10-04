const crypto = require('crypto');
const request = require('supertest');
const { expect } = require('chai');
const { CognitoIdentityProvider } = require('@aws-sdk/client-cognito-identity-provider');
const { COGNITO_POOL_ID, COGNITO_CLIENT_SECRET, COGNITO_CLIENT_ID, COGNITO_POOL_REGION } = require('./config');

const cognitoClient = new CognitoIdentityProvider({ region: COGNITO_POOL_REGION });

describe('RootQuery.self', function() {
	before(async function() {
		this.expectedEmail = 'testy@mc-tester.com';

		try {
			await cognitoClient.adminDeleteUser({
				UserPoolId: COGNITO_POOL_ID,
				Username: this.expectedEmail,
			});
		} catch (e) {
			// user probably not found
			console.warn(e);
		}

		await cognitoClient.adminCreateUser({
			UserPoolId: COGNITO_POOL_ID,
			Username: this.expectedEmail, // cognito user id is named username
			UserAttributes: [
				{
					Name: 'email',
					Value: this.expectedEmail,
				},
				{
					Name: 'email_verified',
					Value: 'true',
				},
				{
					Name: 'custom:unlimited_usage',
					Value: '1',
				},
				{
					Name: 'custom:last_order_id',
					Value: '123456',
				},
				{
					Name: 'custom:last_order_date',
					Value: new Date('2020-01-01').toISOString(),
				},
				{
					Name: 'custom:credit',
					Value: '10.00',
				},
			],
		});

		await cognitoClient.adminSetUserPassword({
			UserPoolId: COGNITO_POOL_ID,
			Username: this.expectedEmail,
			Password: 'Password1',
			Permanent: true,
		});

		const authResp = await cognitoClient.adminInitiateAuth({
			AuthFlow: 'ADMIN_USER_PASSWORD_AUTH',
			ClientId: COGNITO_CLIENT_ID,
			UserPoolId: COGNITO_POOL_ID,
			AuthParameters: {
				USERNAME: this.expectedEmail,
				PASSWORD: 'Password1',
				SECRET_HASH: crypto
					.createHmac('SHA256', COGNITO_CLIENT_SECRET)
					.update(`${this.expectedEmail}${COGNITO_CLIENT_ID}`)
					.digest('base64')
					.toString(),
			},
		});

		const { body, statusCode } = await request(this.server)
			.post('/graphql')
			.send({
				query: `query {
					self {
						id
						email
						credit
						unlimitedUsage
						lastOrderDate
					}
				}`,
			})
			.set('Authorization', `Bearer ${authResp.AuthenticationResult.IdToken}`);

		if (statusCode >= 400) throw new Error(`User request failed: ${body.message}`);

		this.user = body.data.self;
	});

	it('has the correct email address', async function() {
		expect(this.user.email).to.equal(this.expectedEmail);
	});

	it('is configured for unlimited usage', async function() {
		expect(this.user.unlimitedUsage).to.equal(true);
	});

	it('has $10 worth of credit', async function() {
		expect(this.user.credit).to.equal(10);
	});

	it('last placed an order on 2020-01-01', async function() {
		expect(this.user.lastOrderDate).to.equal(new Date('2020-01-01').toISOString());
	});
});
