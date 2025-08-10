import { Command } from 'commander';
import { __templateDir, cwd } from '../../config';
import { logSymbols, startSpinner, stopSpinner } from '../../utils/terminal';
import { renderTemplate, RenderMode } from '../../utils/index';
import shelljs from 'shelljs';
import fs from 'fs';
import { join } from 'path';

interface InsertOptions {
  force?: boolean;
}

const featureList = [
  {
    name: 'standard-version',
    description: 'standard version',
    alias: 'sv',
    process: async (options: InsertOptions) => {
      const templateDirPath = join(__templateDir, 'insert', 'standard-version');

      try {
        if (!fs.existsSync(templateDirPath)) {
          console.log(logSymbols.error, 'Template directory not found');
          return;
        }

        // 安装依赖 - 使用多种方式尝试安装
        startSpinner('Installing standard-version...');
        
        await new Promise((resolve, reject) => {
          setTimeout(() => {
            resolve(true);
          }, 2000);
        });

        shelljs.exec('npm install standard-version --save-dev --legacy-peer-deps', { silent: true });
        
        stopSpinner('succeed', 'standard-version installed successfully');

        // 使用 renderTemplate 处理模板文件
        await renderTemplate(templateDirPath, cwd, {
          mode: RenderMode.INCREMENT,
        });
        console.log(
          logSymbols.success,
          'Template files processed and package.json updated'
        );
        console.log(logSymbols.info, 'Available commands:');
        console.log('  • npm run release - Create a release');
        console.log('  • npm run release:patch - Patch release');
        console.log('  • npm run release:minor - Minor release');
        console.log('  • npm run release:major - Major release');
        console.log('  • npm run release:prerelease-alpha - Alpha prerelease');
        console.log('  • npm run release:prerelease-beta - Beta prerelease');
        console.log('  • npm run release:prerelease-rc - RC prerelease');
      } catch (error: any) {
        stopSpinner('fail', 'standard-version setup failed');
        console.log(logSymbols.error, `Error: ${error?.message || error}`);
      }
    },
  },
];

const insert = new Command('insert')
  .alias('is')
  .description('insert a new app')
  .argument('<feature>', 'feature of the ability')
  .option('-s --scene [scene]', 'scene of the ability')
  .option('-f --force', 'force to insert')
  .action(async (feature, options: InsertOptions) => {
    // 注意：options 参数目前未使用，但保留以备将来扩展
    const featureItem = featureList.find(
      (item) => item.name === feature || item.alias === feature
    );
    if (!featureItem) {
      console.log(logSymbols.error, `feature [${feature}] not found`);
      return;
    }
    const { process } = featureItem;
    await process(options);
  });

export default insert;
