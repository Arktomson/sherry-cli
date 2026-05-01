import path from 'node:path';
import dotenv from 'dotenv';
import { defineConfig, env } from 'prisma/config';
import { getEnvFilePath } from './src/config';

// Prisma CLI 不会经过 Nest ConfigModule，这里主动加载对应环境变量文件。
dotenv.config({
  path: path.resolve(process.cwd(), getEnvFilePath()),
  quiet: true,
});

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
});
