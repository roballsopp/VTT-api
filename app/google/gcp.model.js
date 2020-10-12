const moment = require('moment');
const { ServerError } = require('../errors');
const wave = require('../wave');
const { AUDIO_BUCKET } = require('../config');

module.exports = function createGCPModel({ speechClient, storageClient }) {
	const audioBucket = storageClient.bucket(AUDIO_BUCKET);

	return {
		getSignedUrl,
		getAudioInfo,
		deleteFile,
		initSpeechToTextOp,
		getSpeechToTextOp,
		getLanguageCodes,
	};

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

	async function getAudioInfo(filename) {
		// data chunk could appear anywhere, but its probably within the first kb.
		return getFileBytes(filename, { start: 0, end: 1024 }).then(wave.getInfo);
	}

	async function deleteFile(filename) {
		// docs: https://cloud.google.com/nodejs/docs/reference/storage/2.5.x/File#delete
		return audioBucket.file(filename).delete();
	}

	async function initSpeechToTextOp(filename, options = {}) {
		const [operation] = await speechClient.longRunningRecognize({
			config: {
				encoding: 'LINEAR16', // LINEAR16 is PCM at bit depth 16, https://cloud.google.com/speech-to-text/docs/encoding
				// sampleRateHertz: 44100, // omit to automatically set
				languageCode: 'en-US', // en-US (american english), en-GB (british english), ...https://cloud.google.com/speech-to-text/docs/languages
				enableWordTimeOffsets: true,
				enableAutomaticPunctuation: true,
				...options,
			},
			audio: {
				uri: `gs://${AUDIO_BUCKET}/${filename}`,
			},
		});

		return operation.latestResponse.name;
	}

	async function getSpeechToTextOp(name) {
		// The not very descriptive api documentation: https://googleapis.dev/nodejs/speech/latest/v1.SpeechClient.html#checkLongRunningRecognizeProgress
		// Slightly more illuminating: https://cloud.google.com/speech-to-text/docs/reference/rest/v1/operations
		const { done = false, error, result } = await speechClient.checkLongRunningRecognizeProgress(name);

		if (error) {
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
			{ value: 'en-AU', display: 'English (Australia)' },
			{ value: 'en-GB', display: 'English (British)' },
			{ value: 'en-CA', display: 'English (Canada)' },
			{ value: 'en-IE', display: 'English (Ireland)' },
			{ value: 'es-ES', display: 'Español (España)' },
			{ value: 'es-MX', display: 'Español (México)' },
			{ value: 'fr-FR', display: 'French' },
			{ value: 'de-DE', display: 'German' },
			{ value: 'hi-IN', display: 'Hindi' },
			{ value: 'it-IT', display: 'Italian' },
			{ value: 'ja-JP', display: 'Japanese' },
		];
	}
};
