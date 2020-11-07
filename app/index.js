const { GraphQLSchema } = require('graphql');
const Sentry = require('@sentry/node');
const { Storage } = require('@google-cloud/storage');
const { SpeechClient } = require('@google-cloud/speech');
const checkoutNodeJssdk = require('@paypal/checkout-server-sdk');
const { createServer } = require('./express');
const createModels = require('./models');
const connectToDb = require('./db');
const gqlQueries = require('./root-query.graphql');
const gqlMutations = require('./root-mutaton.graphql');
const { SERVER_PORT, PG_DATABASE, PG_HOST, PG_PWD, PG_USER, PAYPAL_CLIENT_ID, PAYPAL_SECRET } = require('./config');

Sentry.init({ dsn: process.env.SENTRY_DSN });

const graphqlSchema = new GraphQLSchema({ query: gqlQueries, mutation: gqlMutations });

process.on('SIGTERM', () => {
	// eslint-disable-next-line no-console
	console.log('Got SIGTERM. Exiting...');
});

function getPayPalEnv() {
	if (process.env.NODE_ENV === 'production') {
		return new checkoutNodeJssdk.core.LiveEnvironment(PAYPAL_CLIENT_ID, PAYPAL_SECRET);
	}
	return new checkoutNodeJssdk.core.SandboxEnvironment(PAYPAL_CLIENT_ID, PAYPAL_SECRET);
}

connectToDb({
	database: PG_DATABASE,
	user: PG_USER,
	password: PG_PWD,
	host: PG_HOST,
	logging: false,
})
	.then(sequelize => {
		const speechClient = new SpeechClient();
		const storageClient = new Storage();
		const paypalClient = new checkoutNodeJssdk.core.PayPalHttpClient(getPayPalEnv());
		const models = createModels({ sequelize, speechClient, storageClient, paypalClient });
		const app = createServer(graphqlSchema, models);

		// eslint-disable-next-line no-console
		app.listen(SERVER_PORT, () => console.log(`Listening on port ${SERVER_PORT}`));
	})
	.catch(err => {
		console.error('Failed to connect to database', err);
		Sentry.captureException(err);
	});
