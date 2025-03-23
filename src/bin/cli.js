#!/usr/bin/env node

import { program } from "commander";
import chalk from "chalk";
import { version, asciiArts } from "../config.js";
import { createRequire } from "module";
import create from "./command/create.js";
import list from "./command/list.js";
import count from "./command/count.js";
import blog from "./command/blog.js";
const require = createRequire(import.meta.url);
const cowsay = require("cowsay");

program
  .name("sherry-cli")
  .description("cli工具")
  .version(version, "-v, --version", "output the version number")
  .usage("<command> [options]")
  .helpOption("-h, --help", "display help for command")
  .addHelpText(
    "beforeAll",
    chalk.greenBright.bold(
      (() => {
        const art = asciiArts[Math.floor(Math.random() * asciiArts.length)];
        return cowsay.say({
          text: art.text,
          r: true,
        });
      })()
    ) + "\n"
  )
  .addHelpText(
    "after",
    `\nRun ${chalk.cyan(`sherry-cli <command> --help`)} for detailed usage of given command\n`
  );

// Add commands
program.addCommand(create);
// Add list command
program.addCommand(list);
// Add count command
program.addCommand(count);
// Add blog command
program.addCommand(blog);

program.parse(process.argv);
