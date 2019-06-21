module.exports = class BadRequestError extends Error {
	constructor(m = 'Bad request') {
		super(m);
		this.name = 'BadRequestError';
	}
};
