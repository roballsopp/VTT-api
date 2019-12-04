const express = require('express');
const cors = require('cors');

const { createRoutes, errorHandler } = require('./express');

const app = express();

app.use(cors({ origin: new RegExp(`${process.env.CORS_ORIGIN}$`), methods: ['GET', 'POST', 'DELETE'] }));
app.use(express.json());

createRoutes(app);

app.use(errorHandler);

if (process.env.NODE_ENV === 'production') {
	exports.vttCreatorApp = app;
} else {
	app.listen(process.env.PORT, () => console.log(`Listening on port ${process.env.PORT}`));
}
