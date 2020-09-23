const { GraphQLObjectType, GraphQLNonNull, GraphQLID, GraphQLFloat, GraphQLString } = require('graphql');
const { GraphQLDateTime } = require('graphql-iso-date');
const { UserType } = require('../user');

module.exports.TranscriptionJobType = new GraphQLObjectType({
	name: 'TranscriptionJob',
	fields: () => ({
		id: { type: GraphQLNonNull(GraphQLID) },
		user: {
			type: GraphQLNonNull(UserType),
			resolve: async (tJob, args, ctx) => {
				return ctx.models.user.findById(tJob.userId);
			},
		},
		fileKey: { type: GraphQLNonNull(GraphQLString) },
		cost: { type: GraphQLNonNull(GraphQLFloat) },
		createdAt: { type: GraphQLNonNull(GraphQLDateTime) },
		operationId: { type: GraphQLNonNull(GraphQLString) },
		state: {
			type: GraphQLNonNull(GraphQLString),
			description: 'Can be either `success`, `error`, or `pending`',
		},
	}),
});
