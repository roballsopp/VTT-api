const request = require('supertest');
const { v4: uuid } = require('uuid');
const { expect, assert } = require('chai');

describe('Transcription mutations:', function() {
	describe('beginTranscription, when the user cannot afford the job', function() {
		before(async function() {
			this.expectedOpId = uuid();
			this.expectedDuration = 20;
			this.expectedFilename = 'neat_file_in_bucket';

			this.mockGCP.setFileInstance({ name: this.expectedFilename, audioDuration: this.expectedDuration });

			const server = this.createServer();

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
		it('returns a 500 error', function() {
			expect(this.result.statusCode).to.equal(500);
		});

		it('returns an error message that explains the user cannot afford the job', function() {
			expect(this.result.body.errors).to.have.lengthOf(1);
			expect(this.result.body.errors[0].message).to.equal('Cannot afford job');
		});

		it('does not add a record to the database', async function() {
			const job = await this.sequelize
				.model('transcriptionJobs')
				.findOne({ where: { operationId: this.expectedOpId } });
			assert.isNotOk(job, "Found job when we shouldn't have");
		});
	});

	describe('beginTranscription, when the user can afford the job', function() {
		before(async function() {
			await this.sequelize.model('transcriptionJobs').destroy({ where: {} });

			this.expectedOpId = '09867';
			this.expectedDuration = 20;
			this.expectedFilename = 'neat_file_in_bucket';

			this.mockGCP.setLongRunningRecognizeResponse({ operationId: this.expectedOpId });
			this.mockGCP.setFileInstance({ name: this.expectedFilename, audioDuration: this.expectedDuration });

			await this.updateTestUser({ credit: '10.00' });

			this.server = this.createServer();

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

		it('returns a job with an id', function() {
			assert.isOk(this.beginResult.job.id);
		});

		it('returns the expected file key', function() {
			expect(this.beginResult.job.fileKey).to.equal(this.expectedFilename);
		});

		it('calculates the correct cost', function() {
			// at $0.15 per minute, and 20 seconds duration, the charge is:
			// Math.ceil((20 / 60) * 0.15 * 100) / 100
			expect(this.beginResult.job.cost).to.equal(0.05);
		});

		it('sets the job to a `pending` state', function() {
			expect(this.beginResult.job.state).to.equal('pending');
		});

		it('returns an operation id', function() {
			expect(this.beginResult.job.operationId).to.equal(this.expectedOpId);
		});

		it('returns the correct user', function() {
			expect(this.beginResult.job.user.id).to.equal(this.testUserId);
		});

		it('does not charge the user yet', function() {
			expect(this.beginResult.job.user.credit).to.equal(10);
		});

		it('adds a record to the database', async function() {
			const job = await this.sequelize
				.model('transcriptionJobs')
				.findOne({ where: { operationId: this.expectedOpId } });
			assert.isOk(job, "Didn't find job in database");
			expect(job.state).to.equal('pending');
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

			it('returns the same job id as before', function() {
				expect(this.finishResult.job.id).to.equal(this.beginResult.job.id);
			});

			it('returns the same file key as before', function() {
				expect(this.finishResult.job.fileKey).to.equal(this.expectedFilename);
			});

			it('returns the correct cost', function() {
				expect(this.finishResult.job.cost).to.equal(0.05);
			});

			it('returns the correct user', function() {
				expect(this.finishResult.job.user.id).to.equal(this.testUserId);
			});

			it('correctly charges the user', function() {
				expect(this.finishResult.job.user.credit).to.equal(9.95);
			});

			it('sets the job to a `success` state', function() {
				expect(this.finishResult.job.state).to.equal('success');
			});

			it('returns the previous operation id', function() {
				expect(this.finishResult.job.operationId).to.equal(this.expectedOpId);
			});

			it('cleans up the transcription file when done', function() {
				expect(this.mockGCP.fileInstance.delete).to.have.been.called();
			});

			it('updates the record in the database', async function() {
				const job = await this.sequelize
					.model('transcriptionJobs')
					.findOne({ where: { operationId: this.expectedOpId } });
				assert.isOk(job, "Didn't find job in database");
				expect(job.state).to.equal('success');
			});

			describe('failTranscription, when the job is already complete', function() {
				before(async function() {
					this.result = await request(this.server)
						.post('/graphql')
						.send({
							query: `mutation failTranscription($operationId: String!) {
							failTranscription(operationId: $operationId) {
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
				});

				// TODO: the failure actually throws a BadRequestError, but graphql returns a 500
				it('returns a 500 error', function() {
					expect(this.result.statusCode).to.equal(500);
				});

				it('returns an error message that explains there is no pending job with the given op id', function() {
					expect(this.result.body.errors).to.have.lengthOf(1);
					expect(this.result.body.errors[0].message).to.equal(
						`Cannot fail transcription, no pending job found for user: ${this.testUserId} and operation ${this.expectedOpId}`
					);
				});

				it('does not alter the record in the database', async function() {
					const job = await this.sequelize
						.model('transcriptionJobs')
						.findOne({ where: { operationId: this.expectedOpId } });
					assert.isOk(job, "Didn't find job in database");
					expect(job.state).to.equal('success');
				});
			});
		});
	});

	describe('beginTranscription, when the user can afford the job, but the job is destined to fail', function() {
		before(async function() {
			await this.sequelize.model('transcriptionJobs').destroy({ where: {} });

			this.expectedOpId = uuid();
			this.expectedDuration = 20;
			this.expectedFilename = 'neat_file_in_bucket';

			this.mockGCP.setLongRunningRecognizeResponse({ operationId: this.expectedOpId });
			this.mockGCP.setFileInstance({ name: this.expectedFilename, audioDuration: this.expectedDuration });

			await this.updateTestUser({ credit: '10.00' });

			this.server = this.createServer();

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

		it('returns a job with an id', function() {
			assert.isOk(this.beginResult.job.id);
		});

		it('adds a record to the database', async function() {
			const job = await this.sequelize
				.model('transcriptionJobs')
				.findOne({ where: { operationId: this.expectedOpId } });
			assert.isOk(job, "Didn't find job in database");
			expect(job.state).to.equal('pending');
		});

		describe('failTranscription', function() {
			before(async function() {
				const { statusCode, body } = await request(this.server)
					.post('/graphql')
					.send({
						query: `mutation failTranscription($operationId: String!) {
							failTranscription(operationId: $operationId) {
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

				if (statusCode !== 200) throw new Error(`Error failing transcription: ${body.errors}`);

				this.failResult = body.data.failTranscription;
			});

			it('returns the same job id as before', function() {
				expect(this.failResult.job.id).to.equal(this.beginResult.job.id);
			});

			it('returns the same file key as before', function() {
				expect(this.failResult.job.fileKey).to.equal(this.expectedFilename);
			});

			it('returns the correct cost', function() {
				expect(this.failResult.job.cost).to.equal(0.05);
			});

			it('returns the correct user', function() {
				expect(this.failResult.job.user.id).to.equal(this.testUserId);
			});

			it('does not charge the user', function() {
				expect(this.failResult.job.user.credit).to.equal(10);
			});

			it('sets the job to a `error` state', function() {
				expect(this.failResult.job.state).to.equal('error');
			});

			it('returns the previous operation id', function() {
				expect(this.failResult.job.operationId).to.equal(this.expectedOpId);
			});

			it('cleans up the transcription file when done', function() {
				expect(this.mockGCP.fileInstance.delete).to.have.been.called();
			});

			it('fails the record in the database', async function() {
				const job = await this.sequelize
					.model('transcriptionJobs')
					.findOne({ where: { operationId: this.expectedOpId } });
				assert.isOk(job, "Didn't find job in database");
				expect(job.state).to.equal('error');
			});
		});
	});

	describe('beginTranscription, when the user has an unlimited usage account', function() {
		before(async function() {
			await this.sequelize.model('transcriptionJobs').destroy({ where: {} });

			this.expectedOpId = uuid();
			this.expectedDuration = 20;
			this.expectedFilename = 'neat_file_in_bucket';

			this.mockGCP.setLongRunningRecognizeResponse({ operationId: this.expectedOpId });
			this.mockGCP.setFileInstance({ name: this.expectedFilename, audioDuration: this.expectedDuration });

			await this.updateTestUser({ credit: '0', unlimited_usage: '1' });

			this.server = this.createServer();

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

		it('returns a job with an id', function() {
			assert.isOk(this.beginResult.job.id);
		});

		it('returns the expected file key', function() {
			expect(this.beginResult.job.fileKey).to.equal(this.expectedFilename);
		});

		it('calculates the correct cost', function() {
			expect(this.beginResult.job.cost).to.equal(Math.ceil((this.expectedDuration / 60) * 0.15 * 100) / 100);
		});

		it('sets the job to a `pending` state', function() {
			expect(this.beginResult.job.state).to.equal('pending');
		});

		it('returns an operation id', function() {
			expect(this.beginResult.job.operationId).to.equal(this.expectedOpId);
		});

		it('returns the correct user', function() {
			expect(this.beginResult.job.user.id).to.equal(this.testUserId);
		});

		it('does not charge the user', function() {
			expect(this.beginResult.job.user.credit).to.equal(0);
		});

		it('adds a record to the database', async function() {
			const job = await this.sequelize
				.model('transcriptionJobs')
				.findOne({ where: { operationId: this.expectedOpId } });
			assert.isOk(job, "Didn't find job in database");
			expect(job.state).to.equal('pending');
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

			it('returns the same job id as before', function() {
				expect(this.finishResult.job.id).to.equal(this.beginResult.job.id);
			});

			it('returns the same file key as before', function() {
				expect(this.finishResult.job.fileKey).to.equal(this.expectedFilename);
			});

			it('returns the correct cost', function() {
				expect(this.finishResult.job.cost).to.equal(0.05);
			});

			it('returns the correct user', function() {
				expect(this.finishResult.job.user.id).to.equal(this.testUserId);
			});

			it('still does not charge the user', function() {
				expect(this.finishResult.job.user.credit).to.equal(0);
			});

			it('sets the job to a `success` state', function() {
				expect(this.finishResult.job.state).to.equal('success');
			});

			it('returns the previous operation id', function() {
				expect(this.finishResult.job.operationId).to.equal(this.expectedOpId);
			});

			it('cleans up the transcription file when done', function() {
				expect(this.mockGCP.fileInstance.delete).to.have.been.called();
			});

			it('sets the job state to `success`', async function() {
				const job = await this.sequelize
					.model('transcriptionJobs')
					.findOne({ where: { operationId: this.expectedOpId } });
				assert.isOk(job, "Didn't find job in database");
				expect(job.state).to.equal('success');
			});
		});
	});

	describe('finishTranscription, when the transcription does not exist', function() {
		before(async function() {
			this.expectedOpId = uuid();

			const server = this.createServer();

			this.result = await request(server)
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
		});

		// TODO: the failure actually throws a BadRequestError, but graphql returns a 500
		it('returns a 500 error', function() {
			expect(this.result.statusCode).to.equal(500);
		});

		it('returns an error message that explains there is no pending job with the given op id', function() {
			expect(this.result.body.errors).to.have.lengthOf(1);
			expect(this.result.body.errors[0].message).to.equal(
				`Cannot finish transcription, no pending job found for user: ${this.testUserId} and operation ${this.expectedOpId}`
			);
		});
	});

	describe('failTranscription, when the transcription does not exist', function() {
		before(async function() {
			this.expectedOpId = uuid();

			const server = this.createServer();

			this.result = await request(server)
				.post('/graphql')
				.send({
					query: `mutation failTranscription($operationId: String!) {
						failTranscription(operationId: $operationId) {
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
		});

		// TODO: the failure actually throws a BadRequestError, but graphql returns a 500
		it('returns a 500 error', function() {
			expect(this.result.statusCode).to.equal(500);
		});

		it('returns an error message that explains there is no pending job with the given op id', function() {
			expect(this.result.body.errors).to.have.lengthOf(1);
			expect(this.result.body.errors[0].message).to.equal(
				`Cannot fail transcription, no pending job found for user: ${this.testUserId} and operation ${this.expectedOpId}`
			);
		});
	});
});
