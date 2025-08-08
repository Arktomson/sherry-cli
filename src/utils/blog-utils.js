/**
 * 添加掘金页脚处理函数
 * @type {ProcessorFunction}
 */
export function addJuejinFooter(content) {
  // ✍️ 本文使用 [sherry-cli](https://github.com/Arktomson/sherry-cli) 工具转换生成
 
  const juejinFooter = `
  🌸 欢迎访问我的个人博客: [百里静修的花园](https://arktomson.github.io/my-garden/)
  `;
  return content + juejinFooter;
}
export function addJuejinHeader(content) {
  const juejinHeader = `
  🌸 欢迎访问我的个人博客: [百里静修的花园](https://arktomson.github.io/my-garden/)
  `;
  return juejinHeader + content;
}
/**
 * 处理图片链接函数
 * @type {ProcessorFunction}
 */
export function processImageLinks(content) {
  // 这里可以添加处理图片链接的逻辑
  // 目前只是简单返回原内容，未来可以根据需求实现
  return content;
}

/**
 * 移除一级标题函数
 * @type {ProcessorFunction}
 */
export function removeH1Title(content) {
  // 找到文章中的第一个一级标题并移除整行
  return content.replace(/^\s*# .+$/m, "");
}

/**
 * 处理代码块函数
 * @type {ProcessorFunction}
 */
export function processCodeBlocks(content) {
  // 这里可以添加处理代码块的逻辑
  // 目前只是简单返回原内容，未来可以根据需求实现
  return content;
}

/**
 * 处理特殊标签函数，移除特定文档工具使用的标签
 * @type {ProcessorFunction}
 */
export function removeSpecialTags(content) {
  // 首先处理 :::code-group 标签，只删除标签，保留内容
  let processedContent = content
    // 替换开始标签 :::code-group
    .replace(/^:::code-group\s*$/gm, "")
    // 替换独立的结束标签 :::
    .replace(/^:::$/gm, "")
    // 处理其他特殊标签
    .replace(/:::\s*$/gm, "") // 移除行尾的 ::: 标签
    .replace(/^:::(?!code)[^\n]*$/gm, "") // 移除不是code块的单行:::xxx标签
    .replace(/^::: \w+\s*$/gm, "") // 移除形如 ::: warning 的标签
    .replace(/\s*::: \w+\s*/g, ""); // 移除内容中的 ::: 标签

  // 将代码块前的文件名标记[file.js]转换为* file.js形式
  // ```js[filename.js] -> * filename.js
  processedContent = processedContent.replace(
    /```(\w+)\s*\[([-\w\.]+)\]/g,
    function (match, language, filename) {
      return "* " + filename + "\n\n```" + language;
    }
  );

  // 去除连续的空行
  processedContent = processedContent.replace(/\n{3,}/g, "\n\n");

  return processedContent;
}

/**
 * 格式处理器映射表
 * @type {Object.<string, Array.<ProcessorFunction>>}
 */
export const formatProcessors = {
  // 掘金格式的处理函数链
  juejin: [
    removeSpecialTags,
    removeH1Title,
    addJuejinHeader,
    // processImageLinks,
    // processCodeBlocks,
    // addJuejinFooter,
  ],
  // 未来可以添加其他格式的处理函数链
};
