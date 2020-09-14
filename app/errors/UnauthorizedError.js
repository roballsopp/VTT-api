module.exports = class UnauthorizedError extends Error {
	constructor(m = 'Unauthorized') {
		super(m);
		this.name = 'UnauthorizedError';
	}
};
