module.exports = class NotFoundError extends Error {
	constructor(m = 'Not found') {
		super(m);
		this.name = 'NotFoundError';
	}
};
