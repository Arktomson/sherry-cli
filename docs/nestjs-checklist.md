# NestJS 模板可扩展配置清单

> 基于工程 HEAD `9f4a9c8 feat: config` 的现状梳理

## 已完成配置（内置到 nestjs 模板）

| 配置项 | 状态 | 控制方式 | 文件 |
|---|---|---|---|
| `@nestjs/config` + Joi env 校验 | ✅ | 内置 | `src/config/env.validation.ts` |
| class-validator / class-transformer | ✅ | `--no-validation` 关闭 | `package.json.ejs`, `main.ts.ejs` |
| Swagger (`/api`) | ✅ | 交互式可选 | `main.ts.ejs`, `package.json.ejs` |
| 全局异常过滤器 `AllExceptionsFilter` | ✅ | 内置 | `src/common/filters/all-exceptions.filter.ts` |
| 响应拦截器 `TransformInterceptor` | ✅ | 内置 | `src/common/interceptors/transform.interceptor.ts` |
| CORS | ✅ | 开发环境开启 | `main.ts.ejs` |
| cross-env | ✅ | 内置 | `package.json.ejs` |
| git init | ✅ | `--skip-git` 关闭 | `src/bin/command/create.ts` |

---

## 剩余可加配置清单

### 一、低复杂度（推荐内置）

| # | 配置项 | 简述 | 实现要点 | 推荐 |
|---|---|---|---|---|
| 1 | **结构化日志 (pino)** | 生产 JSON / 开发 pretty | `nestjs-pino` + `pino-pretty`，按 `nodeEnv` 切换格式 | ★★★ |
| 2 | **Helmet 安全头** | X-Frame-Options / CSP 等 | `npm i helmet`, `app.use(helmet())` | ★★★ |
| 3 | **优雅关闭** | K8s/Docker 友好 | `app.enableShutdownHooks()` | ★★★ |
| 4 | **请求日志 (morgan/interceptor)** | HTTP 请求记录 | `morgan` 或自定义 LoggingInterceptor | ★★ |

### 二、中等复杂度（可选内置或 feature）

| # | 配置项 | 简述 | 实现要点 | 推荐方式 |
|---|---|---|---|---|
| 5 | **Rate Limiting** | 防刷限流 | `@nestjs/throttler` + `ThrottlerGuard` | 内置可选 |
| 6 | **健康检查 (terminus)** | K8s liveness/readiness | `@nestjs/terminus` + `/health` 端点 | 内置可选 |
| 7 | **定时任务 (schedule)** | cron 任务 | `@nestjs/schedule` + `@Cron()` 装饰器 | feature |

### 三、高复杂度（推荐 feature 模式）

| # | 配置项 | 简述 | 实现要点 | 推荐方式 |
|---|---|---|---|---|
| 8 | **JWT 鉴权骨架** | 用户认证 | `@nestjs/jwt` + `@nestjs/passport` + AuthGuard 示例 | feature |
| 9 | **Prisma ORM** | PostgreSQL + Prisma | `prisma.schema` + `PrismaModule` + `PrismaService` | feature |
| 10 | **TypeORM** | 关系型数据库 | `@nestjs/typeorm` + 实体示例 | feature |
| 11 | **Mongoose** | MongoDB | `@nestjs/mongoose` + Schema 示例 | feature |
| 12 | **缓存 (cache-manager)** | Redis 缓存 | `@nestjs/cache-manager` + `cache-manager-redis-store` | feature |
| 13 | **队列 (bull)** | 任务队列 | `@nestjs/bull` + Redis + Processor 示例 | feature |
| 14 | **邮件 (mailer)** | 发送邮件 | `@nestjs-modules/mailer` + 模板 | feature |

---

## Feature 模式说明

高复杂度配置建议通过 `insert` 命令按需注入，类似已有的 `standard-version` feature：

```
src/template/nestjs-features/
├── postgres-prisma/      # 已预留空目录
│   ├── prisma/
│   │   └── schema.prisma
│   └── src/
│       ├── prisma/
│       │   ├── prisma.module.ts
│       │   ├── prisma.service.ts
│       ├── database.module.ts
├── jwt-auth/
├── rate-limit/
└── ...
```

CLI `insert` 命令流程：
1. 安装对应依赖（根据包管理器选择）
2. 使用 `renderTemplate` + `RenderMode.INCREMENT` 合入文件
3. 更新 `app.module.ts` 引入新模块（需 ejs 或代码注入）

---

## 下一步建议

**优先级排序：**
1. 先内置 **#1-4**（pino 日志 + Helmet + 优雅关闭 + 请求日志）
2. 视用户反馈决定是否内置 **#5-6**（Rate Limit / Health Check）
3. 后续分批实现 feature 模式（Prisma 已预留目录）

---

## 技术栈评估

当前 CLI 依赖：
- `commander` ^11.0.0 — 命令解析，6 条命令规模完全够用
- `inquirer` ^9.2.10 — 交互式问答，API 稳定
- `ora` ^8.1.1 — spinner，体验良好
- `ejs` ^3.1.10 — 模板渲染，灵活

**结论：** 不建议切换到 oclif / yargs 等重型框架。当前规模下 commander + inquirer 已足够，维护成本低。可考虑的小优化：
- 给 `-t` 加 `.choices()` 校验（拦截非法模板名）
- 未来如需多级子命令可评估 oclif