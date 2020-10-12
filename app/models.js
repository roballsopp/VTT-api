const { createGCPModel } = require('./google');
const { createPaypalModel } = require('./paypal');
const { createTranscriptionModel } = require('./transcriptions');
const { createUserModel } = require('./user');

module.exports = ({ sequelize, speechClient, storageClient }) => {
	const gcp = createGCPModel({ speechClient, storageClient });
	const paypal = createPaypalModel();
	const transcription = createTranscriptionModel({ sequelize });
	const user = createUserModel({ paypalModel: paypal });
	return { gcp, paypal, user, transcription };
};
