module.exports = {
	up: queryInterface => {
		return queryInterface.sequelize.query(`
		  CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
		  
			CREATE TABLE IF NOT EXISTS transcription_jobs
			(
				id uuid NOT NULL DEFAULT uuid_generate_v4(),
				user_id character varying(255) NOT NULL,
				operation_id character varying(255) NOT NULL,
				state character varying(255) NOT NULL DEFAULT 'pending',
				file_key character varying(500) NOT NULL,
				cost decimal NOT NULL,
				created_at timestamp with time zone NOT NULL DEFAULT now(),
				updated_at timestamp with time zone NOT NULL DEFAULT now(),
				CONSTRAINT transcription_jobs_pkey PRIMARY KEY (id),
				CONSTRAINT transcription_jobs_user_id_operation_id_uidx UNIQUE (user_id, operation_id)
			);
		`);
	},
	down: () => {},
};
