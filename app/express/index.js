const gcpRoutes = require('./gcp.routes');
const stripeRoutes = require('./stripe.routes');
const errorHandler = require('./error-handler');
const requestLogger = require('./request-logger');

module.exports = {
	createRoutes: app => {
		gcpRoutes(app);
		stripeRoutes(app);
	},
	errorHandler,
	requestLogger,
};
