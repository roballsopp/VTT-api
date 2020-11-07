const { GraphQLObjectType } = require('graphql');
const { PaypalMutations } = require('./paypal');
const { TranscriptionMutations } = require('./transcriptions');
const { UserMutations } = require('./user');

module.exports = new GraphQLObjectType({
	name: 'RootMutation',
	fields: {
		...PaypalMutations,
		...TranscriptionMutations,
		...UserMutations,
	},
});
