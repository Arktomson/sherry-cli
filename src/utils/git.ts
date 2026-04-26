import { existsSync } from "fs";
import { join } from "path";
import { execFile } from "child_process";
import { promisify } from "util";
import chalk from "chalk";
import { logSymbols } from "./terminal";

const execFileAsync = promisify(execFile);

/**
 * 在新项目根目录执行 `git init`（与 nest new / 多数官方脚手架类似）。
 * 不自动做首次 commit，避免未配置 user.name / email 时失败。
 */
export const tryInitGitRepository = async (
  projectPath: string
): Promise<void> => {
  if (existsSync(join(projectPath, ".git"))) {
    console.log(
      logSymbols.info,
      chalk.dim("Git repository already present, skipping git init.")
    );
    return;
  }

  try {
    await execFileAsync("git", ["-c", "init.defaultBranch=main", "init"], {
      cwd: projectPath,
    });
    console.log(
      logSymbols.success,
      chalk.green("Initialized empty Git repository in .git/ (default branch: main).")
    );
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    const likelyMissing = /ENOENT|not found|spawn/i.test(msg);
    console.log(
      logSymbols.warning,
      chalk.yellow(
        likelyMissing
          ? "Git not found in PATH; skipped git init. Install Git and run: git init"
          : `git init skipped: ${msg}`
      )
    );
  }
};
