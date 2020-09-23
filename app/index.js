const { GraphQLSchema } = require('graphql');
const Sentry = require('@sentry/node');
const { createServer } = require('./express');
const createModels = require('./models');
const connectToDb = require('./db');
const gqlQueries = require('./root-query.graphql');
const gqlMutations = require('./root-mutaton.graphql');

Sentry.init({ dsn: process.env.SENTRY_DSN });

const graphqlSchema = new GraphQLSchema({ query: gqlQueries, mutation: gqlMutations });

connectToDb({
	database: process.env.PG_DATABASE,
	user: process.env.PG_USER,
	password: process.env.PG_PWD,
	host: process.env.PG_HOST,
	logging: false,
})
	.then(sequelize => {
		const models = createModels({ sequelize });
		const app = createServer(graphqlSchema, models);

		app.listen(process.env.PORT, () => console.log(`Listening on port ${process.env.PORT}`));
	})
	.catch(err => {
		console.error('Failed to connect to database', err);
		Sentry.captureException(err);
	});
