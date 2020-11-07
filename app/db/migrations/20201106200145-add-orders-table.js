module.exports = {
	up: queryInterface => {
		return queryInterface.sequelize.query(`
			CREATE TABLE IF NOT EXISTS paypal_orders
			(
				id uuid NOT NULL DEFAULT uuid_generate_v4(),
				user_id character varying(255) NOT NULL,
				order_id character varying(100) NOT NULL UNIQUE,
				order_status character varying(100) NOT NULL,
				currency_code character varying(100) NOT NULL,
				amount decimal NOT NULL,
				applied boolean NOT NULL DEFAULT false,
				refunded boolean NOT NULL DEFAULT false,
				payer_id character varying(100),
				payer_given_name character varying(255),
				payer_surname character varying(255),
				payer_email character varying(255),
				created_at timestamp with time zone NOT NULL DEFAULT now(),
				updated_at timestamp with time zone NOT NULL DEFAULT now(),
				CONSTRAINT paypal_orders_pkey PRIMARY KEY (id)
			);
		`);
	},
	down: queryInterface => {
		return queryInterface.sequelize.query('DROP TABLE IF EXISTS paypal_orders');
	},
};
