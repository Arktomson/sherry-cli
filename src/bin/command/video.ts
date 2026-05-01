import { Command } from 'commander';
import chalk from 'chalk';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { logSymbols } from '../../utils/terminal';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const video = new Command('video')
  .alias('v')
  .description('video processing utilities')
  .option('-g, --generate', 'generate captions/subtitles for video files')
  .option(
    '-d, --dir <directory>',
    'directory containing video files (default: current directory)',
  )
  .action(async (options) => {
    if (!options.generate) {
      console.log(
        logSymbols.error,
        chalk.red('Please specify an action. Use -g to generate captions.'),
      );
      return;
    }

    if (options.generate) {
      await generateCaptions(options);
    }
  });

async function checkPythonDependencies() {
  // 检查 Python 3
  try {
    const pythonVersion = spawn('python3', ['--version'], {
      stdio: 'pipe',
      shell: true,
    });

    await new Promise<void>((resolve, reject) => {
      pythonVersion.on('close', (code) => {
        if (code !== 0) reject(new Error('Python 3 not found'));
        else resolve();
      });
    });
  } catch (e) {
    console.log(logSymbols.error, chalk.red('需要 Python 3'));
    console.log(
      logSymbols.info,
      chalk.yellow('请安装 Python 3: https://www.python.org/downloads/'),
    );
    return false;
  }

  return true;
}

interface GenerateCaptionsOptions {
  dir?: string;
  [key: string]: any;
}

async function generateCaptions(
  options: GenerateCaptionsOptions,
): Promise<void> {
  // 检查 Python 环境
  if (!(await checkPythonDependencies())) {
    return;
  }

  // 生产环境: dist/scripts/   开发环境: src/bin/scripts/
  const scriptPath = join(__dirname, 'scripts', 'whisper_subtitles.py');
  const pythonScriptPath = existsSync(scriptPath)
    ? scriptPath
    : join(__dirname, '..', 'scripts', 'whisper_subtitles.py');

  if (!existsSync(pythonScriptPath)) {
    console.log(
      logSymbols.error,
      chalk.red(`Python 脚本文件不存在: ${pythonScriptPath}`),
    );
    return;
  }

  try {
    console.log(logSymbols.info, chalk.blue('准备调用 Python 脚本处理视频...'));

    // 构建 Python 命令
    const pythonProcess = spawn('python3', [pythonScriptPath], {
      cwd: options.dir || process.cwd(),
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    // 处理 Python 脚本输出
    pythonProcess.stdout.on('data', (data) => {
      const output = data.toString();
      // 直接输出，不做trim，保留原始格式以支持进度条
      process.stdout.write(output);
    });

    pythonProcess.stderr.on('data', (data) => {
      const error = data.toString().trim();
      if (error && !error.includes('[W:onnxruntime')) {
        console.error(chalk.red(error));
      }
    });

    // 处理用户输入
    process.stdin.on('data', (data) => {
      pythonProcess.stdin.write(data);
    });

    // 等待 Python 脚本完成
    await new Promise<void>((resolve, reject) => {
      pythonProcess.on('close', (code) => {
        if (code === 0) {
          console.log(logSymbols.success, chalk.green('\nPython 脚本执行完成'));
          resolve();
        } else {
          console.log(
            logSymbols.error,
            chalk.red(`\nPython 脚本退出，代码: ${code}`),
          );
          reject(new Error(`Python script exited with code ${code}`));
        }
      });

      pythonProcess.on('error', (err) => {
        console.log(
          logSymbols.error,
          chalk.red(`执行 Python 脚本时出错: ${err.message}`),
        );
        reject(err);
      });
    });
  } catch (error: any) {
    console.log(
      logSymbols.error,
      chalk.red(`发生错误: ${error?.message || error}`),
    );
  }
}

export default video;
