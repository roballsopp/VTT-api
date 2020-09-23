const { GraphQLNonNull, GraphQLString } = require('graphql');
const { UserType } = require('./user.graphql');

module.exports = {
	applyCreditFromPaypal: {
		type: GraphQLNonNull(UserType),
		description: 'Applies credit from a particular paypal order',
		args: {
			orderId: {
				type: GraphQLNonNull(GraphQLString),
				description: 'The id of the paypal order to apply credit from',
			},
		},
		resolve: async (_, args, ctx) => {
			const { orderId } = args;
			return ctx.models.user.addCreditFromOrder(ctx.user['cognito:username'], orderId);
		},
	},
};
