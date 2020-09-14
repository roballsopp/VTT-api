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
			const { access_token } = await ctx.models.paypal.getAccessToken();
			const order = await ctx.models.paypal.getOrder(orderId, access_token);
			return ctx.models.user.addCredit(ctx.user['cognito:username'], Number(order.purchase_units[0].amount.value));
		},
	},
};
