const { createGCPModel } = require('./google');
const { createPaypalModel } = require('./paypal');
const { createUserModel } = require('./user');

module.exports = () => {
	const gcp = createGCPModel();
	const paypal = createPaypalModel();
	const user = createUserModel({ paypalModel: paypal });
	return { gcp, paypal, user };
};
