module.exports = class ServerError extends Error {
	constructor(m = 'Internal server error') {
		super(m);
		this.name = 'ServerError';
	}
};
