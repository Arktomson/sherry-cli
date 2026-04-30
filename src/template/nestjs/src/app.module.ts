import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { nodeEnv, NodeEnv, envValidationSchema } from './config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // 根据 NODE_ENV 加载对应文件；生产部署靠平台注入，process.env 优先级最高
      envFilePath: `.env.${nodeEnv}`,
      validationSchema: envValidationSchema,
      validationOptions: {
        abortEarly: false, // 一次性报告所有缺失字段
      },
    }),
    // 结构化日志：生产 JSON，开发 pretty
    LoggerModule.forRoot({
      pinoHttp: {
        level: nodeEnv === NodeEnv.Production ? 'info' : 'debug',
        // 开发环境使用 pino-pretty 输出易读格式
        transport:
          nodeEnv === NodeEnv.Development
            ? { target: 'pino-pretty', options: { colorize: true } }
            : undefined,
      },
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
