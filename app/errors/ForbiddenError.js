module.exports = class ForbiddenError extends Error {
	constructor(m = 'Forbidden') {
		super(m);
		this.name = 'ForbiddenError';
	}
};
