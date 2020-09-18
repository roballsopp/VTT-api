const { GraphQLNonNull, GraphQLString, GraphQLFloat } = require('graphql');
const { UserType } = require('./user.graphql');
const { BadRequestError } = require('../errors');

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
	deductCredit: {
		type: GraphQLNonNull(UserType),
		description: 'Deducts credit',
		args: {
			credit: {
				type: GraphQLNonNull(GraphQLFloat),
				description: 'The amount to deduct in USD',
			},
		},
		resolve: async (_, args, ctx) => {
			const { credit } = args;
			if (credit < 0) throw new BadRequestError('`credit` must be a positive number');
			return ctx.models.user.changeCredit(ctx.user['cognito:username'], -credit);
		},
	},
};
