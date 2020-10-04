module.exports = (req, res, next) => {
	if (process.env.NODE_ENV === 'production') {
		console.log(
			JSON.stringify({
				severity: 'info',
				message: `${req.method} ${req.originalUrl}`,
				headers: req.headers,
				body: req.body,
				query: req.query,
			})
		);
	} else {
		console.log(`${req.method} ${req.originalUrl}`, 'body:', req.body, 'query:', req.query, 'headers:', req.headers);
	}

	next();
};
