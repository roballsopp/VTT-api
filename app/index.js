const { GraphQLSchema } = require('graphql');
const { createServer } = require('./express');
const createModels = require('./models');
const gqlQueries = require('./root-query.graphql');
const gqlMutations = require('./root-mutaton.graphql');

const graphqlSchema = new GraphQLSchema({ query: gqlQueries, mutation: gqlMutations });
const models = createModels();
const app = createServer(graphqlSchema, models);

app.listen(process.env.PORT, () => console.log(`Listening on port ${process.env.PORT}`));
