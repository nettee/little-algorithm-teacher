import { Reference } from './types';

/**
 * 清理文本中的 <references> 标记。
 * 如果只遇到了打开标记 <references>，没有对应的关闭标记 </references>，则清理打开标记以后的所有内容。
 * @param text 包含 <references> 标记的文本
 * @returns 清理后的文本
 */
export function cleanReferences(text: string): string {
  // 清理 <references> 标记中的内容
  if (text.includes('<references>') && text.includes('</references>')) {
    text = text.replace(/<references>([\s\S]*?)<\/references>/g, '');
  }

  // 如果只遇到了打开标记 <references>，没有对应的关闭标记 </references>，则清理打开标记以后的所有内容。
  if (text.includes('<references>') && !text.includes('</references>')) {
    text = text.replace(/<references>[\s\S]*$/g, '');
  }

  return text;
}

/**
 * 解析文本中的 <reference> 标记
 * @param text 包含 reference 标记的文本
 * @returns 解析结果，只包含提取的引用
 */
export function parseReferences(text: string): {
  references: Reference[];
} {
  const references: Reference[] = [];
  
  // 先匹配外层 <reference> 标签，获取内容
  const referenceRegex = /<reference>([\s\S]*?)<\/reference>/g;
  
  let match;
  while ((match = referenceRegex.exec(text)) !== null) {
    const referenceContent = match[1];
    
    // 在 reference 内容中查找 artifactId 和 title，不要求特定顺序
    // 使用更严格的正则表达式，不允许嵌套标签
    const artifactIdMatch = referenceContent.match(/<artifactId>([^<]+)<\/artifactId>/);
    const titleMatch = referenceContent.match(/<title>([^<]+)<\/title>/);
    
    // 只有当两个标签都存在且内容不为空时才创建引用对象
    if (artifactIdMatch && titleMatch) {
      const artifactId = artifactIdMatch[1].trim();
      const title = titleMatch[1].trim();
      
      // 只有当 artifactId 和 title 都不为空时才添加引用
      if (artifactId && title) {
        const reference: Reference = {
          artifactId: artifactId,
          title: title,
        };
        
        references.push(reference);
      }
    }
  }
  
  return {
    references,
  };
}

