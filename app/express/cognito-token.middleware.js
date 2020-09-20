const jwt = require('express-jwt');
const { expressJwtSecret } = require('jwks-rsa');

module.exports = jwt({
	secret: expressJwtSecret({
		cache: true,
		rateLimit: true,
		jwksRequestsPerMinute: 5,
		jwksUri: `https://cognito-idp.${process.env.COGNITO_POOL_REGION}.amazonaws.com/${process.env.COGNITO_POOL_ID}/.well-known/jwks.json`,
	}),
	audience: process.env.COGNITO_CLIENT_ID,
	issuer: `https://cognito-idp.${process.env.COGNITO_POOL_REGION}.amazonaws.com/${process.env.COGNITO_POOL_ID}`,
	algorithms: ['RS256'],
});
