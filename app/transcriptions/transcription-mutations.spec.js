const request = require('supertest');
const { expect } = require('chai');

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
});
