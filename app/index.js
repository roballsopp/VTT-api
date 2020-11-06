const { GraphQLSchema } = require('graphql');
const Sentry = require('@sentry/node');
const { Storage } = require('@google-cloud/storage');
const { SpeechClient } = require('@google-cloud/speech');
const { createServer } = require('./express');
const createModels = require('./models');
const connectToDb = require('./db');
const gqlQueries = require('./root-query.graphql');
const gqlMutations = require('./root-mutaton.graphql');

Sentry.init({ dsn: process.env.SENTRY_DSN });

const graphqlSchema = new GraphQLSchema({ query: gqlQueries, mutation: gqlMutations });

process.on('SIGTERM', () => {
	// eslint-disable-next-line no-console
	console.log('Got SIGTERM. Exiting...');
});

connectToDb({
	database: process.env.PG_DATABASE,
	user: process.env.PG_USER,
	password: process.env.PG_PWD,
	host: process.env.PG_HOST,
	logging: false,
})
	.then(sequelize => {
		const speechClient = new SpeechClient();
		const storageClient = new Storage();
		const models = createModels({ sequelize, speechClient, storageClient });
		const app = createServer(graphqlSchema, models);

		// eslint-disable-next-line no-console
		app.listen(process.env.PORT, () => console.log(`Listening on port ${process.env.PORT}`));
	})
	.catch(err => {
		console.error('Failed to connect to database', err);
		Sentry.captureException(err);
	});
