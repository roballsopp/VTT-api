const Sentry = require('@sentry/node');
const { BadRequestError, NotFoundError, ServerError } = require('../errors');

Sentry.init({ dsn: process.env.SENTRY_DSN });

// eslint-disable-next-line no-unused-vars
module.exports = (err, req, res, next) => {
	Sentry.captureException(err);
	const stack = getStackTraceFromError(err);
	const statusCode = getStatusCodeFromError(err);

	console.error(
		JSON.stringify({
			severity: 'error',
			message: `${statusCode} - ${req.method} ${req.originalUrl} - ${err.message}`,
			headers: req.headers,
			body: req.body,
			query: req.query,
			stack,
		})
	);

	res.status(statusCode).json({ message: err.message, stack });
};

function getStackTraceFromError(err) {
	// don't share stack trace in prod
	if (process.env.NODE_ENV !== 'development') return [];
	const stack = (err && err.stack) || '';
	return stack.split('\n');
}

function getStatusCodeFromError(err) {
	if (err instanceof BadRequestError) return 400;
	if (err instanceof NotFoundError) return 404;
	if (err instanceof ServerError) return 500;
	return 500;
}
