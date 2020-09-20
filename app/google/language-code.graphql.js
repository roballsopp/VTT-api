const { GraphQLObjectType, GraphQLNonNull, GraphQLString } = require('graphql');

module.exports.LanguageCodeType = new GraphQLObjectType({
	name: 'LanguageCode',
	fields: () => ({
		value: { type: GraphQLNonNull(GraphQLString) },
		display: { type: GraphQLNonNull(GraphQLString) },
	}),
});
