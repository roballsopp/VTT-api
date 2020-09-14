const createGCPModel = require('./gcp.model');
const { LanguageCodeType } = require('./language-code.graphql');
const { SpeechToTextOpType } = require('./speech-to-text-op.graphql');
const GCPMutations = require('./gcp-mutations.graphql');

module.exports = { createGCPModel, LanguageCodeType, SpeechToTextOpType, GCPMutations };
