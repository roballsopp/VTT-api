const gcpRoutes = require('./gcp.routes');
const stripeRoutes = require('./stripe.routes');
const errorHandler = require('./error-handler');

module.exports = {
	createRoutes: app => {
		gcpRoutes(app);
		stripeRoutes(app);
	},
	errorHandler,
};
