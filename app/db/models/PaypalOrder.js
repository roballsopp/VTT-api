const { Sequelize } = require('sequelize');

class PaypalOrder extends Sequelize.Model {
	static init(sequelize) {
		super.init(
			{
				id: {
					type: Sequelize.UUID,
					allowNull: false,
					primaryKey: true,
					defaultValue: sequelize.literal('uuid_generate_v4()'),
				},
				userId: { type: Sequelize.STRING, allowNull: false },
				orderId: { type: Sequelize.STRING, allowNull: false, unique: true },
				orderStatus: { type: Sequelize.STRING, allowNull: false },
				applied: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
				refunded: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
				currencyCode: { type: Sequelize.STRING, allowNull: false },
				amount: {
					type: Sequelize.FLOAT,
					allowNull: false,
					get() {
						// Workaround until sequelize issue #8019 is fixed
						return Number(this.getDataValue('amount'));
					},
				},
				payerId: { type: Sequelize.STRING },
				payerGivenName: { type: Sequelize.STRING },
				payerSurname: { type: Sequelize.STRING },
				payerEmail: { type: Sequelize.STRING },
			},
			{
				sequelize,
				modelName: 'paypalOrders',
				tableName: 'paypal_orders',
				underscored: true,
			}
		);
	}
}

module.exports = PaypalOrder;
