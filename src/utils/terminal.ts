import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import shell from 'shelljs';
import { promisify } from 'util';
import { exec } from 'child_process';
import { spawn } from 'child_process';
// 创建 promise 版本的 exec

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

interface ExecuteOptions {
  silent?: boolean;  // true: 静默执行, false: 显示日志
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  [key: string]: any;
}

export const executeAsync = async (
  command: string, 
  options: ExecuteOptions = {}
): Promise<{code: number, stdout: string, stderr: string}> => {
  const { silent = false, ...spawnOptions } = options;
  
  return new Promise((resolve, reject) => {
    const [cmd, ...args] = command.split(' ');
    
    const child = spawn(cmd, args, {
      stdio: silent ? ['inherit', 'pipe', 'pipe'] : 'inherit',
      ...spawnOptions
    });
    
    if (silent) {
      let stdout = '';
      let stderr = '';
      
      // 静默模式：收集输出但不显示
      child.stdout?.on('data', (data) => {
        stdout += data.toString();
      });
      
      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });
      
      child.on('close', (code) => {
        resolve({ code: code || 0, stdout, stderr });
      });
      
      child.on('error', (error) => {
        reject({ 
          code: 1, 
          stdout, 
          stderr, 
          message: error.message 
        });
      });
    } else {
      // 非静默模式：直接继承父进程 stdio，避免与 spinner 冲突
      child.on('close', (code) => {
        resolve({ code: code || 0, stdout: '', stderr: '' });
      });
      
      child.on('error', (error) => {
        reject({ 
          code: 1, 
          stdout: '', 
          stderr: '', 
          message: error.message 
        });
      });
    }
  });
};

/**
 * 执行命令并显示实时输出，同时保持 spinner 状态管理
 */
export const executeWithSpinner = async (
  command: string,
  loadingText: string,
  successText: string,
  options: ExecuteOptions = {}
): Promise<{code: number, stdout: string, stderr: string}> => {
  // 开始 spinner
  startSpinner(loadingText);
  
  return new Promise((resolve, reject) => {
    const [cmd, ...args] = command.split(' ');
    
    const child = spawn(cmd, args, {
      stdio: 'inherit', // 直接显示输出
      ...options
    });
    
    child.on('close', (code) => {
      if (code === 0) {
        stopSpinner('succeed', successText);
        resolve({ code: 0, stdout: '', stderr: '' });
      } else {
        stopSpinner('fail', 'Command failed');
        resolve({ code: code || 1, stdout: '', stderr: '' });
      }
    });
    
    child.on('error', (error) => {
      stopSpinner('fail', `Error: ${error.message}`);
      reject({ 
        code: 1, 
        stdout: '', 
        stderr: '', 
        message: error.message 
      });
    });
  });
};
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