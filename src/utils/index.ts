import chalk from 'chalk';
import fse from 'fs-extra';
import merge from 'deepmerge';
import ejs from 'ejs';
import { __templateDir, resolveTemplateDirName } from '../config';
import { join } from 'path';
import {
  startSpinner,
  stopSpinner,
  stopSpinnerOnly,
  inquirerConfirm,
} from './terminal';
/**
 * 仅复制模板中的"非 .ejs"文件（递归 + 已存在则跳过）。
 *
 * 用于 in-place 模式的第一阶段：
 * - .ejs 文件需要渲染上下文（如 nestjs 选项 database/orm/validation/...），由后续阶段统一处理
 * - 非 .ejs 文件按 INCREMENT 模式叠加：保留用户已有，缺失的补齐
 */
const copyTemplateNonEjsFiles = async (
  src: string,
  dest: string,
): Promise<void> => {
  const stat = await fse.stat(src);
  if (stat.isDirectory()) {
    await fse.ensureDir(dest);
    const items = await fse.readdir(src);
    for (const item of items) {
      await copyTemplateNonEjsFiles(join(src, item), join(dest, item));
    }
    return;
  }
  if (stat.isFile()) {
    if (src.endsWith('.ejs')) return; // 留给后续渲染阶段
    if (await fse.pathExists(dest)) return; // 保留用户已有文件
    await fse.copy(src, dest, { overwrite: false });
  }
};

/**
 * 从发布包内置的 template 目录复制项目模板到目标路径（不拉取远程仓库）
 * @param inPlace 是否原地展开：true 时不清空目标目录，仅复制非 .ejs 文件（已存在则保留），.ejs 留给 renderNestjsEjs
 */
export const downloadTemplate = async (
  template: string,
  dest: string,
  {
    force = false,
    inPlace = false,
  }: { force?: boolean; inPlace?: boolean } = {},
): Promise<void> => {
  const dirName = resolveTemplateDirName(template);
  const templatePath = join(__templateDir, dirName);
  try {
    if (!(await fse.pathExists(templatePath))) {
      throw new Error(
        `Template "${template}" does not exist in built-in templates (path: ${templatePath})`,
      );
    }

    // ---- 原地模式：保留已有内容；只复制非 .ejs 文件（.ejs 由后续渲染阶段处理）----
    if (inPlace) {
      await fse.ensureDir(dest);
      startSpinner('Applying template in-place...');
      await copyTemplateNonEjsFiles(templatePath, dest);
      stopSpinner(
        'succeed',
        chalk.green('Template files copied (existing preserved).'),
      );
      return;
    }

    // ---- 默认模式：目标非空则确认覆盖，再清空 + 复制 ----
    const exists = await fse.pathExists(dest);
    if (exists) {
      const files = await fse.readdir(dest);
      if (files.length > 0) {
        if (!force) {
          stopSpinnerOnly();

          console.log(
            chalk.yellow(
              'Target directory is not empty. Use --force to overwrite existing files.',
            ),
          );
          const confirm = await inquirerConfirm({
            message:
              'Now, You can choose to overwrite the existing files or exit.',
          });
          if (!confirm) {
            process.exit(1);
          }
        }
        await fse.emptyDir(dest);
      }
    }

    startSpinner('Copying template...');

    await fse.copy(templatePath, dest, { overwrite: true });

    stopSpinner('succeed', chalk.green('Template copied successfully!'));
  } catch (err: any) {
    stopSpinner(
      'fail',
      chalk.red(`Template copy failed: ${err?.message || err}`),
    );
    throw err;
  }
};

/**
 * 创建异步队列处理器
 */
interface AsyncQueueOptions {
  concurrency?: number;
  onProgress?: (completed: number, total: number) => void;
}

export const createAsyncQueue = async <T, R>(
  items: T[],
  handler: (item: T) => Promise<R>,
  { concurrency = 5, onProgress }: AsyncQueueOptions = {},
): Promise<(R | { error: any })[]> => {
  const results: (R | { error: any })[] = [];
  let completed = 0;
  let running = 0;
  let index = 0;

  return new Promise<(R | { error: any })[]>((resolve) => {
    const processNext = async () => {
      if (index >= items.length && running === 0) {
        resolve(results);
        return;
      }

      while (running < concurrency && index < items.length) {
        const currentIndex = index++;
        running++;

        try {
          const result = await handler(items[currentIndex]);
          results[currentIndex] = result;
        } catch (error) {
          results[currentIndex] = { error };
        }

        completed++;
        running--;

        if (onProgress) {
          onProgress(completed, items.length);
        }

        processNext();
      }
    };

    // 启动初始的并发任务
    for (let i = 0; i < concurrency; i++) {
      processNext();
    }
  });
};

/**
 * 模板处理模式枚举
 */
export enum RenderMode {
  /** 完整覆盖模式：直接整个覆盖，不需要递归 */
  FULL_COVER = 'full-cover',
  /** 差异覆盖模式：如果文件存在也覆盖 */
  DIFF_COVER = 'diff-cover',
  /** 增量模式：文件不存在的时候才创建 */
  INCREMENT = 'increment',
}

/**
 * 模板渲染选项
 */
export interface RenderTemplateOptions {
  /** 渲染模式 */
  mode: RenderMode;
  ejsData?: Record<string, any>;
  // 预留扩展字段
  [key: string]: any;
}

/**
 * 递归处理模板文件/目录
 * @param source 源路径（文件或目录）
 * @param target 目标路径（文件或目录）
 * @param options 选项配置
 */
export const renderTemplate = async (
  source: string,
  target: string,
  options: RenderTemplateOptions = { mode: RenderMode.DIFF_COVER },
): Promise<void> => {
  try {
    const { mode } = options;
    const sourceStats = await fse.stat(source);

    // FULL_COVER 模式：直接整个覆盖，不需要递归
    if (mode === RenderMode.FULL_COVER) {
      await fse.copy(source, target, { overwrite: true });
      return;
    }

    if (sourceStats.isDirectory()) {
      // 处理目录
      await renderDirectory(source, target, options);
    } else if (sourceStats.isFile()) {
      // 处理文件
      await renderFile(source, target, options);
    }
  } catch (error: any) {
    throw new Error(
      `Failed to render template from ${source} to ${target}: ${error.message}`,
    );
  }
};

/**
 * 递归处理目录
 */
const renderDirectory = async (
  sourceDir: string,
  targetDir: string,
  options: RenderTemplateOptions,
): Promise<void> => {
  // 确保目标目录存在
  await fse.ensureDir(targetDir);

  // 读取源目录中的所有文件和子目录
  const items = await fse.readdir(sourceDir);

  // 递归处理每个项目
  for (const item of items) {
    const sourcePath = join(sourceDir, item);
    const targetPath = join(targetDir, item);

    await renderTemplate(sourcePath, targetPath, options);
  }
};

/**
 * 特殊文件处理器类型定义
 */
type FileProcessor = (
  sourceFile: string,
  targetFile: string,
  options: RenderTemplateOptions,
) => Promise<void>;

/**
 * package.json 合并策略
 * - 模板（template）作为基础，补充新依赖 / 新脚本
 * - 用户已有字段（existing）优先，保护用户对 name / version / scripts / 已存在依赖版本的改动
 * - keywords / files 数组去重合并
 */
const mergePackageJsonObjects = (template: any, existing: any): any => {
  return merge(template, existing, {
    customMerge: (key) => {
      if (['keywords', 'files'].includes(key)) {
        return (a: any[], b: any[]) => [...new Set([...a, ...b])];
      }
      return undefined;
    },
    isMergeableObject: (value) => {
      return value && typeof value === 'object' && !Array.isArray(value);
    },
  });
};

/**
 * EJS 模板处理器
 * - 普通 .ejs 文件：目标已存在则跳过（保留用户文件）
 * - package.json.ejs：渲染后用 deepmerge 合并到现有 package.json，用户字段优先
 */
const ejsProcessor = async (
  sourceFile: string,
  targetFile: string,
  options: RenderTemplateOptions,
): Promise<void> => {
  try {
    // 读取 ejs 模板文件
    const template = await fse.readFile(sourceFile, 'utf8');

    // 生成目标文件名（移除 .ejs 扩展名）
    const actualTargetFile = targetFile.replace(/\.ejs$/, '');
    const actualFileName = actualTargetFile.split('/').pop() || '';

    // 使用 ejs 渲染模板
    const rendered = ejs.render(template, options);

    // 特殊处理：渲染后是 package.json，走合并路径（in-place 模式下用户已有 package.json 时叠加）
    if (actualFileName === 'package.json') {
      let existingPackage: any = {};
      if (await fse.pathExists(actualTargetFile)) {
        existingPackage = await fse.readJSON(actualTargetFile);
      }
      const templatePackage = JSON.parse(rendered);
      const mergedPackage = mergePackageJsonObjects(
        templatePackage,
        existingPackage,
      );
      const orderedPackage = sortPackageJsonDependencies(mergedPackage);
      await fse.writeFile(
        actualTargetFile,
        JSON.stringify(orderedPackage, null, 2),
        'utf8',
      );
      return;
    }

    // 普通 ejs 文件：目标已存在则跳过（保留用户文件）
    if (await fse.pathExists(actualTargetFile)) {
      console.log(
        chalk.yellow(`File ${actualTargetFile} already exists, skipping...`),
      );
      return;
    }

    // 写入渲染后的文件
    await fse.writeFile(actualTargetFile, rendered, 'utf8');
  } catch (error: any) {
    throw new Error(`Failed to process EJS template: ${error.message}`);
  }
};
/**
 * 深度合并 package.json 文件（非 .ejs 直接合并版本，保留通用入口）
 */
const packageJsonProcessor = async (
  sourceFile: string,
  targetFile: string,
  _options: RenderTemplateOptions,
): Promise<void> => {
  try {
    const templatePackage = await fse.readJSON(sourceFile);

    let existingPackage: any = {};
    if (await fse.pathExists(targetFile)) {
      existingPackage = await fse.readJSON(targetFile);
    }

    const mergedPackage = mergePackageJsonObjects(
      templatePackage,
      existingPackage,
    );
    const orderedPackage = sortPackageJsonDependencies(mergedPackage);

    const jsonString = JSON.stringify(orderedPackage, null, 2);
    await fse.writeFile(targetFile, jsonString, 'utf8');
  } catch (error: any) {
    throw new Error(`Failed to merge package.json: ${error.message}`);
  }
};

/**
 * 特殊文件处理器映射
 */
const fileProcessors: Record<string, FileProcessor> = {
  'package.json': packageJsonProcessor,
  '.ejs': ejsProcessor,
  // 可以在这里添加更多特殊文件的处理器
  // 例如：
  // '.gitignore': mergeGitignore,
  // 'tsconfig.json': mergeTsConfig,
  // 'README.md': mergeReadme,
};

/**
 * 对 package.json 的依赖字段进行排序
 */
const sortPackageJsonDependencies = (packageJson: any): any => {
  const sorted: any = {};

  const depTypes = [
    'dependencies',
    'devDependencies',
    'peerDependencies',
    'optionalDependencies',
  ];

  for (const depType of depTypes) {
    if (packageJson[depType]) {
      sorted[depType] = {};

      Object.keys(packageJson[depType])
        .sort()
        .forEach((name) => {
          sorted[depType][name] = packageJson[depType][name];
        });
    }
  }

  return {
    ...packageJson,
    ...sorted,
  };
};

/**
 * 获取文件的处理器
 */
const getFileProcessor = (filePath: string): FileProcessor | null => {
  // 检查完整文件名
  const fileName = filePath.split('/').pop() || '';
  if (fileProcessors[fileName]) {
    return fileProcessors[fileName];
  }

  // 检查文件扩展名
  const extension = fileName.split('.').pop() || '';
  if (fileProcessors[`.${extension}`]) {
    return fileProcessors[`.${extension}`];
  }

  return null;
};

/**
 * 处理单个文件
 */
const renderFile = async (
  sourceFile: string,
  targetFile: string,
  options: RenderTemplateOptions,
): Promise<void> => {
  const { mode } = options;

  // 检查目标文件是否存在
  const targetExists = await fse.pathExists(targetFile);

  // 获取特殊文件处理器（优先处理特殊文件）
  const processor = getFileProcessor(sourceFile);

  if (processor) {
    await processor(sourceFile, targetFile, options);
    return;
  }
  // 根据不同模式处理文件
  switch (mode) {
    case RenderMode.DIFF_COVER:
      // 直接覆盖（无论文件是否存在）
      await fse.copy(sourceFile, targetFile, { overwrite: true });
      break;

    case RenderMode.INCREMENT:
      // 增量模式：文件不存在的时候才创建
      if (!targetExists) {
        await fse.copy(sourceFile, targetFile, { overwrite: true });
      }
      break;

    default:
      throw new Error(`Unsupported render mode: ${mode}`);
  }
};

/**
 * NestJS 模板渲染选项
 */
export interface RenderNestjsOptions {
  validation: boolean;
  swagger: boolean;
  rateLimit: boolean;
  database: boolean;
  orm: 'prisma' | null;
}

/**
 * 将内置 nestjs 模板中的 .ejs 渲染到已拷贝的目标目录，并删除落盘中的 .ejs 源文件。
 * @param dest 已包含 nestjs 模板完整拷贝的目录（默认模式）；in-place 模式下为已有用户目录
 * @param options NestJS 可选能力配置
 * @param inPlace 是否原地模式：true 时所有复制走 INCREMENT（已存在则保留），package.json.ejs 走 deepmerge
 */
export const renderNestjsEjs = async (
  dest: string,
  options: RenderNestjsOptions,
  { inPlace = false }: { inPlace?: boolean } = {},
): Promise<void> => {
  const src = join(__templateDir, 'nestjs');
  if (!(await fse.pathExists(src))) {
    throw new Error('NestJS template not found in built-in templates');
  }

  const mode = inPlace ? RenderMode.INCREMENT : RenderMode.DIFF_COVER;

  if (options.database && options.orm === 'prisma') {
    const prismaFeaturePath = join(
      __templateDir,
      'nestjs-features',
      'postgres-prisma',
    );
    if (!(await fse.pathExists(prismaFeaturePath))) {
      throw new Error('PostgreSQL + Prisma feature template not found');
    }
    // 默认模式仍用 fse.copy 直接覆盖（目标刚 emptyDir，性能更优）；in-place 模式走 INCREMENT 保留用户文件
    if (inPlace) {
      await renderTemplate(prismaFeaturePath, dest, {
        mode: RenderMode.INCREMENT,
        ...options,
      } as RenderTemplateOptions);
    } else {
      await fse.copy(prismaFeaturePath, dest, { overwrite: true });
    }
  }

  await renderTemplate(src, dest, {
    mode,
    ...options,
  } as RenderTemplateOptions);
  const removeEjs = async (root: string): Promise<void> => {
    if (!(await fse.pathExists(root))) return;
    const entries = await fse.readdir(root, { withFileTypes: true });
    for (const ent of entries) {
      const p = join(root, ent.name);
      if (ent.isDirectory()) {
        await removeEjs(p);
      } else if (ent.isFile() && ent.name.endsWith('.ejs')) {
        await fse.remove(p);
      }
    }
  };
  await removeEjs(dest);
};
