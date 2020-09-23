const { TranscriptionJobType } = require('./transcription.graphql');
const TranscriptionMutations = require('./transcription-mutations.graphql');
const createTranscriptionModel = require('./transcription.model');

module.exports = { TranscriptionJobType, createTranscriptionModel, TranscriptionMutations };
