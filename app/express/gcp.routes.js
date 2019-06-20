const gcpService = require('../services/gcp.service');

module.exports = app => {
	app.get('/upload', async (req, res) => {
		const filename = Date.now() + '';
		try {
			const url = await gcpService.getSignedUrl(filename);
			res.json({ filename, url });
		} catch (e) {
			res.status(500).send(e.message);
		}
	});

	app.get('/speech-to-text/languages', async (req, res) => {
		try {
			const languages = await gcpService.getLanuageCodes();
			res.json({ languages });
		} catch (e) {
			res.status(500).send(e.message);
		}
	});

	app.post('/speech-to-text/:filename', async (req, res) => {
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
			res.status(500).send(e.message);
		}
	});

	app.get('/speech-to-text/:operationId', async (req, res) => {
		const { operationId } = req.params;

		try {
			const resp = await gcpService.getSpeechToTextOp(operationId);
			res.status(200).send(resp);
		} catch (e) {
			res.status(500).send(e.message);
		}
	});
};
