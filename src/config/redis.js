'use strict';
const { Redis } = require('@upstash/redis');
const logger = require('../utils/logger');

let redisClient;

function getRedis() {
  if (!redisClient) {
    redisClient = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
    logger.info('Upstash Redis REST client initialized');
  }
  return redisClient;
}

module.exports = { getRedis };
