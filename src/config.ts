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

/**
 * 所有可作为 `-t` 取值的合法模板名（主名 + 别名），用于 commander 的 `.choices()` 校验。
 * 未来新增模板 / 别名时，只改 `template` 与 `templateDirAliases` 两处，这里自动同步。
 */
export const allTemplateChoices: string[] = [
  ...new Set([
    ...template.map((t) => t.name),
    ...Object.keys(templateDirAliases),
  ]),
];

export const __filename = fileURLToPath(import.meta.url);
export const __dirname = dirname(__filename);

export const __templateDir = join(__dirname, 'template');

const packagePath = join(__dirname, '..', 'package.json');
const packageJson: { version: string } = JSON.parse(
  await readFile(packagePath, 'utf8'),
);
export const { version } = packageJson;

export const cwd = process.cwd();

export const ApplicationScene = [
  {
    name: 'web',
    alias: 'w',
  },
  {
    name: 'browser-plugin',
    alias: 'bp',
  },
];
export const BrowserPluginScene = ApplicationScene.find(
  (item) => item.name === 'browser-plugin',
)!;
// Re-export terminal utilities
export {
  logSymbols,
  asciiArts,
  inquirerConfirm,
  execWithSpinner,
} from './utils/terminal';
