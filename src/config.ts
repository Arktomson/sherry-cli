import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFile } from 'fs/promises';

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
    name: 'npm-package',
    description: 'npm package template',
  },
];

export const __filename = fileURLToPath(import.meta.url);
export const __dirname = dirname(__filename);

export const __templateDir = join(__dirname, 'template');

const packagePath = join(__dirname, '..', 'package.json');
const packageJson: { version: string } = JSON.parse(await readFile(packagePath, 'utf8'));
export const { version } = packageJson;

// 路径
export const repo = 'Arktomson/cli-template';
export const branch = 'master';
export const cwd = process.cwd();

// Re-export terminal utilities
export { logSymbols, asciiArts, inquirerConfirm, execWithSpinner } from './utils/terminal';