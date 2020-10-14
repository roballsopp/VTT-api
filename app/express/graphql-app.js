const express = require('express');
const { graphqlHTTP } = require('express-graphql');

module.exports = (graphqlSchema, models) => {
	const graphQlApp = express.Router();

	graphQlApp.use(
		'/graphql',
		graphqlHTTP(req => {
			return {
				schema: graphqlSchema,
				graphiql: process.env.NODE_ENV === 'development',
				context: {
					user: req.user,
					models,
				},
				customFormatErrorFn: err => {
					console.error('GraphQL error:', err);
					return err;
				},
			};
		})
	);

	return graphQlApp;
};
