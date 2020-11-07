module.exports = {
	username: process.env.PG_USER,
	password: process.env.PG_PWD,
	database: process.env.PG_DATABASE,
	host: process.env.PG_HOST,
	port: process.env.PG_PORT,
	dialect: 'postgres',
};
