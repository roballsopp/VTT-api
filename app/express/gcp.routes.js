const gcpService = require('../services/gcp.service');

module.exports = app => {
	app.get('/upload', async (req, res, next) => {
		const filename = Date.now() + '';
		try {
			const url = await gcpService.getSignedUrl(filename);
			res.json({ filename, url });
		} catch (e) {
			next(e);
		}
	});

	app.get('/speech-to-text/languages', async (req, res, next) => {
		try {
			const languages = await gcpService.getLanuageCodes();
			res.json({ languages });
		} catch (e) {
			next(e);
		}
	});

	app.post('/speech-to-text/:filename', async (req, res, next) => {
		const { filename } = req.params;
		const { languageCode } = req.body;

		const options = {};

		if (languageCode) {
			options.languageCode = languageCode;
		}

		try {
			const operationId = await gcpService.initSpeechToTextOp(filename, options);
			res.status(201).send({ operationId });
		} catch (e) {
			next(e);
		}
	});

	app.get('/speech-to-text/:operationId', async (req, res, next) => {
		const { operationId } = req.params;

		try {
			const resp = await gcpService.getSpeechToTextOp(operationId);
			res.status(200).send(resp);
		} catch (e) {
			next(e);
		}
	});
};
