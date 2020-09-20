const Sentry = require('@sentry/node');
const { GraphQLNonNull, GraphQLObjectType, GraphQLString } = require('graphql');
const { ForbiddenError } = require('../errors');
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
	beginTranscription: {
		type: GraphQLNonNull(
			new GraphQLObjectType({
				name: 'BeginTranscriptionResponse',
				fields: () => ({
					user: { type: GraphQLNonNull(UserType) },
					operationId: { type: GraphQLNonNull(GraphQLString) },
				}),
			})
		),
		description: 'Returns a speech to text operation id',
		args: {
			filename: {
				type: GraphQLNonNull(GraphQLString),
				description: 'The name/key of the audio file in the cloud storage bucket to begin processing.',
			},
			languageCode: {
				type: GraphQLString,
				description: 'Optionally specify to spoken language in the audio file.',
			},
		},
		resolve: async (_, args, ctx) => {
			const { filename, languageCode } = args;

			const [cost, credit] = await Promise.all([
				ctx.models.gcp.getSpeechToTextCost(filename),
				ctx.models.user.getCredit(ctx.user['cognito:username']),
			]);

			if (cost > credit) throw new ForbiddenError('Cannot afford job');

			const options = {};
			if (languageCode) {
				options.languageCode = languageCode;
			}
			const operationId = await ctx.models.gcp.initSpeechToTextOp(filename, options);
			const user = await ctx.models.user.initTranscription(ctx.user['cognito:username'], operationId, filename, cost);

			return { user, operationId };
		},
	},
	failTranscription: {
		type: GraphQLNonNull(
			new GraphQLObjectType({
				name: 'FailTranscriptionResponse',
				fields: () => ({
					user: { type: GraphQLNonNull(UserType) },
				}),
			})
		),
		description: 'Sets the transcription jobs state to `error` and cleans up transcription files',
		args: {
			operationId: {
				type: GraphQLNonNull(GraphQLString),
				description: 'The id of the transcription operation',
			},
		},
		resolve: async (_, args, ctx) => {
			const { operationId } = args;
			const user = await ctx.models.user.failTranscription(ctx.user['cognito:username'], operationId);
			// this isn't that important for ux, so don't die if delete fails for some reason
			ctx.models.gcp.deleteFile(user['custom:transcription_file']).catch(Sentry.captureException);
			return { user };
		},
	},
	finishTranscription: {
		type: GraphQLNonNull(
			new GraphQLObjectType({
				name: 'FinishTranscriptionResponse',
				fields: () => ({
					user: { type: GraphQLNonNull(UserType) },
				}),
			})
		),
		description: 'Deducts credit from users account and cleans up transcription files in bucket',
		args: {
			operationId: {
				type: GraphQLNonNull(GraphQLString),
				description: 'The id of the transcription operation',
			},
		},
		resolve: async (_, args, ctx) => {
			const { operationId } = args;
			const user = await ctx.models.user.finishTranscription(ctx.user['cognito:username'], operationId);
			// this isn't that important for ux, so don't die if delete fails for some reason
			ctx.models.gcp.deleteFile(user['custom:transcription_file']).catch(Sentry.captureException);
			return { user };
		},
	},
};
