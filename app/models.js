const { createGCPModel } = require('./google');
const { createPaypalModel } = require('./paypal');
const { createUserModel } = require('./user');

module.exports = () => {
	return {
		gcp: createGCPModel(),
		paypal: createPaypalModel(),
		user: createUserModel(),
	};
};
