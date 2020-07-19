const express = require('express');
const cors = require('cors');

const { requestLogger, createRoutes, errorHandler } = require('./express');

const app = express();

app.use(cors({ origin: new RegExp(`${process.env.CORS_ORIGIN}$`), methods: ['GET', 'POST', 'DELETE'] }));
app.use(express.json());

app.use(requestLogger);

app.get('/health', (req, res) => res.status(200).json({ status: 'Ok' }));

createRoutes(app);

app.use(errorHandler);

app.listen(process.env.PORT, () => console.log(`Listening on port ${process.env.PORT}`));
