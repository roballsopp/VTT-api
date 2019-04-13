const gcsService = require('../gcs.service');

module.exports = app => {
	app.get('/upload', async (req, res) => {
		const filename = Date.now();
		res.json({ filename, url: await gcsService.getSignedUrl(filename) });
	});
};
