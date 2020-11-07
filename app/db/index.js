const { Sequelize } = require('sequelize');
const PaypalOrder = require('./models/PaypalOrder');
const TranscriptionJob = require('./models/TranscriptionJob');

module.exports = ({ database, user, password, host, logging = false }) => {
	// TODO: wrap logger
	// eslint-disable-next-line no-console
	console.log(
		JSON.stringify({
			severity: 'info',
			message: `Connecting to postgres db "${database}" at ${host}`,
		})
	);

	const sequelize = new Sequelize(database, user, password, {
		host,
		logging,
		dialect: 'postgres',
	});

	PaypalOrder.init(sequelize);
	TranscriptionJob.init(sequelize);

	return sequelize.authenticate().then(() => sequelize);
};
