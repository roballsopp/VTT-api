const express = require('express');
const cors = require('cors');
const errorHandler = require('./error-handler');
const requestLogger = require('./request-logger');
const createGraphqlApp = require('./graphql-app');
const cognitoTokenMiddleware = require('./cognito-token.middleware');
const { REQUEST_LOGGING } = require('../config');

module.exports = function createServer(graphqlSchema, models) {
	const app = express();

	app.use(cors({ origin: new RegExp(`${process.env.CORS_ORIGIN}$`), methods: ['GET', 'POST', 'DELETE'] }));
	app.use(express.json());
	if (REQUEST_LOGGING) app.use(requestLogger);
	app.get('/health', (req, res) => res.status(200).json({ status: 'Ok' }));
	app.use(cognitoTokenMiddleware, createGraphqlApp(graphqlSchema, models));
	app.use(errorHandler);

	return app;
};
