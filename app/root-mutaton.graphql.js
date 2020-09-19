const { GraphQLObjectType } = require('graphql');
const { UserMutations } = require('./user');

module.exports = new GraphQLObjectType({
	name: 'RootMutation',
	fields: {
		...UserMutations,
	},
});
