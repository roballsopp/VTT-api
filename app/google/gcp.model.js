const moment = require('moment');
const { Storage } = require('@google-cloud/storage');
const { SpeechClient } = require('@google-cloud/speech');
const { ServerError } = require('../errors');
const wave = require('../wave');

const speech = new SpeechClient();

const storage = new Storage();
const audioBucket = storage.bucket(process.env.AUDIO_BUCKET);

const SPEECH_TO_TEXT_COST_PER_MINUTE = 0.15; // $0.15 per minute

async function getSignedUrl(filename) {
	const file = audioBucket.file(filename);

	const [url] = await file.getSignedUrl({
		action: 'write',
		version: 'v4',
		expires: moment()
			.add(10, 'minutes')
			.toISOString(),
	});

	return url;
}

async function getFileBytes(filename, start, end) {
	const file = audioBucket.file(filename);
	const readable = await file.createReadStream({ start, end });
	const chunks = [];
	for await (let chunk of readable) {
		chunks.push(chunk);
	}
	return Buffer.concat(chunks);
}

async function getSpeechToTextCost(filename) {
	// data chunk could appear anywhere, but its probably within the first kb.
	const { duration } = await getFileBytes(filename, { start: 0, end: 1024 }).then(wave.getInfo);
	// round up to next whole cent
	return Math.ceil((duration / 60) * SPEECH_TO_TEXT_COST_PER_MINUTE * 100) / 100;
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
	// The not very descriptive api documentation: https://googleapis.dev/nodejs/speech/latest/v1.SpeechClient.html#checkLongRunningRecognizeProgress
	// Slightly more illuminating: https://cloud.google.com/speech-to-text/docs/reference/rest/v1/operations
	const { done = false, error, result } = await speech.checkLongRunningRecognizeProgress(name);

	if (error) {
		console.error('OP ERROR', error.details);
		throw new ServerError(error.message);
	}
	if (result) {
		return { done: done || false, results: result.results };
	}
	return { done: done || false };
}

function getLanguageCodes() {
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

module.exports = function createGCPModel() {
	return {
		getSignedUrl,
		getSpeechToTextCost,
		deleteFile,
		initSpeechToTextOp,
		getSpeechToTextOp,
		getLanguageCodes,
	};
};
