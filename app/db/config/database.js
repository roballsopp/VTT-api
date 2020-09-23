// TODO: this is dumb. figure out how to just provide one config from env vars
module.exports = {
	development: {
		username: process.env.PG_USER,
		password: process.env.PG_PWD,
		database: process.env.PG_DATABASE,
		host: process.env.PG_HOST,
		port: process.env.PG_PORT,
		dialect: 'postgres',
	},
	test: {
		username: process.env.PG_USER,
		password: process.env.PG_PWD,
		database: process.env.PG_DATABASE,
		host: process.env.PG_HOST,
		port: process.env.PG_PORT,
		dialect: 'postgres',
	},
	production: {
		username: process.env.PG_USER,
		password: process.env.PG_PWD,
		database: process.env.PG_DATABASE,
		host: process.env.PG_HOST,
		port: process.env.PG_PORT,
		dialect: 'postgres',
	},
};