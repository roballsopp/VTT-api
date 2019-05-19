const moment = require('moment');
const { Storage } = require('@google-cloud/storage');
const Speech = require('@google-cloud/speech');

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

const speech = new Speech.SpeechClient();

async function getTextFromSpeech(filename, options = {}) {
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
	// Get a Promise representation of the final result of the job
	const [response] = await operation.promise();
	console.log("HI", response.results);
	const transcription = response.results
		.map(result => result.alternatives[0].transcript)
		.join('\n');
	console.log(`Transcription: ${transcription}`);
}

module.exports = {
	getSignedUrl,
	getTextFromSpeech,
};
