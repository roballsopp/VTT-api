const request = require('supertest');
const { expect, assert, spy } = require('chai');

describe('Transcription mutations:', function() {
	describe('beginTranscription, when the user cannot afford the job', function() {
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
		it('returns a 500 error', async function() {
			expect(this.result.statusCode).to.equal(501);
		});

		it('returns an error message that explains the user cannot afford the job', async function() {
			expect(this.result.body.errors).to.have.lengthOf(1);
			expect(this.result.body.errors[0].message).to.equal('Cannot afford job');
		});
	});

	describe('beginTranscription, when the user can afford the job', function() {
		before(async function() {
			await this.sequelize.model('transcriptionJobs').destroy({ where: {} });

			this.expectedOpId = '09867';
			this.expectedDuration = 20;
			this.expectedFilename = 'neat_file_in_bucket';

			this.mockGcpModel = {
				getAudioInfo: () => ({ duration: this.expectedDuration }),
				initSpeechToTextOp: () => this.expectedOpId,
				deleteFile: spy(() => Promise.resolve()),
			};

			await this.updateTestUser({ credit: '10.00' });

			this.server = this.createServer({ gcp: this.mockGcpModel });

			const { statusCode, body } = await request(this.server)
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

			this.beginResult = body.data.beginTranscription;
		});

		it('returns a job with an id', async function() {
			assert.isOk(this.beginResult.job.id);
		});

		it('returns the expected file key', async function() {
			expect(this.beginResult.job.fileKey).to.equal(this.expectedFilename);
		});

		it('calculates the correct cost', async function() {
			// at $0.15 per minute, and 20 seconds duration, the charge is:
			// Math.ceil((20 / 60) * 0.15 * 100) / 100
			expect(this.beginResult.job.cost).to.equal(0.05);
		});

		it('sets the job to a `pending` state', async function() {
			expect(this.beginResult.job.state).to.equal('pending');
		});

		it('returns an operation id', async function() {
			expect(this.beginResult.job.operationId).to.equal(this.expectedOpId);
		});

		it('returns the correct user', async function() {
			expect(this.beginResult.job.user.id).to.equal(this.testUserId);
		});

		it('does not charge the user yet', async function() {
			expect(this.beginResult.job.user.credit).to.equal(10);
		});

		describe('finishTranscription', function() {
			before(async function() {
				const { statusCode, body } = await request(this.server)
					.post('/graphql')
					.send({
						query: `mutation finishTranscription($operationId: String!) {
							finishTranscription(operationId: $operationId) {
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
						variables: { operationId: this.expectedOpId },
					})
					.set('Authorization', `Bearer ${this.testUserToken}`);

				if (statusCode !== 200) throw new Error(`Error finishing transcription: ${body.errors}`);

				this.finishResult = body.data.finishTranscription;
			});

			it('returns the same job id as before', async function() {
				expect(this.finishResult.job.id).to.equal(this.beginResult.job.id);
			});

			it('returns the same file key as before', async function() {
				expect(this.finishResult.job.fileKey).to.equal(this.expectedFilename);
			});

			it('returns the correct cost', async function() {
				expect(this.finishResult.job.cost).to.equal(0.05);
			});

			it('returns the correct user', async function() {
				expect(this.finishResult.job.user.id).to.equal(this.testUserId);
			});

			it('correctly charges the user', async function() {
				expect(this.finishResult.job.user.credit).to.equal(9.95);
			});

			it('sets the job to a `success` state', async function() {
				expect(this.finishResult.job.state).to.equal('success');
			});

			it('returns the previous operation id', async function() {
				expect(this.finishResult.job.operationId).to.equal(this.expectedOpId);
			});

			it('cleans up the transcription file when done', async function() {
				expect(this.mockGcpModel.deleteFile).to.have.been.called.with(this.expectedFilename);
			});
		});
	});

	describe('beginTranscription, when the user has an unlimited usage account', function() {
		before(async function() {
			await this.sequelize.model('transcriptionJobs').destroy({ where: {} });

			this.expectedOpId = '09867';
			this.expectedDuration = 20;
			this.expectedFilename = 'neat_file_in_bucket';

			this.mockGcpModel = {
				getAudioInfo: () => ({ duration: this.expectedDuration }),
				initSpeechToTextOp: () => this.expectedOpId,
				deleteFile: spy(() => Promise.resolve()),
			};

			await this.updateTestUser({ credit: '0', unlimited_usage: '1' });

			this.server = this.createServer({ gcp: this.mockGcpModel });

			const { statusCode, body } = await request(this.server)
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

			this.beginResult = body.data.beginTranscription;
		});

		it('returns a job with an id', async function() {
			assert.isOk(this.beginResult.job.id);
		});

		it('returns the expected file key', async function() {
			expect(this.beginResult.job.fileKey).to.equal(this.expectedFilename);
		});

		it('calculates the correct cost', async function() {
			expect(this.beginResult.job.cost).to.equal(Math.ceil((this.expectedDuration / 60) * 0.15 * 100) / 100);
		});

		it('sets the job to a `pending` state', async function() {
			expect(this.beginResult.job.state).to.equal('pending');
		});

		it('returns an operation id', async function() {
			expect(this.beginResult.job.operationId).to.equal(this.expectedOpId);
		});

		it('returns the correct user', async function() {
			expect(this.beginResult.job.user.id).to.equal(this.testUserId);
		});

		it('does not charge the user', async function() {
			expect(this.beginResult.job.user.credit).to.equal(0);
		});

		describe('finishTranscription', function() {
			before(async function() {
				const { statusCode, body } = await request(this.server)
					.post('/graphql')
					.send({
						query: `mutation finishTranscription($operationId: String!) {
							finishTranscription(operationId: $operationId) {
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
						variables: { operationId: this.expectedOpId },
					})
					.set('Authorization', `Bearer ${this.testUserToken}`);

				if (statusCode !== 200) throw new Error(`Error finishing transcription: ${body.errors}`);

				this.finishResult = body.data.finishTranscription;
			});

			it('returns the same job id as before', async function() {
				expect(this.finishResult.job.id).to.equal(this.beginResult.job.id);
			});

			it('returns the same file key as before', async function() {
				expect(this.finishResult.job.fileKey).to.equal(this.expectedFilename);
			});

			it('returns the correct cost', async function() {
				expect(this.finishResult.job.cost).to.equal(0.05);
			});

			it('returns the correct user', async function() {
				expect(this.finishResult.job.user.id).to.equal(this.testUserId);
			});

			it('still does not charge the user', async function() {
				expect(this.finishResult.job.user.credit).to.equal(0);
			});

			it('sets the job to a `success` state', async function() {
				expect(this.finishResult.job.state).to.equal('success');
			});

			it('returns the previous operation id', async function() {
				expect(this.finishResult.job.operationId).to.equal(this.expectedOpId);
			});

			it('cleans up the transcription file when done', async function() {
				expect(this.mockGcpModel.deleteFile).to.have.been.called.with(this.expectedFilename);
			});
		});
	});
});
