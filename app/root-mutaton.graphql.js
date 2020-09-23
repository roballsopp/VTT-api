const { GraphQLObjectType } = require('graphql');
const { UserMutations } = require('./user');
const { TranscriptionMutations } = require('./transcriptions');

module.exports = new GraphQLObjectType({
	name: 'RootMutation',
	fields: {
		...TranscriptionMutations,
		...UserMutations,
	},
});
