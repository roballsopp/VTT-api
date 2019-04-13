const gcpRoutes = require('./gcp.routes');

module.exports = app => {
	gcpRoutes(app);
};
