const gcsService = require('../gcs.service');

module.exports = app => {
	app.get('/upload', async (req, res) => {
		const filename = Date.now() + '';
		try {
			const url = await gcsService.getSignedUrl(filename);
			res.json({ filename, url });
		} catch (e) {
			res.status(500).send(e);
		}
	});

	app.get('/text-from-speech/:filename', async (req, res) => {
		const { filename } = req.params;

		try {
			await gcsService.getTextFromSpeech(filename);
			res.status(200).send();
		} catch (e) {
			res.status(500).send(e);
		}
	});
};
