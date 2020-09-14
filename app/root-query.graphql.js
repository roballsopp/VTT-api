const { GraphQLNonNull, GraphQLList, GraphQLObjectType, GraphQLString } = require('graphql');
const { UserType } = require('./user');
const { LanguageCodeType, SpeechToTextOpType } = require('./google');

module.exports = new GraphQLObjectType({
	name: 'RootQuery',
	fields: () => ({
		self: {
			type: GraphQLNonNull(UserType),
			resolve: (_, args, ctx) => ctx.models.user.findById(ctx.user['cognito:username']),
		},
		supportedLanguages: {
			type: GraphQLNonNull(GraphQLList(GraphQLNonNull(LanguageCodeType))),
			resolve: (_, args, ctx) => ctx.models.gcp.getLanguageCodes(),
		},
		speechToTextOp: {
			type: GraphQLNonNull(SpeechToTextOpType),
			args: {
				operationId: {
					type: GraphQLNonNull(GraphQLString),
					description: 'The operation id for the speech to text operation',
				},
			},
			resolve: (_, args, ctx) => {
				const { operationId } = args;
				return ctx.models.gcp.getSpeechToTextOp(operationId);
			},
		},
		uploadUrl: {
			type: GraphQLNonNull(UploadUrlType),
			resolve: async (_, args, ctx) => {
				const filename = `${ctx.user['cognito:username']}/${Date.now()}`;
				const url = await ctx.models.gcp.getSignedUrl(filename);
				return { filename, url };
			},
		},
	}),
});

const UploadUrlType = new GraphQLObjectType({
	name: 'UploadUrl',
	fields: () => ({
		filename: { type: GraphQLNonNull(GraphQLString) },
		url: { type: GraphQLNonNull(GraphQLString) },
	}),
});
