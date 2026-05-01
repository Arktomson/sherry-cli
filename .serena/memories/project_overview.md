# sherry-cli 工程画像

- 语言/框架：TypeScript ESM CLI，Commander 组织命令，Rollup 打包到 `dist/cli.js`，内置模板复制到发布包。
- 包名/版本：`@arktomson99/sherry-cli@1.2.0`，bin 为 `sherry-cli` 和 `sc`。
- 入口：`src/bin/cli.ts` 注册 `create/list/count/blog/video/insert` 六个命令，帮助页使用 cowsay + 随机文案。
- 配置：`src/config.ts` 定义模板列表、模板目录别名、包管理器检测、场景常量；从运行时包 `package.json` 读取 version。
- 核心工具：`src/utils/index.ts` 负责内置模板复制、异步队列、模板渲染、EJS 文件处理、package.json 深度合并和 NestJS EJS 清理；`src/utils/terminal.ts` 提供 spinner、命令执行、inquirer；`src/utils/git.ts` 负责新项目 `git init`。
- 命令：`create` 复制模板、可交互选择 NestJS validation/swagger、可 git init、可 npm install；`insert` 当前支持 standard-version 注入；`count` 递归统计行数；`blog` 转换 Markdown 到 juejin 格式并复制剪贴板/输出文件；`video` 调用 Python Whisper 字幕脚本。
- 模板：`src/template` 含 vue3-ts/react-ts/nextjs/nuxtjs/nestjs 和 insert/standard-version；NestJS 模板有 ConfigModule、Joi 校验、Pino、Request ID/Trace ID、Helmet、`GlobalExceptionFilter` 全局异常过滤器、`ResponseEnvelopeInterceptor` 响应信封拦截器、`/health` 健康检查、可选 ValidationPipe/Swagger/Prisma 数据库配置/全局 Rate Limit。
- 文档：`docs/nestjs-checklist.md` 记录 NestJS 模板已完成项和后续 feature 模式计划；`src/template/nestjs-features/postgres-prisma` 为空预留。
- CI：`.github/workflows/npm-publish.yml` 手动触发版本更新、构建、npm 发布。
- 验证记录：2026-04-30 本地 `npm run type-check` 通过；`npm run build` 在 Node v25.9.0 下失败于 `rollup.config.js` 的 JSON import assertion：`Unexpected identifier 'assert'`。
- 已观察风险：Vue/React/Next 模板引用了未包含的文件（如 Vue views/assets、React pages/index.css、Next globals.css），生成项目可能无法直接构建；Git 工作区因激活 Serena 出现未跟踪 `.serena/`。