const { GraphQLNonNull, GraphQLString, GraphQLBoolean } = require('graphql');

module.exports = {
	createSpeechToTextOp: {
		type: GraphQLNonNull(GraphQLString),
		description: 'Returns a speech to text operation id',
		args: {
			filename: {
				type: GraphQLNonNull(GraphQLString),
				description: 'The name/key of the audio file in the cloud storage bucket to begin processing.',
			},
			languageCode: {
				type: GraphQLString,
				description: 'Optionally specify to spoken language in the audio file.',
			},
		},
		resolve: (_, args, ctx) => {
			const { filename, languageCode } = args;
			const options = {};
			if (languageCode) {
				options.languageCode = languageCode;
			}
			return ctx.models.gcp.initSpeechToTextOp(filename, options);
		},
	},
	deleteFile: {
		type: GraphQLNonNull(GraphQLBoolean),
		description: 'Returns true',
		args: {
			filename: {
				type: GraphQLNonNull(GraphQLString),
				description: 'The name/key of the audio file in the cloud storage bucket to delete.',
			},
		},
		resolve: async (_, args, ctx) => {
			const { filename } = args;
			await ctx.models.gcp.deleteFile(filename);
			return true;
		},
	},
};
