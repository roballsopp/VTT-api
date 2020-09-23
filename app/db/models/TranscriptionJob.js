const { Sequelize } = require('sequelize');

class TranscriptionJob extends Sequelize.Model {
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
				operationId: { type: Sequelize.STRING, allowNull: false },
				state: { type: Sequelize.STRING, allowNull: false },
				fileKey: { type: Sequelize.STRING, allowNull: false },
				cost: { type: Sequelize.FLOAT, allowNull: false },
			},
			{
				sequelize,
				modelName: 'transcriptionJobs',
				tableName: 'transcription_jobs',
				underscored: true,
			}
		);
	}
}

module.exports = TranscriptionJob;
