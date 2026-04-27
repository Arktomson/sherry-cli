import { join } from "path";
import chalk from "chalk";
import shell from "shelljs";
import { Command } from "commander";
import { downloadTemplate, renderNestjsEjs } from "../../utils/index";
import { tryInitGitRepository } from "../../utils/git";
import { cwd, template, resolveTemplateDirName, execWithSpinner, inquirerConfirm } from "../../config";
import { logSymbols } from "../../utils/terminal";

const create = new Command("create")
  .alias("cr")
  .description("create a new app")
  .argument("<app-name>", "name of the app")
  .option(
    "-t, --template <template>",
    "choose a template through the list command to check the template type"
  )
  .option("-f, --force", "overwrite target directory if it exists", false)
  .option("--skip-git", "do not run git init in the new project", false)
  .option(
    "--no-validation",
    "only for nestjs: do not add class-validator, class-transformer, global ValidationPipe"
  )
  .action(async (name, options) => {
    // 验证name输入是否合法
    if (
      name.match(
        /[`~!@#$%^&*()+=|{}':;',\[\].<>/?~！@#￥%……&*（）——+|{}【】'；：""'。，、？\s]/g
      )
    ) {
      console.log(
        logSymbols.error,
        "Project name contains invalid characters!"
      );
      return;
    }

    try {
      // 如果没有指定模板，显示交互式选择
      if (!options.template) {
        const answer = await inquirerConfirm({
          type: "list",
          message: "Please select a template:",
          choices: template.map((t) => ({
            name: `${t.name} - ${t.description}`,
            value: t.name,
          })),
        });
        options.template = answer;
      }

      const dirName = resolveTemplateDirName(options.template);
      let nestValidation = true;
      if (dirName === "nestjs") {
        if (process.argv.includes("--no-validation")) {
          nestValidation = false;
        } else if (process.stdout.isTTY) {
          nestValidation = await inquirerConfirm({
            type: "confirm",
            default: true,
            message:
              "Add DTO validation (class-validator, class-transformer, global ValidationPipe)?",
          });
        } else {
          nestValidation = true;
        }
      }

      const targetPath = join(cwd, name);
      await downloadTemplate(options.template, targetPath, {
        force: options.force,
      });

      if (dirName === "nestjs") {
        await renderNestjsEjs(targetPath, nestValidation);
      }

      if (!options.skipGit) {
        await tryInitGitRepository(targetPath);
      }

      console.log(logSymbols.arrow, chalk.green("enter the project directory"));

      shell.cd(targetPath);

      // 询问是否安装依赖
      const shouldInstall = await inquirerConfirm({
        type: "confirm",
        message: "Would you like to install dependencies?",
        default: true,
      });

      if (shouldInstall) {
        await execWithSpinner({
          command: "npm install",
          loadingText: "Installing dependencies...",
          successText: "Dependencies installed successfully",
          failText: "Dependencies installation failed",
          cancelText: "Installation cancelled",
        });
      } else {
        console.log(
          logSymbols.info,
          chalk.blue("You can run 'npm install' later to install dependencies.")
        );
      }
    } catch (err: any) {
      console.error(chalk.red(err?.message || err));
      process.exit(1);
    }
  });

export default create;
