const moment = require('moment');
const { Storage } = require('@google-cloud/storage');
const { SpeechClient } = require('@google-cloud/speech');
const { google } = require('googleapis');
const { ServerError } = require('../errors');

const speech = new SpeechClient();

const storage = new Storage();
const audioBucket = storage.bucket(process.env.AUDIO_BUCKET);

function getSignedUrl(filename) {
	const file = audioBucket.file(filename);

	return file.getSignedUrl({
		action: 'write',
		version: 'v4',
		expires: moment()
			.add(10, 'minutes')
			.toISOString(),
	});
}

async function deleteFile(filename) {
	// docs: https://cloud.google.com/nodejs/docs/reference/storage/2.5.x/File#delete
	return audioBucket.file(filename).delete();
}

async function initSpeechToTextOp(filename, options = {}) {
	const [operation] = await speech.longRunningRecognize({
		config: {
			encoding: 'LINEAR16', // LINEAR16 is PCM at bit depth 16, https://cloud.google.com/speech-to-text/docs/encoding
			// sampleRateHertz: 44100, // omit to automatically set
			languageCode: 'en-US', // en-US (american english), en-GB (british english), ...https://cloud.google.com/speech-to-text/docs/languages
			enableWordTimeOffsets: true,
			enableAutomaticPunctuation: true,
			...options,
		},
		audio: {
			uri: `gs://${process.env.AUDIO_BUCKET}/${filename}`,
		},
	});

	return operation.latestResponse.name;
}

async function getSpeechToTextOp(name) {
	// using the cloud speech api isn't super easy, but this method is: https://github.com/googleapis/nodejs-speech/issues/10#issuecomment-415900469
	const auth = await google.auth.getClient({
		scopes: ['https://www.googleapis.com/auth/cloud-platform'],
	});
	const { data } = await google.speech('v1').operations.get({ auth, name });
	// documentation for operations response: https://cloud.google.com/speech-to-text/docs/reference/rest/v1/operations
	// documentation for the response.results field (determined by the speech to text api in this case) https://cloud.google.com/speech-to-text/docs/basics#responses
	const { done, response, error } = data;

	if (error) {
		console.error('OP ERROR', error.details);
		throw new ServerError(error.message);
	}
	if (response) {
		return { done, results: response.results };
	}
	return { done };
}

function getLanuageCodes() {
	return [
		{ value: 'en-US', display: 'English (American)' },
		{ value: 'en-GB', display: 'English (British)' },
		{ value: 'en-CA', display: 'English (Canada)' },
		{ value: 'en-AU', display: 'English (Australia)' },
		{ value: 'es-MX', display: 'Español (México)' },
		{ value: 'es-ES', display: 'Español (España)' },
		{ value: 'fr-FR', display: 'French' },
		{ value: 'de-DE', display: 'German' },
		{ value: 'hi-IN', display: 'Hindi' },
		{ value: 'it-IT', display: 'Italian' },
	];
}

module.exports = {
	getSignedUrl,
	deleteFile,
	initSpeechToTextOp,
	getSpeechToTextOp,
	getLanuageCodes,
};
