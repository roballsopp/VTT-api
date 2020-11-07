const SERVER_PORT = process.env.PORT;
const REQUEST_LOGGING = process.env.REQUEST_LOGGING === 'true';
const AUDIO_BUCKET = process.env.AUDIO_BUCKET;
const PG_DATABASE = process.env.PG_DATABASE;
const PG_USER = process.env.PG_USER;
const PG_PWD = process.env.PG_PWD;
const PG_HOST = process.env.PG_HOST;
const COGNITO_CLIENT_ID = process.env.COGNITO_CLIENT_ID;
const COGNITO_POOL_ID = process.env.COGNITO_POOL_ID;
const COGNITO_POOL_REGION = process.env.COGNITO_POOL_REGION;
const GCP_PROJECT = process.env.GCP_PROJECT;
const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
const PAYPAL_SECRET = process.env.PAYPAL_SECRET;
const SPEECH_TO_TEXT_COST_PER_MINUTE = Number(process.env.SPEECH_TO_TEXT_COST_PER_MINUTE); // dollars per minute

if (Number.isNaN(SPEECH_TO_TEXT_COST_PER_MINUTE)) throw new Error('Bad SPEECH_TO_TEXT_COST_PER_MINUTE variable');

const GET_TOTAL_S2T_JOB_COST = duration => Math.ceil((duration / 60) * SPEECH_TO_TEXT_COST_PER_MINUTE * 100) / 100;

module.exports = {
	SERVER_PORT,
	REQUEST_LOGGING,
	AUDIO_BUCKET,
	PG_DATABASE,
	PG_USER,
	PG_PWD,
	PG_HOST,
	COGNITO_CLIENT_ID,
	COGNITO_POOL_ID,
	COGNITO_POOL_REGION,
	SPEECH_TO_TEXT_COST_PER_MINUTE,
	GET_TOTAL_S2T_JOB_COST,
	PAYPAL_CLIENT_ID,
	PAYPAL_SECRET,
	GCP_PROJECT,
};
