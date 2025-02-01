import chalk from "chalk";
import fse from "fs-extra";
import download from "download-git-repo";
import ora from "ora";
import { repo, branch } from "./config.js";
import inquirer from "inquirer";
import shell from "shelljs";

// 创建 spinner 单例
const spinner = ora();

export const inquirerConfirm = async ({ message, choices, type }) => {
  const answer = await inquirer.prompt({
    name: "confirm",
    type: type || "confirm",
    message,
    choices,
  });
  return answer.confirm;
};

/**
 * 开始加载动画
 * @param {string} text - 加载提示文字
 */
export const startSpinner = (text) => {
  spinner.text = text;
  spinner.start();
};

/**
 * 停止加载动画
 * @param {string} type - 停止类型 'succeed' | 'fail'
 * @param {string} text - 停止时显示的文字
 */
export const stopSpinner = (type, text) => {
  spinner[type](text);
};

/**
 * 下载模板
 * @param {string} template - 模板名称
 * @param {string} dest - 目标路径
 * @param {string} options - 选项
 * @returns {Promise<void>}
 */
export const downloadTemplate = async (
  template,
  dest,
  { force = false } = {},
  options = {}
) => {
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
          spinner.stop();

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

    await new Promise((resolve, reject) => {
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
  } catch (err) {
    stopSpinner("fail", chalk.red(`Download failed: ${err.message}`));
    // 清理临时目录
    if (await fse.pathExists(tmpDir)) {
      await fse.remove(tmpDir);
    }
    throw err;
  }
};

export function isUnicodeSupported() {
  // 操作系统平台是否为 win32（Windows）
  if (process.platform !== "win32") {
    // 判断 process.env.TERM 是否为 'linux'，
    // 这表示在 Linux 控制台（内核）环境中。
    return process.env.TERM !== "linux"; // Linux console (kernel)
  }

  return (
    Boolean(process.env.CI) || // 是否在持续集成环境中
    Boolean(process.env.WT_SESSION) || // Windows 终端环境（Windows Terminal）中的会话标识
    Boolean(process.env.TERMINUS_SUBLIME) || // Terminus 插件标识
    process.env.ConEmuTask === "{cmd::Cmder}" || // ConEmu 和 cmder 终端中的任务标识
    process.env.TERM_PROGRAM === "Terminus-Sublime" ||
    process.env.TERM_PROGRAM === "vscode" || // 终端程序的标识，可能是 'Terminus-Sublime' 或 'vscode'
    process.env.TERM === "xterm-256color" ||
    process.env.TERM === "alacritty" || // 终端类型，可能是 'xterm-256color' 或 'alacritty'
    process.env.TERMINAL_EMULATOR === "JetBrains-JediTerm" // 终端仿真器的标识，可能是 'JetBrains-JediTerm'
  );
}

/**
 * 执行可取消的 shell 命令
 * @param {string} command - 要执行的命令
 * @param {string} loadingText - 加载时显示的文字
 * @param {string} successText - 成功时显示的文字
 * @param {string} failText - 失败时显示的文字
 * @param {string} cancelText - 取消时显示的文字
 * @returns {Promise<void>}
 */
export const execWithSpinner = async ({
  command,
  loadingText,
  successText,
  failText = "Command failed",
  cancelText = "Command cancelled",
}) => {
  startSpinner(loadingText);

  const child = shell.exec(command, { async: true });

  return new Promise((resolve, reject) => {
    // 处理 SIGINT (Ctrl+C)
    const handleSigInt = () => {
      child.kill("SIGINT");
      stopSpinner("fail", cancelText);
      process.exit(1);
    };

    process.on("SIGINT", handleSigInt);

    child.on("exit", (code) => {
      // 移除信号处理器，防止内存泄漏
      process.off("SIGINT", handleSigInt);

      if (code === 0) {
        stopSpinner("succeed", successText);
        resolve();
      } else {
        stopSpinner("fail", failText);
        reject(new Error(failText));
      }
    });
  });
};

/**
 * 创建异步队列处理器
 * @param {Array} items - 要处理的项目数组
 * @param {Function} handler - 处理每个项目的异步函数
 * @param {Object} options - 配置选项
 * @param {number} options.concurrency - 并发数，默认为 5
 * @param {Function} options.onProgress - 进度回调函数
 * @returns {Promise<Array>} - 返回处理结果数组
 */
export const createAsyncQueue = async (
  items,
  handler,
  { concurrency = 5, onProgress } = {}
) => {
  const results = [];
  let completed = 0;
  let running = 0;
  let index = 0;

  return new Promise((resolve) => {
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
