const gcsService = require('../gcs.service');

module.exports = app => {
	app.get('/upload', async (req, res) => {
		const filename = Date.now() + '';
		try {
			const url = await gcsService.getSignedUrl(filename);
			res.json({ filename, url });
		} catch (e) {
			console.error('dingus', e);
			res.status(500).send(e);
		}
	});
};
