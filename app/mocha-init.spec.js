const { GraphQLSchema } = require('graphql');
const { createServer } = require('./express');
const createModels = require('./models');
const connectToDb = require('./db');
const gqlQueries = require('./root-query.graphql');
const gqlMutations = require('./root-mutaton.graphql');

before(async function() {
	const graphqlSchema = new GraphQLSchema({ query: gqlQueries, mutation: gqlMutations });

	return connectToDb({
		database: process.env.PG_DATABASE,
		user: process.env.PG_USER,
		password: process.env.PG_PWD,
		host: process.env.PG_HOST,
		logging: false,
	}).then(sequelize => {
		this.models = createModels({ sequelize });
		this.sequelize = sequelize;
		this.server = createServer(graphqlSchema, this.models);
	});
});
