import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';

// 模板接口定义
interface Template {
  name: string;
  description: string;
}

// 模板列表
export const template: Template[] = [
  {
    name: 'vue3-ts',
    description: 'Vue 3 + TypeScript template',
  },
  {
    name: 'react-ts',
    description: 'React + TypeScript template',
  },
  {
    name: 'nextjs',
    description: 'Next.js template',
  },
  {
    name: 'nuxtjs',
    description: 'Nuxt.js template',
  },
  {
    name: 'nestjs',
    description: 'NestJS (default @nestjs/cli starter)',
  },
];

/**
 * 与 `src/template/<目录名>` 对应；短名/惯用别名
 */
export const templateDirAliases: Record<string, string> = {
  'vue-ts': 'vue3-ts',
  vue: 'vue3-ts',
  nest: 'nestjs',
};

export const resolveTemplateDirName = (name: string): string =>
  templateDirAliases[name] ?? name;

export const __filename = fileURLToPath(import.meta.url);
export const __dirname = dirname(__filename);

export const __templateDir = join(__dirname, 'template');

const packagePath = join(__dirname, '..', 'package.json');
const packageJson: { version: string } = JSON.parse(await readFile(packagePath, 'utf8'));
export const { version } = packageJson;

export const cwd = process.cwd();

/**
 * 检测项目使用的包管理器
 */
export const getPackageManager = (): 'yarn' | 'pnpm' | 'npm' => {
  // 检查 lock 文件
  if (existsSync(join(cwd, 'yarn.lock'))) {
    return 'yarn';
  }
  
  if (existsSync(join(cwd, 'pnpm-lock.yaml'))) {
    return 'pnpm';
  }
  
  // 默认使用 npm
  return 'npm';
};

// 导出包管理器
export const packageManager = getPackageManager();

export const ApplicationScene = [
  {
    name: 'web',
    alias: 'w',
  },
  {
    name: 'browser-plugin',
    alias: 'bp',
  }
]
export const BrowserPluginScene = ApplicationScene.find(item => item.name === 'browser-plugin')!;
// Re-export terminal utilities
export { logSymbols, asciiArts, inquirerConfirm, execWithSpinner } from './utils/terminal';