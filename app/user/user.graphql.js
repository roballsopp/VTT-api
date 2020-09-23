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
		id: { type: GraphQLNonNull(GraphQLID), resolve: u => u.sub },
		email: { type: GraphQLNonNull(GraphQLString) },
		emailVerified: { type: GraphQLNonNull(GraphQLBoolean), resolve: u => u.email_verified === 'true' },
		credit: { type: GraphQLNonNull(GraphQLFloat), resolve: u => Number(u['custom:credit'] || 0) },
		lastOrderDate: { type: GraphQLDateTime, resolve: u => u['custom:last_order_date'] },
	}),
});
