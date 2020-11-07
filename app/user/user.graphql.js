const {
	GraphQLObjectType,
	GraphQLNonNull,
	GraphQLID,
	GraphQLFloat,
	GraphQLString,
	GraphQLBoolean,
} = require('graphql');

module.exports.UserType = new GraphQLObjectType({
	name: 'User',
	fields: () => ({
		id: { type: GraphQLNonNull(GraphQLID) },
		email: { type: GraphQLNonNull(GraphQLString) },
		credit: { type: GraphQLNonNull(GraphQLFloat) },
		unlimitedUsage: { type: GraphQLNonNull(GraphQLBoolean) },
	}),
});
