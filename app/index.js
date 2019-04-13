const express = require('express');
const createRoutes = require('./express');
const app = express();

app.get('/', (req, res) => res.send('Hello World!'));

createRoutes(app);

app.listen(process.env.PORT, () => console.log(`Example app listening on port ${process.env.PORT}!`));
