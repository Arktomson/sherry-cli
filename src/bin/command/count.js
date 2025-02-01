import { Command } from "commander";
import fs from "fs/promises";
import path from "path";
import { createAsyncQueue } from "../../util.js";
import ora from "ora";

// Define code file extensions to count
const CODE_FILE_EXTENSIONS = [
  ".js",
  ".jsx",
  ".ts",
  ".tsx",
  ".vue",
  ".css",
  ".scss",
  ".less",
  ".html",
  ".json",
  ".md",
];

// Count lines in a single file
const countFileLines = async (filePath) => {
  try {
    const content = await fs.readFile(filePath, "utf-8");
    return content.split("\n").length;
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error.message);
    return 0;
  }
};

// Recursively get all files in directory
const getAllFiles = async (dirPath, fileList = []) => {
  const files = await fs.readdir(dirPath);

  for (const file of files) {
    const filePath = path.join(dirPath, file);
    const stat = await fs.stat(filePath);

    if (
      stat.isDirectory() &&
      !file.startsWith(".") &&
      file !== "node_modules"
    ) {
      await getAllFiles(filePath, fileList);
    } else if (stat.isFile()) {
      fileList.push(filePath);
    }
  }

  return fileList;
};

// 创建目录树结构
const createDirectoryTree = (fileStats) => {
  const tree = {
    name: "",
    isDirectory: true,
    children: {},
    totalLines: 0,
  };

  fileStats.forEach(({ file, lines }) => {
    const parts = file.split(path.sep);
    let current = tree;

    parts.forEach((part, index) => {
      if (index === parts.length - 1) {
        // 文件节点
        current.children[part] = {
          name: part,
          isDirectory: false,
          lines,
        };
      } else {
        // 目录节点
        if (!current.children[part]) {
          current.children[part] = {
            name: part,
            isDirectory: true,
            children: {},
            totalLines: 0,
          };
        }
        current.children[part].totalLines += lines;
        current = current.children[part];
      }
    });
  });

  return tree;
};

// 打印树形结构
const printTree = (node, prefix = "", isLast = true) => {
  if (!node.name) {
    // 根节点特殊处理
    Object.values(node.children).forEach((child, index, array) => {
      printTree(child, "", index === array.length - 1);
    });
    return;
  }

  const marker = isLast ? "└── " : "├── ";
  const subPrefix = prefix + (isLast ? "    " : "│   ");

  if (node.isDirectory) {
    console.log(
      `${prefix}${marker}${node.name}${node.totalLines > 0 ? ` (${node.totalLines} lines)` : ""}`
    );
    Object.values(node.children).forEach((child, index, array) => {
      printTree(child, subPrefix, index === array.length - 1);
    });
  } else {
    console.log(
      `${prefix}${marker}${node.name.padEnd(45 - prefix.length)}${node.lines.toString().padStart(6)} lines`
    );
  }
};

const count = new Command("count")
  .alias("c")
  .description("Count lines of code in current directory")
  .action(async () => {
    try {
      const spinner = ora("Scanning files...").start();
      const currentDir = process.cwd();
      const files = await getAllFiles(currentDir);

      spinner.text = "Counting lines...";
      let totalLines = 0;
      const fileStats = [];

      // 使用异步队列处理文件
      await createAsyncQueue(
        files,
        async (file) => {
          const lines = await countFileLines(file);
          totalLines += lines;
          fileStats.push({
            file: path.relative(currentDir, file),
            lines,
          });
        },
        {
          concurrency: 10,
          onProgress: (completed, total) => {
            spinner.text = `Counting lines... ${completed}/${total} files processed`;
          },
        }
      );

      spinner.stop();

      // Output results
      console.log("\n📊 Code Lines Statistics:\n");

      // 创建并打印树形结构
      const tree = createDirectoryTree(fileStats);
      printTree(tree);

      console.log("\n" + "=".repeat(60));
      console.log(`\n📈 Total: ${totalLines} lines of code`);
      console.log(`🗂  Files counted: ${files.length}\n`);
    } catch (error) {
      console.error("Error during counting:", error.message);
    }
  });

export default count;
