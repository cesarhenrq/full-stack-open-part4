const logger = require('./logger');
const jwt = require('jsonwebtoken');
const { SECRET } = require('../utils/config');
const User = require('../models/user');

const requestLogger = (request, response, next) => {
  logger.info('Method:', request.method);
  logger.info('Path:  ', request.path);
  logger.info('Status:', response.statusCode);
  logger.info('Body:  ', request.body);
  logger.info('---');
  next();
};

const unknownEndpoint = (request, response) => {
  response.status(404).send({ error: 'unknown endpoint' });
};

const errorHandler = (error, request, response, next) => {
  logger.error(error.message);

  if (error.name === 'CastError') {
    return response.status(400).send({ error: error.message });
  } else if (error.name === 'ValidationError') {
    return response.status(400).json({ error: error.message });
  } else if (error.name === 'UnauthorizedError') {
    return response.status(401).json({ error: error.message });
  } else if (error.name === 'JsonWebTokenError') {
    return response.status(400).json({ error: error.message });
  }

  next(error);
};

const tokenExtractor = (request, response, next) => {
  const authorization = request.get('authorization');

  if (authorization && authorization.startsWith('Bearer ')) {
    request.token = authorization.replace('Bearer ', '');

    return next();
  }
  request.token = null;

  next();
};

const userExtractor = async (request, response, next) => {
  const authorization = request.get('authorization');

  if (authorization && authorization.startsWith('Bearer ')) {
    const token = authorization.replace('Bearer ', '');
    const decodedToken = jwt.verify(token, SECRET);
    const user = await User.findById(decodedToken.id);
    request.user = user;

    return next();
  }
  request.user = null;

  next();
};

module.exports = {
  requestLogger,
  unknownEndpoint,
  errorHandler,
  tokenExtractor,
  userExtractor
};
