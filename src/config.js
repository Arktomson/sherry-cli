import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { readFile } from "fs/promises";

// 模板列表
export const template = [
  {
    name: "vue3-ts",
    description: "Vue 3 + TypeScript template",
  },
  {
    name: "react-ts",
    description: "React + TypeScript template",
  },
  {
    name: "nextjs",
    description: "Next.js template",
  },
  {
    name: "nuxtjs",
    description: "Nuxt.js template",
  },
  {
    name: "npm-package",
    description: "npm package template",
  },
];

export const __filename = fileURLToPath(import.meta.url);
export const __dirname = dirname(__filename);

const packagePath = join(__dirname, "..", "package.json");
const packageJson = JSON.parse(await readFile(packagePath, "utf8"));
export const { version } = packageJson;

// 路径
export const repo = "Arktomson/cli-template";
export const branch = "master";
export const cwd = process.cwd();

// ASCII art configurations
export const asciiArts = [
  {
    text: "Welcome to Sherry CLI!",
  },
  {
    text: "Happy Coding!",
  },
  {
    text: "Let's build something cool!",
  },
  {
    text: "Need help? Try --help",
  },
  {
    text: "Sherry CLI at your service!",
  },
  {
    text: "Ready to create awesome projects?",
  },
  {
    text: "Type 'list' to see available templates",
  },
  {
    text: "Happy to help!",
  },
];

import { isUnicodeSupported } from "./util.js";
import chalk from "chalk";

const mainSymbols = {
  info: chalk.blue("ℹ"),
  success: chalk.green("✔"),
  warning: chalk.yellow("⚠"),
  error: chalk.red("✖"),
  star: chalk.cyan("✵"),
  arrow: chalk.yellow("➦"),
};

const fallbackSymbols = {
  info: chalk.blue("i"),
  success: chalk.green("√"),
  warning: chalk.yellow("‼"),
  error: chalk.red("×"),
  star: chalk.cyan("*"),
  arrow: chalk.yellow("->"),
};

export const logSymbols = isUnicodeSupported() ? mainSymbols : fallbackSymbols;
