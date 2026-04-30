'use strict';
const Joi = require('joi');

const envSchema = Joi.object({
  // WhatsApp
  WHATSAPP_TOKEN: Joi.string().required(),
  WHATSAPP_PHONE_NUMBER_ID: Joi.string().required(),
  WHATSAPP_APP_SECRET: Joi.string().required(),
  WHATSAPP_VERIFY_TOKEN: Joi.string().required(),

  // OpenAI
  OPENAI_API_KEY: Joi.string().required(),

  // Database
  DATABASE_URL: Joi.string().uri().required(),

  // Redis
  UPSTASH_REDIS_REST_URL: Joi.string().uri().required(),
  UPSTASH_REDIS_REST_TOKEN: Joi.string().required(),

  // JWT
  JWT_SECRET: Joi.string().min(32).required(),
  JWT_EXPIRES_IN: Joi.string().default('8h'),

  // App
  PORT: Joi.number().default(3000),
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PHONE_SALT: Joi.string().min(16).required(),
  ADMIN_WHATSAPP_NUMBER: Joi.string().required(),
}).unknown(true);

const { error, value: env } = envSchema.validate(process.env);

if (error) {
  console.error('❌ Invalid environment configuration:');
  error.details.forEach(d => console.error(`   - ${d.message}`));
  process.exit(1);
}

module.exports = env;
