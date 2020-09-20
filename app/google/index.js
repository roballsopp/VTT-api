const createGCPModel = require('./gcp.model');
const { LanguageCodeType } = require('./language-code.graphql');
const { SpeechToTextOpType } = require('./speech-to-text-op.graphql');

module.exports = { createGCPModel, LanguageCodeType, SpeechToTextOpType };
