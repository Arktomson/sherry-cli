import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import shell from 'shelljs';

// 创建 spinner 单例，配置动画效果
const spinner = ora({
  spinner: 'dots',
  color: 'cyan'
});

/**
 * 检查终端是否支持 Unicode 字符
 */
export function isUnicodeSupported(): boolean {
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
 * 终端日志符号配置
 */
const mainSymbols = {
  info: chalk.blue('ℹ'),
  success: chalk.green('✔'),
  warning: chalk.yellow('⚠'),
  error: chalk.red('✖'),
  star: chalk.cyan('✵'),
  arrow: chalk.yellow('➦'),
};

const fallbackSymbols = {
  info: chalk.blue('i'),
  success: chalk.green('√'),
  warning: chalk.yellow('‼'),
  error: chalk.red('×'),
  star: chalk.cyan('*'),
  arrow: chalk.yellow('->'),
};

/**
 * 根据终端支持情况选择合适的符号
 */
export const logSymbols = isUnicodeSupported() ? mainSymbols : fallbackSymbols;

/**
 * ASCII 艺术配置
 */
export const asciiArts = [
  {
    text: 'Welcome to Sherry CLI!',
  },
  {
    text: 'Happy Coding!',
  },
  {
    text: "Let's build something cool!",
  },
  {
    text: 'Need help? Try --help',
  },
  {
    text: 'Sherry CLI at your service!',
  },
  {
    text: 'Ready to create awesome projects?',
  },
  {
    text: "Type 'list' to see available templates",
  },
  {
    text: 'Happy to help!',
  },
];

/**
 * 开始加载动画
 */
export const startSpinner = (text: string): void => {
  spinner.text = text;
  if (!spinner.isSpinning) {
    spinner.start();
  }
};

/**
 * 停止加载动画
 */
export const stopSpinner = (type: 'succeed' | 'fail', text: string): void => {
  (spinner as any)[type](text);
};

/**
 * 直接停止 spinner（不显示结果）
 */
export const stopSpinnerOnly = (): void => {
  spinner.stop();
};

/**
 * Inquirer 确认选项接口
 */
interface InquirerConfirmOptions {
  message: string;
  choices?: any[];
  type?: 'confirm' | 'list' | 'input' | 'checkbox' | 'password';
  default?: any;
}

/**
 * 交互式确认对话框
 */
export const inquirerConfirm = async ({ message, choices, type = "confirm", default: defaultValue }: InquirerConfirmOptions): Promise<any> => {
  const answer = await inquirer.prompt({
    name: "confirm",
    type,
    message,
    choices,
    default: defaultValue,
  });
  return answer.confirm;
};

/**
 * 执行可取消的 shell 命令选项接口
 */
interface ExecWithSpinnerOptions {
  command: string;
  loadingText: string;
  successText: string;
  failText?: string;
  cancelText?: string;
}

/**
 * 执行可取消的 shell 命令
 */
export const execWithSpinner = async ({
  command,
  loadingText,
  successText,
  failText = "Command failed",
  cancelText = "Command cancelled",
}: ExecWithSpinnerOptions): Promise<void> => {
  startSpinner(loadingText);

  const child = shell.exec(command, { async: true });

  return new Promise<void>((resolve, reject) => {
    // 处理 SIGINT (Ctrl+C)
    const handleSigInt = () => {
      child.kill("SIGINT");
      stopSpinner("fail", cancelText);
      process.exit(1);
    };

    process.on("SIGINT", handleSigInt);

    child.on("exit", (code: number) => {
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