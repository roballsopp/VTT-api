module.exports = (req, res, next) => {
	console.log(
		JSON.stringify({
			severity: 'info',
			message: `${req.method} ${req.originalUrl}`,
			headers: req.headers,
			body: req.body,
			query: req.query,
		})
	);
	next();
};
