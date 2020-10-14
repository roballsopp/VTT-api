const crypto = require('crypto');
const stream = require('stream');
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

	this.sequelize = await connectToDb({
		database: process.env.PG_DATABASE,
		user: process.env.PG_USER,
		password: process.env.PG_PWD,
		host: process.env.PG_HOST,
		logging: false,
	});

	this.mockGCP = {
		fileInstance: {},
		setFileInstance: ({ name, audioDuration }) => {
			const buffer = encodeWaveHeader({ duration: audioDuration });
			this.mockGCP.fileInstance = {
				getSignedUrl: chai.spy(() => Promise.resolve(['signed_url'])),
				createReadStream: chai.spy(() => {
					return stream.Readable.from(buffer);
				}),
				delete: chai.spy(fileToDelete => (name === fileToDelete ? Promise.resolve() : Promise.reject())),
			};
		},
		longRunningRecognizeResponse: {},
		setLongRunningRecognizeResponse: ({ operationId }) => {
			this.mockGCP.longRunningRecognizeResponse = { latestResponse: { name: operationId } };
		},
		speechClient: {
			longRunningRecognize: chai.spy(() => Promise.resolve([this.mockGCP.longRunningRecognizeResponse])),
			checkLongRunningRecognizeProgress: chai.spy(() => Promise.resolve({ done: true, result: { results: [] } })),
		},
		storageClient: {
			bucket: () => ({
				file: () => this.mockGCP.fileInstance,
			}),
		},
	};

	this.models = createModels({
		sequelize: this.sequelize,
		speechClient: this.mockGCP.speechClient,
		storageClient: this.mockGCP.storageClient,
	});

	const graphqlSchema = new GraphQLSchema({ query: gqlQueries, mutation: gqlMutations });

	this.createServer = (modelOverrides = {}) => {
		return createServer(graphqlSchema, { ...this.models, ...modelOverrides });
	};

	this.testUserId = User.Username;
	this.testUserEmail = testUserEmail;
	this.testUserPassword = testUserPassword;
	this.testUserToken = AuthenticationResult.IdToken;
	this.updateTestUser = updateTestUser;
});

function encodeWaveHeader({ duration }) {
	const fakeDataLength = duration * 88200;
	const buffer = new Buffer(44);
	buffer.write('RIFF', 0, 4, 'ascii');
	buffer.writeUInt32LE(4 + 24 + 8 + fakeDataLength, 4); // WAVE field + format header + data header + data
	buffer.write('WAVE', 8, 4, 'ascii');
	buffer.write('fmt ', 12, 4, 'ascii');
	buffer.writeUInt32LE(16, 16); // fmt size
	buffer.writeUInt16LE(1, 20); // Audio format 1=PCM
	buffer.writeUInt16LE(1, 22); // audio channels
	buffer.writeUInt32LE(44100, 24); // sample rate
	buffer.writeUInt32LE(88200, 28); // Bytes per second == SampleRate * NumChannels * bitDepth / 8
	buffer.writeUInt16LE(2, 32); // block align NumChannels * bitDepth / 8
	buffer.writeUInt16LE(16, 34); // bitDepth
	buffer.write('data', 36, 4, 'ascii');
	buffer.writeUInt32LE(fakeDataLength, 40); // data length == NumSamples * NumChannels * bitDepth / 8
	return buffer;
}
