import { defineConfig } from "rollup";
import commonjs from "@rollup/plugin-commonjs";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import json from "@rollup/plugin-json";
import terser from "@rollup/plugin-terser";
import typescript from "@rollup/plugin-typescript";
import copy from "rollup-plugin-copy";
import del from "rollup-plugin-delete";
import { chmod } from "fs";
import pkg from "./package.json" assert { type: "json" };

// 自动设置文件权限的插件
const chmodPlugin = () => ({
  name: 'chmod',
  generateBundle() {
    // 构建完成后设置执行权限
    this.emitFile({
      type: 'asset',
      fileName: 'chmod.js',
      source: ''
    });
  },
  writeBundle() {
    chmod('dist/cli.js', 0o755, (err) => {
      if (err) console.error('Failed to set executable permission:', err);
    });
  }
});

// 外部依赖，不打包进最终文件
const external = [
  ...Object.keys(pkg.dependencies || {}),
  ...Object.keys(pkg.peerDependencies || {}),
];

const plugins = [
  // 清理 dist 目录
  del({ 
    targets: 'dist/*',
    verbose: true 
  }),
  // TypeScript 编译
  typescript({
    tsconfig: './tsconfig.json',
    declaration: false, // 不生成 .d.ts 文件
  }),
  nodeResolve({
    preferBuiltins: true,
  }),
  commonjs(),
  json(),
  // 复制模板文件到 dist 目录
  copy({
    targets: [
      { src: "src/template", dest: "dist" }
    ]
  }),
  terser(),
  // 自动设置执行权限
  chmodPlugin(),
];

export default defineConfig([
  // CLI 入口文件
  {
    input: "src/bin/cli.ts",
    output: {
      file: "dist/cli.js",
      format: "es",
      banner: "#!/usr/bin/env node",
    },
    external,
    plugins,
  },
  // 库文件 - CommonJS 格式
  // {
  //   input: "src/index.js",
  //   output: {
  //     file: pkg.main,
  //     format: "cjs",
  //   },
  //   external,
  //   plugins,
  // },
  // // 库文件 - ES Module 格式
  // {
  //   input: "src/index.js",
  //   output: {
  //     file: pkg.module,
  //     format: "es",
  //   },
  //   external,
  //   plugins,
  // },
]);
