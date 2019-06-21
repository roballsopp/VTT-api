const stripeService = require('../services/stripe.service');
const { BadRequestError } = require('../errors');

module.exports = app => {
	app.post('/stripe/session', async (req, res, next) => {
		const { name, description, amount, returnUrl } = req.body;

		if (!name) return next(new BadRequestError('`name` is a required field'));
		if (!amount) return next(new BadRequestError('`amount` is a required field'));
		if (!returnUrl) return next(new BadRequestError('`returnUrl` is a required field'));

		try {
			const { id } = await stripeService.createSession({ name, description, amount, returnUrl });
			res.json({ session: { id } });
		} catch (e) {
			next(e);
		}
	});
};
