const Sentry = require('@sentry/node');
const { GraphQLNonNull, GraphQLObjectType, GraphQLString } = require('graphql');
const { ForbiddenError } = require('../errors');
const { TranscriptionJobType } = require('./transcription.graphql');
const { UserType } = require('../user');

module.exports = {
	beginTranscription: {
		type: GraphQLNonNull(
			new GraphQLObjectType({
				name: 'BeginTranscriptionResponse',
				fields: () => ({
					job: { type: GraphQLNonNull(TranscriptionJobType) },
				}),
			})
		),
		description: 'Returns a transcription job object with a speech to text operation id',
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
			const job = await ctx.models.transcription.create(ctx.user['cognito:username'], operationId, filename, cost);

			return { job, operationId };
		},
	},
	failTranscription: {
		type: GraphQLNonNull(
			new GraphQLObjectType({
				name: 'FailTranscriptionResponse',
				fields: () => ({
					job: { type: GraphQLNonNull(TranscriptionJobType) },
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
			const job = await ctx.models.transcription.fail(ctx.user['cognito:username'], operationId);
			// this isn't that important for ux, so don't die if delete fails for some reason
			ctx.models.gcp.deleteFile(job.fileKey).catch(Sentry.captureException);
			return { job };
		},
	},
	finishTranscription: {
		type: GraphQLNonNull(
			new GraphQLObjectType({
				name: 'FinishTranscriptionResponse',
				fields: () => ({
					job: { type: GraphQLNonNull(TranscriptionJobType) },
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
			const job = await ctx.models.transcription.finish(ctx.user['cognito:username'], operationId);
			const user = await ctx.models.user.applyTranscriptionFee(job.userId, job.cost);
			// this isn't that important for ux, so don't die if delete fails for some reason
			ctx.models.gcp.deleteFile(job.fileKey).catch(Sentry.captureException);
			return { job, user };
		},
	},
};
