const {
	GraphQLObjectType,
	GraphQLNonNull,
	GraphQLList,
	GraphQLString,
	GraphQLFloat,
	GraphQLBoolean,
} = require('graphql');

module.exports.SpeechToTextOpType = new GraphQLObjectType({
	name: 'SpeechToTextOp',
	fields: () => ({
		done: { type: GraphQLNonNull(GraphQLBoolean) },
		results: { type: GraphQLList(GraphQLNonNull(SpeechRecognitionResultType)) },
	}),
});

const SpeechRecognitionResultType = new GraphQLObjectType({
	name: 'SpeechRecognitionResult',
	fields: () => ({
		alternatives: { type: GraphQLNonNull(GraphQLList(GraphQLNonNull(SpeechRecognitionAlternativeType))) },
	}),
});

const SpeechRecognitionAlternativeType = new GraphQLObjectType({
	name: 'SpeechRecognitionAlternative',
	fields: () => ({
		confidence: { type: GraphQLNonNull(GraphQLFloat) },
		transcript: { type: GraphQLNonNull(GraphQLString) },
		words: { type: GraphQLNonNull(GraphQLList(GraphQLNonNull(SpeechRecognitionWordType))) },
	}),
});

const SpeechRecognitionWordType = new GraphQLObjectType({
	name: 'SpeechRecognitionWord',
	fields: () => ({
		startTime: {
			type: GraphQLNonNull(GraphQLFloat),
			description: 'in seconds from the beginning of the audio',
			resolve: t => {
				// startTime.seconds and endTime.seconds come back from google as this weird `Long` data type: https://github.com/dcodeIO/long.js
				// github comment about it: https://github.com/googleapis/nodejs-speech/issues/417#issuecomment-517806650
				return t.startTime.seconds.toNumber() + t.startTime.nanos / 1000000000;
			},
		},
		endTime: {
			type: GraphQLNonNull(GraphQLFloat),
			description: 'in seconds from the beginning of the audio',
			resolve: t => {
				return t.endTime.seconds.toNumber() + t.endTime.nanos / 1000000000;
			},
		},
		word: { type: GraphQLNonNull(GraphQLString), description: 'A string of the word, e.g. "cool"' },
	}),
});
