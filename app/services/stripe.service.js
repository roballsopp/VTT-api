const stripe = require('stripe')(process.env.STRIPE_KEY);

async function createSession({ name, description, amount, returnUrl }) {
	return stripe.checkout.sessions.create({
		payment_method_types: ['card'],
		line_items: [
			{
				name,
				description,
				amount,
				currency: 'usd',
				quantity: 1,
				// images: ['https://example.com/t-shirt.png'],
			},
		],
		success_url: returnUrl,
		cancel_url: returnUrl,
	});
}

module.exports = {
	createSession,
};
