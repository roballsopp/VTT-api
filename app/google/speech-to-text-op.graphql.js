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
		startTime: { type: GraphQLNonNull(GraphQLString), description: 'A string in the form "1.300s"' },
		endTime: { type: GraphQLNonNull(GraphQLString), description: 'A string in the form "1.400s"' },
		word: { type: GraphQLNonNull(GraphQLString), description: 'A string of the word, e.g. "cool"' },
	}),
});
