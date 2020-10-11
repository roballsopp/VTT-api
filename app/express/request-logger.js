const { GCP_PROJECT } = require('../config');

module.exports = (req, res, next) => {
	const reqStart = new Date();

	const reqInfo = {
		severity: 'info',
		message: `${req.method} ${req.originalUrl}`,
		headers: req.headers,
		body: cleanupGql(req.path, req.body),
		query: req.query,
		reqStart: reqStart.toISOString(),
	};

	// correlate my logs with the automatic ones created by cloud run: https://cloud.google.com/run/docs/logging#correlate-logs
	const traceHeader = req.header('X-Cloud-Trace-Context');

	if (traceHeader && GCP_PROJECT) {
		const [trace] = traceHeader.split('/');
		reqInfo['logging.googleapis.com/trace'] = `projects/${GCP_PROJECT}/traces/${trace}`;
	}

	res.once('close', () => {
		const reqEnd = new Date();
		const reqDuration = reqEnd - reqStart;

		if (process.env.NODE_ENV === 'production') {
			console.log(JSON.stringify({ ...reqInfo, reqEnd: reqEnd.toISOString(), reqDuration }));
		} else {
			console.log('Request log:', { ...reqInfo, reqEnd: reqEnd.toISOString(), reqDuration });
		}
	});

	next();
};

function cleanupGql(path, body) {
	if (path === '/graphql') {
		return {
			...body,
			query: body.query.replace(/\s+/g, ' '),
		};
	}
}
