import { existsSync } from 'fs';
import { join } from 'path';
import { execFileSync } from 'child_process';

export type PackageManager = 'pnpm' | 'yarn' | 'npm';

/**
 * 探测系统是否安装了指定 PM（通过执行 `<pm> --version`，静默判断）。
 */
const isPmAvailable = (pm: PackageManager): boolean => {
  try {
    execFileSync(pm, ['--version'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
};

/**
 * 决定该用哪个包管理器安装依赖。
 *
 * 优先级（从高到低）：
 * 1. 目标目录已有 lock 文件 → 用对应 PM（尊重项目既定选择）
 *    - pnpm-lock.yaml     → pnpm
 *    - yarn.lock          → yarn
 *    - package-lock.json  → npm
 * 2. 没 lock 文件且系统装了 pnpm → pnpm（默认偏好：速度快、磁盘占用小）
 * 3. 兜底 → npm（Node 自带，必有）
 *
 * @param projectPath 目标项目目录（不传则用 process.cwd()）
 */
export const detectPackageManager = (
  projectPath: string = process.cwd(),
): PackageManager => {
  if (existsSync(join(projectPath, 'pnpm-lock.yaml'))) return 'pnpm';
  if (existsSync(join(projectPath, 'yarn.lock'))) return 'yarn';
  if (existsSync(join(projectPath, 'package-lock.json'))) return 'npm';

  if (isPmAvailable('pnpm')) return 'pnpm';
  return 'npm';
};

/**
 * 生成 "install all dependencies" 命令字符串
 * - 三种 PM 都支持简短的 `<pm> install`
 */
export const installCommand = (pm: PackageManager): string => `${pm} install`;

/**
 * 生成 "add a dev dependency" 命令字符串
 */
export const addDevDepCommand = (
  pm: PackageManager,
  pkg: string,
  { force = false }: { force?: boolean } = {},
): string => {
  const flag = force ? ' --force' : '';
  switch (pm) {
    case 'yarn':
      return `yarn add -D ${pkg}${flag}`;
    case 'pnpm':
      return `pnpm add -D ${pkg}${flag}`;
    default:
      return `npm install ${pkg} --save-dev${flag}`;
  }
};
