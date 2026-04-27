import * as Joi from 'joi';

/**
 * 封装 NODE_ENV，供模块外使用（模块内推荐用 ConfigService）
 * - Joi 校验已保证值只能是 development / production / test
 */
export const nodeEnv = (process.env.NODE_ENV ?? 'development') as
  | 'development'
  | 'production'

/**
 * 环境变量校验 schema
 * - 启动时会校验 process.env，缺失或类型错误立即抛错
 * - 新增环境变量时同步更新此文件和对应的 .env 文件
 */
export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production')
    .required(),
  PORT: Joi.number().port().default(3000),

  // 按需启用的字段（取消注释即生效）
  // DATABASE_URL: Joi.string().uri().required(),
  // JWT_SECRET: Joi.string().min(32).required(),
});
