const moment = require('moment');
const { Storage } = require('@google-cloud/storage');
const { SpeechClient } = require('@google-cloud/speech');
const { google } = require('googleapis');

const AUDIO_BUCKET = 'autovtt_test';

const storage = new Storage();

const myBucket = storage.bucket(AUDIO_BUCKET);

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
const speech = new SpeechClient();

async function initSpeechToTextOp(filename, options = {}) {
	const [operation] = await speech.longRunningRecognize({
		config: {
			encoding: 'LINEAR16', // LINEAR16 is PCM at bit depth 16, https://cloud.google.com/speech-to-text/docs/encoding
			// sampleRateHertz: 44100, // omit to automatically set
			languageCode: 'en-US',
			...options,
		},
		audio: {
			uri: `gs://${AUDIO_BUCKET}/${filename}`,
		},
	});

	return operation.latestResponse.name;
}

async function getSpeechToTextOp(name) {
	const auth = await google.auth.getClient({
		scopes: ['https://www.googleapis.com/auth/cloud-platform'],
	});
	const { data } = await google.speech('v1').operations.get({ auth, name });
	const { done, response, error } = data;

	if (error) {
		console.error('OP ERROR', error.details);
		throw new Error(error.message);
	}
	if (response) {
		return { done, results: response.results };
	}
	return { done };
}

module.exports = {
	getSignedUrl,
	initSpeechToTextOp,
	getSpeechToTextOp,
};
