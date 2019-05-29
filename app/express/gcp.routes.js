const gcsService = require('../services/gcs.service');

module.exports = app => {
	app.get('/upload', async (req, res) => {
		const filename = Date.now() + '';
		try {
			const url = await gcsService.getSignedUrl(filename);
			res.json({ filename, url });
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
			const operationId = await gcsService.initSpeechToTextOp(filename, options);
			res.status(201).send({ operationId });
		} catch (e) {
			res.status(500).send(e.message);
		}
	});

	app.get('/speech-to-text/:operationId', async (req, res) => {
		const { operationId } = req.params;

		try {
			const resp = await gcsService.getSpeechToTextOp(operationId);
			res.status(200).send(resp);
		} catch (e) {
			res.status(500).send(e.message);
		}
	});
};
