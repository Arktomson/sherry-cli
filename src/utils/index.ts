import chalk from "chalk";
import fse from "fs-extra";
import download from "download-git-repo";
import merge from "deepmerge";
import ejs from "ejs"
import { repo, branch } from "../config";
import { join } from "path";
import { startSpinner, stopSpinner, stopSpinnerOnly, inquirerConfirm } from "./terminal";
/**
 * 下载模板
 */
export const downloadTemplate = async (
  template: string,
  dest: string,
  { force = false }: { force?: boolean } = {},
  options: any = {}
): Promise<void> => {
  const tmpDir = `${dest}/.download-temp`;
  try {
    // 确保临时目录存在
    await fse.ensureDir(tmpDir);

    // 首先检查目标目录是否为空
    const exists = await fse.pathExists(dest);
    if (exists) {
      const files = await fse.readdir(dest);
      if (files.length > 0) {
        if (!force) {
          // 停止任何可能正在运行的 spinner
          stopSpinnerOnly();

          console.log(
            chalk.yellow(
              "Target directory is not empty. Use --force to overwrite existing files."
            )
          );
          const confirm = await inquirerConfirm({
            message:
              "Now, You can choose to overwrite the existing files or exit.",
          });
          if (!confirm) {
            // 清理临时目录
            await fse.remove(tmpDir);
            process.exit(1);
          }
        }
        // 如果使用了 force 选项或用户确认，清空目录
        await fse.emptyDir(dest);
      }
    }

    // 开始下载模板
    startSpinner("Downloading template...");

    await new Promise<void>((resolve, reject) => {
      download(`${repo}#${branch}`, tmpDir, options, (err) => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      });
    });

    // 首先验证模板是否存在
    const templatePath = `${tmpDir}/template/${template}`;
    if (!(await fse.pathExists(templatePath))) {
      // 清理临时目录
      await fse.remove(tmpDir);
      throw new Error(`Template ${template} does not exist`);
    }

    // 复制模板文件到目标目录
    await fse.copy(templatePath, dest);

    // 清理临时目录
    await fse.remove(tmpDir);

    stopSpinner("succeed", chalk.green("Template downloaded successfully!"));
  } catch (err: any) {
    stopSpinner("fail", chalk.red(`Download failed: ${err?.message || err}`));
    // 清理临时目录
    if (await fse.pathExists(tmpDir)) {
      await fse.remove(tmpDir);
    }
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
  { concurrency = 5, onProgress }: AsyncQueueOptions = {}
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
  INCREMENT = 'increment'
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
  options: RenderTemplateOptions = { mode: RenderMode.DIFF_COVER }
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
    throw new Error(`Failed to render template from ${source} to ${target}: ${error.message}`);
  }
};

/**
 * 递归处理目录
 */
const renderDirectory = async (
  sourceDir: string,
  targetDir: string,
  options: RenderTemplateOptions
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
type FileProcessor = (sourceFile: string, targetFile: string, options: RenderTemplateOptions) => Promise<void>;

/**
 * EJS 模板处理器
 */
const ejsProcessor = async (
  sourceFile: string,
  targetFile: string,
  options: RenderTemplateOptions
): Promise<void> => {
  try {
    // 读取 ejs 模板文件
    const template = await fse.readFile(sourceFile, 'utf8');
    
    // 生成目标文件名（移除 .ejs 扩展名）
    const actualTargetFile = targetFile.replace(/\.ejs$/, '');
    
    // 检查目标文件是否已存在
    if (await fse.pathExists(actualTargetFile)) {
      console.log(chalk.yellow(`File ${actualTargetFile} already exists, skipping...`));
      return;
    }
    
    // 获取渲染数据（从 options 中获取）
    const ejsData = options;
    
    // 使用 ejs 渲染模板
    const rendered = ejs.render(template, ejsData);
    
    // 写入渲染后的文件
    await fse.writeFile(actualTargetFile, rendered, 'utf8');
  } catch (error: any) {
    throw new Error(`Failed to process EJS template: ${error.message}`);
  }
};
/**
 * 深度合并 package.json 文件
 */
const packageJsonProcessor = async (
  sourceFile: string,
  targetFile: string,
  _options: RenderTemplateOptions
): Promise<void> => {
  try {
    // 读取源文件
    const sourcePackage = await fse.readJSON(sourceFile);
    
    // 检查目标文件是否存在，不存在则使用空对象
    let targetPackage = {};
    if (await fse.pathExists(targetFile)) {
      targetPackage = await fse.readJSON(targetFile);
    }
    
    // 使用 deepmerge 库进行深度合并：目标文件为基础，源文件补充缺失的字段
    const mergedPackage = merge(targetPackage, sourcePackage, {
      // 自定义合并策略：对于数组，去重合并
      customMerge: (key) => {
        if (['keywords', 'files'].includes(key)) {
          return (target: any[], source: any[]) => {
            return [...new Set([...target, ...source])];
          };
        }
      },
      // 不覆盖已存在的值
      isMergeableObject: (value) => {
        return value && typeof value === 'object' && !Array.isArray(value);
      }
    });
    
    // 按照标准的 package.json 字段顺序重新排列
    const orderedPackage = sortPackageJsonDependencies(mergedPackage);
    
    // 写入合并后的内容（不添加末尾换行符）
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

  const depTypes = ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies'];

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
  options: RenderTemplateOptions
): Promise<void> => {
  const { mode } = options;
  
  // 检查目标文件是否存在
  const targetExists = await fse.pathExists(targetFile);
  
  // 获取特殊文件处理器（优先处理特殊文件）
  const processor = getFileProcessor(sourceFile);
  
  if(processor) {
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