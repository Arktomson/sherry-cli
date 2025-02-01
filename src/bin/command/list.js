import { Command } from "commander";
import chalk from "chalk";
import { table } from "table";
import { template } from "../../config.js";

const list = new Command("list")
  .alias("ls")
  .description("list all templates")
  .action(() => {
    // 转换为二维数组
    const data = template.map((item, index) => [
      chalk.hex(`#${Math.floor(Math.random() * 16777215).toString(16)}`)(
        `${index + 1}.`
      ),
      chalk.blue(item.name),
      chalk.gray(item.description),
    ]);

    // 添加表头
    data.unshift([
      chalk.yellowBright("#"),
      chalk.yellowBright("Template Name"),
      chalk.yellowBright("Description"),
    ]);

    const config = {
      header: {
        alignment: "center",
        content: chalk.greenBright("Available Templates"),
      },
      columns: {
        0: { alignment: "center", width: 5 }, // # 列居中且宽度固定
        1: { width: 15 }, // 模板名称列
        2: { width: 30 }, // 描述列
      },
      border: {
        topBody: chalk.gray("─"),
        topJoin: chalk.gray("┬"),
        topLeft: chalk.gray("┌"),
        topRight: chalk.gray("┐"),
        bottomBody: chalk.gray("─"),
        bottomJoin: chalk.gray("┴"),
        bottomLeft: chalk.gray("└"),
        bottomRight: chalk.gray("┘"),
        bodyLeft: chalk.gray("│"),
        bodyRight: chalk.gray("│"),
        bodyJoin: chalk.gray("│"),
        joinBody: chalk.gray("─"),
        joinLeft: chalk.gray("├"),
        joinRight: chalk.gray("┤"),
        joinJoin: chalk.gray("┼"),
      },
    };

    console.log(table(data, config));
  });

export default list;
