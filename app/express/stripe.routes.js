const stripeService = require('../services/stripe.service');

module.exports = app => {
	app.post('/stripe/session', async (req, res) => {
		const { name, description, amount, returnUrl } = req.body;

		if (!name) return res.status(400).send('`name` is a required field');
		if (!amount) return res.status(400).send('`amount` is a required field');
		if (!returnUrl) return res.status(400).send('`returnUrl` is a required field');

		try {
			const { id } = await stripeService.createSession({ name, description, amount, returnUrl });
			res.json({ session: { id } });
		} catch (e) {
			res.status(500).send(e.message);
		}
	});
};
