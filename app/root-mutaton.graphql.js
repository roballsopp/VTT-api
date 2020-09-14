const { GraphQLObjectType } = require('graphql');
const { GCPMutations } = require('./google');
const { UserMutations } = require('./user');

module.exports = new GraphQLObjectType({
	name: 'RootMutation',
	fields: {
		...GCPMutations,
		...UserMutations,
	},
});
