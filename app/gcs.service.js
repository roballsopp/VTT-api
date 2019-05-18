const moment = require('moment');
const { Storage } = require('@google-cloud/storage');

const storage = new Storage();

const myBucket = storage.bucket('autovtt_test');

function getSignedUrl(filename) {
	const file = myBucket.file(filename);

	return file.getSignedUrl({
		action: 'write',
		version: 'v4',
		expires: moment()
			.add(10, 'minutes')
			.toISOString(),
	});
}

module.exports = {
	getSignedUrl,
};
