import { Reference } from './types';

/**
 * 解析文本中的 <reference> 标记
 * @param text 包含 reference 标记的文本
 * @returns 解析结果，包含清理后的文本和提取的引用
 */
export function parseReferences(text: string): {
  cleanText: string;
  references: Reference[];
} {
  const references: Reference[] = [];
  
  // 先匹配外层 <reference> 标签，获取内容
  const referenceRegex = /<reference>([\s\S]*?)<\/reference>/g;
  const validReferences: string[] = []; // 只保存有效的 reference 标签用于清理
  
  let match;
  while ((match = referenceRegex.exec(text)) !== null) {
    const referenceContent = match[1];
    const fullMatch = match[0];
    
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
        validReferences.push(fullMatch); // 只有有效的引用才会被清理
      }
    }
  }
  
  // 移除文本中的有效 reference 标记，得到清理后的文本
  let cleanText = text;
  validReferences.forEach(refTag => {
    cleanText = cleanText.replace(refTag, '');
  });
  
  // 只清理首尾空白字符，保持原有的内部空白结构
  cleanText = cleanText.trim();
  
  return {
    cleanText,
    references,
  };
}

