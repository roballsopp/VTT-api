const express = require('express');
const cors = require('cors');

const { createRoutes, errorHandler } = require('./express');

const app = express();

app.use(cors({ origin: new RegExp(`${process.env.CORS_ORIGIN}$`), methods: ['GET', 'POST', 'DELETE'] }));
app.use(express.json());

createRoutes(app);

app.use(errorHandler);

exports.vttCreatorApp = app;
