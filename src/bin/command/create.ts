import { join, basename } from 'path';
import chalk from 'chalk';
import shell from 'shelljs';
import { Command, Option } from 'commander';
import { downloadTemplate, renderNestjsEjs } from '../../utils/index';
import { tryInitGitRepository } from '../../utils/git';
import {
  detectPackageManager,
  installCommand,
  type PackageManager,
} from '../../utils/packageManager';
import {
  cwd,
  template,
  resolveTemplateDirName,
  allTemplateChoices,
  execWithSpinner,
  inquirerConfirm,
} from '../../config';
import { logSymbols } from '../../utils/terminal';

const create = new Command('create')
  .alias('cr')
  .description('create a new app')
  .argument('[app-name]', 'name of the app (optional when --in-place is used)')
  .addOption(
    new Option(
      '-t, --template <template>',
      'choose a template (run `sherry list` to see all available templates)',
    ).choices(allTemplateChoices),
  )
  .option('-f, --force', 'overwrite target directory if it exists', false)
  .option(
    '--in-place',
    'extract template into the current directory instead of creating a subdirectory. Recommended for empty folders; if files already exist they are preserved with a warning, and package.json is deep-merged (user fields win)',
    false,
  )
  .option('--skip-git', 'do not run git init in the new project', false)
  .option(
    '--no-validation',
    'only for nestjs: do not add class-validator, class-transformer, global ValidationPipe',
  )
  .option('--database', 'only for nestjs: add database configuration', false)
  .option(
    '--orm <orm>',
    'only for nestjs database: choose ORM type (currently prisma)',
  )
  .option('--rate-limit', 'only for nestjs: add global rate limiting', false)
  .addOption(
    new Option(
      '--pm <name>',
      'package manager to install dependencies with (overrides auto-detection: lock file → pnpm → npm)',
    ).choices(['npm', 'yarn', 'pnpm']),
  )
  .action(async (name, options) => {
    // --in-place 模式：name 可选；非 in-place：name 必填
    if (!options.inPlace && !name) {
      console.log(
        logSymbols.error,
        'Project name is required (or pass --in-place to extract into the current directory).',
      );
      process.exit(1);
    }

    // 仅校验用户主动传入的 name（in-place 默认用当前目录名时不强制校验）
    if (
      name &&
      name.match(
        /[`~!@#$%^&*()+=|{}':;',\[\].<>/?~！@#￥%……&*（）——+|{}【】'';：""'。，、？\s]/g,
      )
    ) {
      console.log(
        logSymbols.error,
        'Project name contains invalid characters!',
      );
      return;
    }

    try {
      // 如果没有指定模板，显示交互式选择
      if (!options.template) {
        const answer = await inquirerConfirm({
          type: 'list',
          message: 'Please select a template:',
          choices: template.map((t) => ({
            name: `${t.name} - ${t.description}`,
            value: t.name,
          })),
        });
        options.template = answer;
      }

      const dirName = resolveTemplateDirName(options.template);
      let nestValidation = true;
      let nestSwagger = true;
      let nestDatabase = false;
      let nestOrm: 'prisma' | null = null;
      let nestRateLimit = false;
      if (dirName === 'nestjs') {
        if (process.argv.includes('--no-validation')) {
          nestValidation = false;
        } else if (process.stdout.isTTY) {
          nestValidation = await inquirerConfirm({
            type: 'confirm',
            default: true,
            message:
              'Add DTO validation (class-validator, class-transformer, global ValidationPipe)?',
          });
        } else {
          nestValidation = true;
        }

        if (process.stdout.isTTY) {
          nestSwagger = await inquirerConfirm({
            type: 'confirm',
            default: true,
            message: 'Add Swagger (OpenAPI documentation at /api)?',
          });
        } else {
          nestSwagger = true;
        }

        if (options.rateLimit) {
          nestRateLimit = true;
        } else if (process.stdout.isTTY) {
          nestRateLimit = await inquirerConfirm({
            type: 'confirm',
            default: true,
            message: 'Add global rate limiting (100 requests / minute per IP)?',
          });
        }

        if (options.database) {
          nestDatabase = true;
        } else if (process.stdout.isTTY) {
          nestDatabase = await inquirerConfirm({
            type: 'confirm',
            default: false,
            message: 'Add database configuration?',
          });
        }

        if (nestDatabase) {
          const selectedOrm = options.orm
            ? String(options.orm).toLowerCase()
            : process.stdout.isTTY
              ? await inquirerConfirm({
                  type: 'list',
                  message: 'Please select an ORM:',
                  choices: [
                    {
                      name: 'Prisma (PostgreSQL)',
                      value: 'prisma',
                    },
                  ],
                })
              : 'prisma';

          if (selectedOrm !== 'prisma') {
            throw new Error(
              `Unsupported ORM: ${options.orm}. Currently only prisma is supported.`,
            );
          }

          nestOrm = 'prisma';
        }
      }

      // 决定目标路径：in-place 直接用当前目录；否则在 cwd 下新建子目录
      const targetPath = options.inPlace ? cwd : join(cwd, name);
      const projectLabel = options.inPlace ? name || basename(cwd) : name;

      if (options.inPlace) {
        console.log(
          logSymbols.info,
          chalk.dim(
            `In-place mode: applying template into "${targetPath}" (existing files preserved).`,
          ),
        );
      }

      await downloadTemplate(options.template, targetPath, {
        force: options.force,
        inPlace: options.inPlace,
      });

      if (dirName === 'nestjs') {
        await renderNestjsEjs(
          targetPath,
          {
            validation: nestValidation,
            swagger: nestSwagger,
            rateLimit: nestRateLimit,
            database: nestDatabase,
            orm: nestOrm,
          },
          { inPlace: options.inPlace },
        );
      }

      if (!options.skipGit) {
        await tryInitGitRepository(targetPath);
      }

      if (!options.inPlace) {
        console.log(
          logSymbols.arrow,
          chalk.green('enter the project directory'),
        );
        shell.cd(targetPath);
      } else {
        console.log(
          logSymbols.success,
          chalk.green(
            `Template applied to "${projectLabel}" (current directory).`,
          ),
        );
      }

      // 询问是否安装依赖
      const shouldInstall = await inquirerConfirm({
        type: 'confirm',
        message: 'Would you like to install dependencies?',
        default: true,
      });

      if (shouldInstall) {
        const pm: PackageManager =
          (options.pm as PackageManager) || detectPackageManager(targetPath);
        console.log(
          logSymbols.info,
          chalk.dim(
            `Using ${pm}${options.pm ? ' (forced via --pm)' : ' (auto-detected)'}`,
          ),
        );
        await execWithSpinner({
          command: installCommand(pm),
          loadingText: `Installing dependencies with ${pm}...`,
          successText: `Dependencies installed successfully (${pm})`,
          failText: `Dependencies installation failed (${pm})`,
          cancelText: 'Installation cancelled',
        });
      } else {
        const pm =
          (options.pm as PackageManager) || detectPackageManager(targetPath);
        console.log(
          logSymbols.info,
          chalk.blue(
            `You can run '${installCommand(pm)}' later to install dependencies.`,
          ),
        );
      }
    } catch (err: any) {
      console.error(chalk.red(err?.message || err));
      process.exit(1);
    }
  });

export default create;
