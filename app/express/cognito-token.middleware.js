const jwt = require('express-jwt');
const { expressJwtSecret } = require('jwks-rsa');
const { COGNITO_CLIENT_ID, COGNITO_POOL_ID, COGNITO_POOL_REGION } = require('../config');

module.exports = jwt({
	secret: expressJwtSecret({
		cache: true,
		rateLimit: true,
		jwksRequestsPerMinute: 5,
		jwksUri: `https://cognito-idp.${COGNITO_POOL_REGION}.amazonaws.com/${COGNITO_POOL_ID}/.well-known/jwks.json`,
	}),
	audience: COGNITO_CLIENT_ID,
	issuer: `https://cognito-idp.${COGNITO_POOL_REGION}.amazonaws.com/${COGNITO_POOL_ID}`,
	algorithms: ['RS256'],
});
