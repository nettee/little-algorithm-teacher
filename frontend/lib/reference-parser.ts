import { Reference, ReferenceType } from './types';

export class TextPart {
  type: 'plain-text' | 'complete-references' | 'incomplete-references';
  text: string;

  constructor(type: 'plain-text' | 'complete-references' | 'incomplete-references', text: string) {
    this.type = type;
    this.text = text;
  }

  static plainText(text: string): TextPart {
    return new TextPart('plain-text', text);
  }

  static completeReferences(text: string): TextPart {
    return new TextPart('complete-references', text);
  }

  static incompleteReferences(text: string): TextPart {
    return new TextPart('incomplete-references', text);
  }
}

/**
 * 根据 <references> 和 </references> 标记将文本拆分成多个部分。
 * 为了处理流式输出，如果只遇到了打开标记 <references>，没有对应的关闭标记 </references>，则认为 <references> 标记后面的所有内容都是引用的一部分。
 * 
 * 例如：
 * 输入：
 * "这是一段文本 <references>引用一</references> 后面还有文本。"
 * 输出：
 * ["这是一段文本", "<references>引用一</references>", "后面还有文本。"]
 * 
 * 输入：
 * "这是一段文本 <references>引用一还没结束"
 * 输出：
 * ["这是一段文本", "<references>引用一还没结束"]
 * 
 * @param text 包含 <references> 标记的文本
 * @returns 拆分后的文本数组
 */
export function splitTextByReferences(text: string): TextPart[] {
  if (text.length === 0) {
    return [];
  }
  
  const result: TextPart[] = [];
  let currentIndex = 0;
  
  // 查找所有 <references> 开始标记的位置
  const openTagRegex = /<references>/g;
  let match;
  
  while ((match = openTagRegex.exec(text)) !== null) {
    const openTagStart = match.index;
    
    // 添加开始标记之前的文本（如果有的话）
    if (openTagStart > currentIndex) {
      const beforeText = text.substring(currentIndex, openTagStart);
      if (beforeText) {
        result.push(TextPart.plainText(beforeText));
      }
    }
    
    // 查找对应的关闭标记
    const closeTagRegex = /<\/references>/g;
    closeTagRegex.lastIndex = openTagStart + match[0].length;
    const closeMatch = closeTagRegex.exec(text);
    
    if (closeMatch) {
      // 找到了关闭标记，提取完整的 references 块
      const closeTagEnd = closeMatch.index + closeMatch[0].length;
      const referencesBlock = text.substring(openTagStart, closeTagEnd);
      result.push(TextPart.completeReferences(referencesBlock));
      currentIndex = closeTagEnd;
    } else {
      // 没有找到关闭标记，将剩余的所有文本都作为 references 块
      const referencesBlock = text.substring(openTagStart);
      result.push(TextPart.incompleteReferences(referencesBlock));
      currentIndex = text.length;
      break; // 已经处理到文本末尾
    }
  }
  
  // 添加最后剩余的文本（如果有的话）
  if (currentIndex < text.length) {
    const remainingText = text.substring(currentIndex);
    if (remainingText) {
      result.push(TextPart.plainText(remainingText));
    }
  }
  
  // 如果没有找到任何 references 标记，返回原始文本
  if (result.length === 0) {
    return [TextPart.plainText(text)];
  }
  
  return result;
}

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
    
    // 在 reference 内容中查找 type、artifactId 和 title，不要求特定顺序
    // 使用更严格的正则表达式，不允许嵌套标签
    const typeMatch = referenceContent.match(/<type>([^<]+)<\/type>/);
    const artifactIdMatch = referenceContent.match(/<artifactId>([^<]+)<\/artifactId>/);
    const titleMatch = referenceContent.match(/<title>([^<]+)<\/title>/);
    
    // artifactId 和 title 是必需的，type 是可选的（向后兼容）
    if (artifactIdMatch && titleMatch) {
      const artifactId = artifactIdMatch[1].trim();
      const title = titleMatch[1].trim();
      
      // 只有当 artifactId 和 title 都不为空时才添加引用
      if (artifactId && title) {
        let referenceType: ReferenceType = ReferenceType.COURSE;

        // 如果有 type 字段，则解析它
        if (typeMatch) {
          const type = typeMatch[1].trim();
          if (type) {
            referenceType = ReferenceType[type.toUpperCase() as keyof typeof ReferenceType];
          }
        }
        
        const reference: Reference = {
          type: referenceType,
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

