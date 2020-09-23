module.exports = {
	up: queryInterface => {
		return queryInterface.sequelize.transaction(async transaction => {
			await queryInterface.sequelize.query(
				`ALTER TABLE transcription_jobs
				ADD COLUMN file_duration decimal,
				ADD COLUMN price_per_min decimal;`,
				{ transaction }
			);

			await queryInterface.sequelize.query(`UPDATE transcription_jobs SET price_per_min = 0.15;`, { transaction });

			await queryInterface.sequelize.query(`UPDATE transcription_jobs SET file_duration = cost / 0.15 * 60;`, {
				transaction,
			});

			await queryInterface.sequelize.query(
				`ALTER TABLE transcription_jobs
				ALTER COLUMN file_duration SET NOT NULL,
				ALTER COLUMN price_per_min SET NOT NULL;`,
				{ transaction }
			);
		});
	},
	down: () => {},
};
