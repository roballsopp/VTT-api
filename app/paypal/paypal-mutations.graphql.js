const { GraphQLNonNull, GraphQLObjectType, GraphQLString, GraphQLFloat } = require('graphql');

module.exports = {
	createPaypalOrder: {
		type: GraphQLNonNull(
			new GraphQLObjectType({
				name: 'CreatePaypalOrderResponse',
				fields: () => ({
					orderId: { type: GraphQLNonNull(GraphQLString) },
				}),
			})
		),
		description: 'Create a paypal order',
		args: {
			purchaseAmt: {
				type: GraphQLNonNull(GraphQLFloat),
				description: 'The usd dollar amount of the purchase',
			},
		},
		resolve: async (_, args, ctx) => {
			const { purchaseAmt } = args;
			return ctx.models.paypal.createOrder(ctx.user['cognito:username'], purchaseAmt);
		},
	},
};
