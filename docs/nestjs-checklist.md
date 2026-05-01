# NestJS 模板可扩展配置清单

> 反映 sherry-cli `nestjs` 模板的当前能力，以及尚未实现的功能与建议。

## 已完成（内置到 nestjs 模板）

| 配置项 | 状态 | 控制方式 | 主要文件 |
|---|---|---|---|
| `@nestjs/config` + Joi env 校验 | ✅ | 内置；启动时校验 `process.env` | `src/config/env.validation.ts.ejs` |
| class-validator / class-transformer | ✅ | `--no-validation` 关闭 | `package.json.ejs`, `main.ts.ejs` |
| Swagger (`/api`) | ✅ | 交互式可选 | `main.ts.ejs`, `package.json.ejs` |
| 全局异常过滤器 `GlobalExceptionFilter` | ✅ | 内置 | `src/common/filters/global-exception.filter.ts` |
| 响应信封拦截器 `ResponseEnvelopeInterceptor` | ✅ | 内置 | `src/common/interceptors/response-envelope.interceptor.ts` |
| Health Check (`/health`) | ✅ | 内置；启用 Prisma 时连带数据库检查 | `src/health/*` |
| Request ID / Trace ID | ✅ | 后端生成 `x-request-id`，写入响应头与请求日志 | `app.module.ts.ejs` |
| 结构化日志 (`nestjs-pino` + `pino-pretty`) | ✅ | 内置；生产 JSON / 开发 pretty | `app.module.ts.ejs`, `main.ts.ejs` |
| HTTP 请求日志 | ✅ | 内置（pino-http 自动，带 reqId）| `app.module.ts.ejs` |
| Helmet 安全头 | ✅ | 内置；CSP / EmbedderPolicy 默认关闭以兼容 API | `main.ts.ejs` |
| 优雅关闭 | ✅ | `app.enableShutdownHooks()` | `main.ts.ejs` |
| Rate Limiting | ✅ | `--rate-limit` 或交互式；100 次/分钟/IP | `app.module.ts.ejs` |
| `trust proxy`（生产）| ✅ | `TRUST_PROXY` 环境变量；默认 1，加 CDN 改 2 或填 IP 白名单 | `main.ts.ejs`, `env.validation.ts.ejs`, `.env.production.ejs` |
| CORS | ✅ | 开发环境开启 | `main.ts.ejs` |
| cross-env | ✅ | 内置 | `package.json.ejs` |
| git init | ✅ | `--skip-git` 关闭 | `src/bin/command/create.ts`, `src/utils/git.ts` |
| Prisma + PostgreSQL（feature）| ✅ | `--database --orm prisma` 或交互式 | `nestjs-features/postgres-prisma/*` |
| 原地展开（in-place）| ✅ | `--in-place`；保留已有文件 + `package.json` deepmerge | `src/bin/command/create.ts`, `src/utils/index.ts` |

---

## 剩余可加配置清单

### 中等复杂度

| # | 配置项 | 简述 | 实现要点 | 推荐方式 |
|---|---|---|---|---|
| 1 | **定时任务 (schedule)** | cron 任务 | `@nestjs/schedule` + `@Cron()` 装饰器 | feature |

### 高复杂度（推荐 feature 模式）

| # | 配置项 | 简述 | 实现要点 | 推荐方式 |
|---|---|---|---|---|
| 2 | **JWT 鉴权骨架** | 用户认证 | `@nestjs/jwt` + `@nestjs/passport` + AuthGuard 示例 | feature |
| 3 | **TypeORM** | 关系型数据库 | `@nestjs/typeorm` + 实体示例 | feature |
| 4 | **Mongoose** | MongoDB | `@nestjs/mongoose` + Schema 示例 | feature |
| 5 | **缓存 (cache-manager)** | Redis 缓存 | `@nestjs/cache-manager` + redis store | feature |
| 6 | **队列 (bull)** | 任务队列 | `@nestjs/bull` + Redis + Processor 示例 | feature |
| 7 | **邮件 (mailer)** | 发送邮件 | `@nestjs-modules/mailer` + 模板 | feature |

---

## Feature 模式说明

`create nestjs` 时通过交互或 CLI flag 选择性启用：

```
src/template/nestjs-features/
├── postgres-prisma/        # ✅ 已实现：--database --orm prisma
│   ├── prisma.config.ts
│   ├── prisma/
│   │   └── schema.prisma
│   └── src/
│       └── infrastructure/
│           └── prisma/
│               ├── prisma.module.ts
│               ├── prisma.service.ts
│               └── prisma-log.utils.ts
├── jwt-auth/               # 待实现
├── typeorm/                # 待实现
├── mongoose/               # 待实现
├── cache-redis/            # 待实现
├── queue-bull/             # 待实现
└── mailer/                 # 待实现
```

CLI `create nestjs` 流程：

1. 命中模板 → 进入 nestjs 选项问询（validation / Swagger / 限流 / 数据库）
2. 启用数据库 → 选择 ORM（当前只开放 Prisma / PostgreSQL）
3. 决定输出位置：默认 `<cwd>/<app-name>` 子目录；`--in-place` 在当前目录展开
4. 复制基础模板 → 通过 EJS 渲染 `package.json`、`app.module.ts`、`env.validation.ts`、`.env.*`、`.gitignore`、`main.ts`、`health.service.ts`
5. 启用数据库时复制 `postgres-prisma` feature 目录
6. （非 `--skip-git`）`git init`
7. 询问是否 `npm install`

---

## CLI 选项一览

| 选项 | 作用 |
|---|---|
| `[app-name]` | 项目名（`--in-place` 时可省略，自动用当前目录名）|
| `-t, --template <name>` | 模板名；不传则交互式选择 |
| `-f, --force` | 目标目录非空时直接覆盖（仅非 `--in-place` 模式生效）|
| `--in-place` | 在当前目录展开；已存在文件保留 + 黄色提示，`package.json` 走 deepmerge |
| `--skip-git` | 不执行 git init |
| `--no-validation` | 关闭 class-validator / class-transformer |
| `--database` | 添加数据库配置 |
| `--orm <name>` | 选择 ORM（当前仅 `prisma`）|
| `--rate-limit` | 启用全局限流（100 次/分钟/IP）|

---

## 下一步建议

**优先级排序：**

1. **e2e 冒烟测试**：CLI 自身 `npm run build` 不会编译模板内 `.ejs`；建议生成几种组合（裸模板、`--rate-limit`、`--database --orm prisma`、`--in-place`）实测 `nest build` 是否通过。
2. **CLI 体验小优化**：给 `-t` 加 `.choices()`（含别名），让非法模板名在参数解析阶段就报错。
3. **Feature 实施顺序**（视用户反馈）：JWT > TypeORM / Mongoose > 缓存 / 队列 > 邮件。
4. **后续考虑**：在生成出的项目里附 `README` 模板，说明 `TRUST_PROXY` / `--in-place` / Prisma 工作流。

---

## 技术栈评估

当前 CLI 依赖：

- `commander` ^11.0.0 — 命令解析，当前规模完全够用
- `inquirer` ^9.2.10 — 交互式问答，API 稳定
- `ora` ^8.1.1 — spinner，体验良好
- `ejs` ^3.1.10 — 模板渲染，灵活
- `deepmerge` — `package.json` 合并

**结论：** 不建议切换到 oclif / yargs 等重型框架。当前规模下 commander + inquirer 已足够，维护成本低。
