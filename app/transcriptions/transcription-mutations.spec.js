const request = require('supertest');
const { expect, assert } = require('chai');

describe('beginTranscription mutation', function() {
	describe('when the user cannot afford the job', function() {
		before(async function() {
			this.expectedOpId = '09867';
			this.expectedDuration = 20;
			this.expectedFilename = 'neat_file_in_bucket';

			const mockGcpModel = {
				getAudioInfo: () => ({ duration: this.expectedDuration }),
				initSpeechToTextOp: () => this.expectedOpId,
			};

			const server = this.createServer({ gcp: mockGcpModel });

			this.result = await request(server)
				.post('/graphql')
				.send({
					query: `mutation beginTranscription($filename: String!, $languageCode: String!) {
					beginTranscription(filename: $filename, languageCode: $languageCode) {
						job {
							id
							user {
								id
							}
							operationId
							state
						}
					}
				}`,
					variables: { filename: this.expectedFilename, languageCode: 'en-US' },
				})
				.set('Authorization', `Bearer ${this.testUserToken}`);
		});

		// TODO: the failure actually throws a ForbiddenError, but graphql returns a 500
		it('a 500 error is returned', async function() {
			expect(this.result.statusCode).to.equal(500);
		});

		it('the error message explains the user cannot afford the job', async function() {
			expect(this.result.body.errors).to.have.lengthOf(1);
			expect(this.result.body.errors[0].message).to.equal('Cannot afford job');
		});
	});

	describe('when the user can afford the job', function() {
		before(async function() {
			this.expectedOpId = '09867';
			this.expectedDuration = 20;
			this.expectedFilename = 'neat_file_in_bucket';

			const mockGcpModel = {
				getAudioInfo: () => ({ duration: this.expectedDuration }),
				initSpeechToTextOp: () => this.expectedOpId,
			};

			await this.updateTestUser({ credit: '10.00' });

			const server = this.createServer({ gcp: mockGcpModel });

			const { statusCode, body } = await request(server)
				.post('/graphql')
				.send({
					query: `mutation beginTranscription($filename: String!, $languageCode: String!) {
						beginTranscription(filename: $filename, languageCode: $languageCode) {
							job {
								id
								fileKey
								cost
								createdAt
								operationId
								state
								user {
									id
									credit
								}
							}
						}
					}`,
					variables: { filename: this.expectedFilename, languageCode: 'en-US' },
				})
				.set('Authorization', `Bearer ${this.testUserToken}`);

			if (statusCode !== 200) throw new Error(`Error starting transcription: ${body.errors}`);

			this.result = body.data.beginTranscription;
		});

		it('returns a job with an id', async function() {
			assert.isOk(this.result.job.id);
		});

		it('returns the expected file key', async function() {
			expect(this.result.job.fileKey).to.equal(this.expectedFilename);
		});

		it('calculates the correct cost', async function() {
			expect(this.result.job.cost).to.equal(Math.ceil((this.expectedDuration / 60) * 0.15 * 100) / 100);
		});

		it('sets the job to a `pending` state', async function() {
			expect(this.result.job.state).to.equal('pending');
		});

		it('returns an operation id', async function() {
			expect(this.result.job.operationId).to.equal(this.expectedOpId);
		});

		it('returns the correct user', async function() {
			expect(this.result.job.user.id).to.equal(this.testUserId);
		});

		it('does not charge the user yet', async function() {
			expect(this.result.job.user.credit).to.equal(10);
		});
	});
});
