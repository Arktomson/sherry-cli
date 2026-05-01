# 数据库 feature 侦察记录

- 当前 NestJS 模板已预留数据库配置：`.env.development` / `.env.production` 中有注释形式 `DATABASE_URL`，`src/config/env.validation.ts` 中有注释形式 Joi 校验。
- `src/template/nestjs-features/postgres-prisma` 目录已存在，但为空，仅有 `prisma/`、`src/prisma/` 空目录。
- `docs/nestjs-checklist.md` 已规划 Prisma ORM / TypeORM / Mongoose，其中 PostgreSQL + Prisma 推荐以 feature 模式实现。
- 当前 `insert` 命令只支持 `standard-version`，模板源为 `src/template/insert/standard-version`；尚未支持 `nestjs-features/*`。
- `renderTemplate` 支持复制目录、EJS 渲染、package.json 深度合并，但不能修改已有 TS 文件中的 import / Module imports / Joi schema / env 文件内容。
- 数据库能力不放在 `insert` 命令中；它属于 `create nestjs` 的创建期选项。
- `create nestjs` 会询问是否添加数据库配置，并在开启后询问 ORM 类型；当前只开放 Prisma / PostgreSQL 一个选项，但仍保留选择流程以便后续扩展。
- 代码片段通过 NestJS 模板 EJS 条件渲染：`package.json.ejs`、`app.module.ts.ejs`、`env.validation.ts.ejs`、`.env.*.ejs`、`.gitignore.ejs`。
- Prisma 文件直接复制：`src/template/nestjs-features/postgres-prisma` 下包含 `prisma.config.ts`、`prisma/schema.prisma`、`src/infrastructure/prisma/prisma.module.ts`、`prisma.service.ts`、`prisma-log.utils.ts`。
- `insert.ts` 仍只处理独立 feature（当前 standard-version），不承载 NestJS 创建期数据库配置。