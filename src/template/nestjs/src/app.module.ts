import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { nodeEnv, envValidationSchema } from './config';

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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
