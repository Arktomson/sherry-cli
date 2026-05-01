import { Command } from 'commander';
import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import ora from 'ora';
import shell from 'shelljs';
import os from 'os';
import { logSymbols } from '../../utils/terminal';
import { formatProcessors } from '../../utils/blog-utils';

/**
 * 将博客内容转换为指定格式
 */
function convertBlogContent(filePath: string, format: string): string {
  if (!fs.existsSync(filePath)) {
    throw new Error(`文件不存在: ${filePath}`);
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const formatLower = format.toLowerCase();

  // 获取对应格式的处理函数链
  const processors = formatProcessors[formatLower];

  if (!processors) {
    throw new Error(`不支持的格式: ${format}`);
  }

  // 依次应用所有处理函数
  return processors.reduce((processedContent, processor) => {
    return processor(processedContent);
  }, content);
}

/**
 * 保存转换后的内容到文件
 */
function saveConvertedContent(
  content: string,
  originalPath: string,
  format: string,
  outputPath: string | null = null,
): string {
  let finalOutputPath: string;

  // 如果没有指定输出路径，生成默认路径
  if (!outputPath) {
    const parsedPath = path.parse(originalPath);
    finalOutputPath = path.join(
      parsedPath.dir,
      `${parsedPath.name}.${format}${parsedPath.ext}`,
    );
  } else {
    // 确保输出路径是绝对路径
    finalOutputPath = path.resolve(process.cwd(), outputPath);
  }

  fs.writeFileSync(finalOutputPath, content, 'utf-8');
  return finalOutputPath;
}

/**
 * 将内容复制到剪贴板
 */
function copyToClipboard(content: string): boolean {
  try {
    const platform = os.platform();
    const tempFile = path.join(os.tmpdir(), `sherry-clip-${Date.now()}.txt`);

    // 将内容写入临时文件
    fs.writeFileSync(tempFile, content, 'utf-8');

    let result;
    // 根据操作系统使用不同的剪贴板命令
    if (platform === 'darwin') {
      // macOS
      result = shell.exec(`cat "${tempFile}" | pbcopy`, { silent: true });
    } else if (platform === 'win32') {
      // Windows
      result = shell.exec(`type "${tempFile}" | clip`, { silent: true });
    } else if (platform === 'linux') {
      // Linux - 尝试多种剪贴板工具
      const xclipExists = shell.which('xclip');
      const xselExists = shell.which('xsel');

      if (xclipExists) {
        result = shell.exec(`cat "${tempFile}" | xclip -selection clipboard`, {
          silent: true,
        });
      } else if (xselExists) {
        result = shell.exec(`cat "${tempFile}" | xsel --clipboard`, {
          silent: true,
        });
      } else {
        throw new Error('找不到支持的剪贴板工具，请安装 xclip 或 xsel');
      }
    } else {
      throw new Error(`不支持的操作系统: ${platform}`);
    }

    // 清理临时文件
    fs.unlinkSync(tempFile);

    if (result && result.code === 0) {
      return true;
    } else {
      throw new Error(
        `剪贴板命令执行失败: ${result ? result.stderr : '未知错误'}`,
      );
    }
  } catch (error: any) {
    console.error(
      logSymbols.error,
      chalk.red(`复制到剪贴板失败: ${error?.message || error}`),
    );
    return false;
  }
}

const blog = new Command('blog')
  .alias('b')
  .description('转换博客内容为特定格式')
  .argument('<file-path>', '博客文件路径')
  .option('-f, --format <format>', '目标格式(目前仅支持juejin)', 'juejin')
  .option(
    '-o, --output <output-path>',
    '输出文件路径，如果不指定则复制到剪贴板',
  )
  .option('-c, --clipboard', '将结果复制到剪贴板而不是保存到文件', false)
  .action((filePath, options) => {
    const spinner = ora('正在转换博客内容...').start();

    try {
      const absolutePath = path.resolve(process.cwd(), filePath);
      const format = options.format;

      // 验证格式是否支持
      if (!formatProcessors[format.toLowerCase()]) {
        spinner.fail(
          `目前仅支持以下格式: ${Object.keys(formatProcessors).join(', ')}`,
        );
        return;
      }

      // 转换内容
      const convertedContent = convertBlogContent(absolutePath, format);

      // 如果用户指定了--clipboard选项或没有指定输出路径，则复制到剪贴板
      if (options.clipboard || !options.output) {
        const success = copyToClipboard(convertedContent);
        if (success) {
          spinner.succeed(`博客内容已成功转换为${format}格式并复制到剪贴板`);
        } else {
          spinner.warn(`博客内容已转换，但复制到剪贴板失败`);
          // 复制失败时默认保存到文件
          if (!options.output) {
            const defaultOutputPath = saveConvertedContent(
              convertedContent,
              absolutePath,
              format,
            );
            console.log(
              logSymbols.success,
              chalk.green(`已保存到文件: ${defaultOutputPath}`),
            );
          }
        }
      }

      // 如果指定了输出路径，则保存到文件
      if (options.output) {
        const outputPath = saveConvertedContent(
          convertedContent,
          absolutePath,
          format,
          options.output,
        );

        spinner.succeed(`博客内容已成功转换为${format}格式`);
        console.log(logSymbols.success, chalk.green(`输出文件: ${outputPath}`));
      }
    } catch (error: any) {
      spinner.fail('转换失败');
      console.error(logSymbols.error, chalk.red(error?.message || error));
    }
  });

export default blog;
