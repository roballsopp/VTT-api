const gcpRoutes = require('./gcp.routes');
const stripeRoutes = require('./stripe.routes');

module.exports = app => {
	gcpRoutes(app);
	stripeRoutes(app);
};
