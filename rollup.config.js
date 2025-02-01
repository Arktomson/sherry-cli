import { defineConfig } from "rollup";
import commonjs from "@rollup/plugin-commonjs";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import json from "@rollup/plugin-json";
import terser from "@rollup/plugin-terser";
import pkg from "./package.json" assert { type: "json" };

// 外部依赖，不打包进最终文件
const external = [
  ...Object.keys(pkg.dependencies || {}),
  ...Object.keys(pkg.peerDependencies || {}),
];

const plugins = [
  nodeResolve({
    preferBuiltins: true,
  }),
  commonjs(),
  json(),
  terser(),
];

export default defineConfig([
  // CLI 入口文件
  {
    input: "src/bin/cli.js",
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
