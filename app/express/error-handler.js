const { BadRequestError, NotFoundError, ServerError } = require('../errors');

// eslint-disable-next-line no-unused-vars
module.exports = (err, req, res, next) => {
	res = res.status(getStatusCodeFromError(err));
	if (process.env.NODE_ENV === 'development') {
		res.json({ message: err.message, stack: getStackTraceFromError(err) });
	} else {
		res.json({ message: err.message });
	}
};

function getStackTraceFromError(err) {
	const stack = (err && err.stack) || '';
	return stack.split('\n');
}

function getStatusCodeFromError(err) {
	if (err instanceof BadRequestError) return 400;
	if (err instanceof NotFoundError) return 404;
	if (err instanceof ServerError) return 500;
	return 500;
}
