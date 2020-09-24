const {
	GraphQLObjectType,
	GraphQLNonNull,
	GraphQLID,
	GraphQLFloat,
	GraphQLString,
	GraphQLBoolean,
} = require('graphql');
const { GraphQLDateTime } = require('graphql-iso-date');

module.exports.UserType = new GraphQLObjectType({
	name: 'User',
	fields: () => ({
		id: { type: GraphQLNonNull(GraphQLID) },
		email: { type: GraphQLNonNull(GraphQLString) },
		credit: { type: GraphQLNonNull(GraphQLFloat) },
		unlimitedUsage: { type: GraphQLNonNull(GraphQLBoolean) },
		lastOrderDate: { type: GraphQLDateTime },
	}),
});
