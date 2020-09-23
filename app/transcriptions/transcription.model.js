const { ForbiddenError, BadRequestError } = require('../errors');
const { SPEECH_TO_TEXT_COST_PER_MINUTE, GET_TOTAL_S2T_JOB_COST } = require('../config');

module.exports = function createTranscriptionModel({ sequelize }) {
	const transcriptionJobsTable = sequelize.model('transcriptionJobs');

	async function findById(id) {
		return transcriptionJobsTable.findOne({ where: { id } });
	}

	async function findPending(userId, operationId) {
		return transcriptionJobsTable.findOne({ where: { userId, operationId, state: 'pending' } });
	}

	async function create(userId, operationId, fileKey, fileDuration) {
		if (!userId) throw new ForbiddenError('Missing session user.');
		return transcriptionJobsTable.create({
			userId,
			operationId,
			state: 'pending',
			fileKey,
			fileDuration,
			pricePerMin: SPEECH_TO_TEXT_COST_PER_MINUTE,
			cost: GET_TOTAL_S2T_JOB_COST(fileDuration),
		});
	}

	async function fail(userId, operationId) {
		return transcriptionJobsTable.findOne({ where: { userId, operationId, state: 'pending' } }).then(job => {
			if (!job) {
				throw new BadRequestError(
					`Cannot fail transcription, no pending job found for user: ${userId} and operation ${operationId}`
				);
			}
			return job.update({ state: 'error' });
		});
	}

	async function finish(userId, operationId) {
		return transcriptionJobsTable.findOne({ where: { userId, operationId, state: 'pending' } }).then(job => {
			if (!job) {
				throw new BadRequestError(
					`Cannot finish transcription, no pending job found for user: ${userId} and operation ${operationId}`
				);
			}
			return job.update({ state: 'success' });
		});
	}

	return { findById, findPending, create, fail, finish };
};
