const winston = require('winston');
const expressWinston = require('express-winston');
const express = require('express');
const cors = require('cors');

const { createRoutes, errorHandler } = require('./express');

const app = express();

app.use(cors({ origin: new RegExp(`${process.env.CORS_ORIGIN}$`), methods: ['GET', 'POST', 'DELETE'] }));
app.use(express.json());

app.use(
	expressWinston.logger({
		// options for GCP LoggingWinston: https://github.com/googleapis/nodejs-logging-winston/blob/master/src/index.ts
		transports: [new winston.transports.Console()],
		format: winston.format.combine(winston.format.colorize(), winston.format.json()),
		meta: true, // optional: control whether you want to log the meta data about the request (default to true)
		// msg: 'HTTP {{req.method}} {{req.url}}', // optional: customize the default logging message. E.g. "{{res.statusCode}} {{req.method}} {{res.responseTime}}ms {{req.url}}"
		expressFormat: true, // Use the default Express/morgan request formatting. Enabling this will override any msg if true. Will only output colors with colorize set to true
		colorize: true, // Color the text and status code, using the Express/morgan color palette (text: gray, status: default green, 3XX cyan, 4XX yellow, 5XX red).
	})
);

createRoutes(app);

app.use(errorHandler);

if (process.env.NODE_ENV === 'production') {
	exports.vttCreatorApp = app;
} else {
	app.listen(process.env.PORT, () => console.log(`Listening on port ${process.env.PORT}`));
}
