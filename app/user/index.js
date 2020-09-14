const { UserType } = require('./user.graphql');
const UserMutations = require('./user-mutations.graphql');
const createUserModel = require('./user.model');

module.exports = { UserType, createUserModel, UserMutations };
