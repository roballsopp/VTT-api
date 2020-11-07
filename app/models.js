const { createGCPModel } = require('./google');
const { createPaypalModel } = require('./paypal');
const { createTranscriptionModel } = require('./transcriptions');
const { createUserModel } = require('./user');

module.exports = ({ sequelize, speechClient, storageClient, paypalClient }) => {
	const gcp = createGCPModel({ speechClient, storageClient });
	const paypal = createPaypalModel({ sequelize, paypalClient });
	const transcription = createTranscriptionModel({ sequelize });
	const user = createUserModel({ paypalModel: paypal });
	return { gcp, paypal, user, transcription };
};
