/*
### 1. 动态规划基础框架

首先，我们需要理解动态规划的基本解题框架。根据[14 打家劫舍：动态规划的解题四步骤](COURSE:14-dynamic-programming-basics)，动态规划问题的解题分为四个步骤：

1. **定义子问题**：找到与原问题相似但规模较小的问题
2. **写出子问题的递推关系**：确定子问题之间的数学关系
3. **确定DP数组的计算顺序**：保证计算当前子问题时，依赖的子问题已经计算完成
4. **空间优化**（可选）：减少空间复杂度

### 2. 编辑距离问题的二维动态规划解法

编辑距离问题与最长公共子序列（LCS）问题非常相似，都是典型的二维动态规划问题。根据[15 最长公共子序列：二维动态规划的解法](COURSE:15-two-dimensional-dynamic-programming)，二维动态规划的关键在于：

- **子问题有两个参数**，分别在两个维度上变化
- **DP数组是二维的**，需要确定正确的计算顺序
- **依赖关系更复杂**，需要考虑多个方向的依赖
*/

import { Citation, CitationType } from "./types";

export class TextPart {
  type: "plain-text" | "citation";
  text?: string;
  citation?: Citation;

  private constructor(
    type: "plain-text" | "citation",
    text?: string,
    citation?: Citation
  ) {
    this.type = type;
    this.text = text;
    this.citation = citation;
  }

  static plainText(text: string): TextPart {
    return new TextPart("plain-text", text, undefined);
  }

  static citation(citation: Citation): TextPart {
    return new TextPart("citation", undefined, citation);
  }

  getText(): string {
    if (this.type !== "plain-text") {
      throw new Error("TextPart is not a plain-text");
    }
    // if (!this.text) {
    //   throw new Error("TextPart text is empty");
    // }
    return this.text || "";
  }

  getCitation(): Citation {
    if (this.type !== "citation") {
      throw new Error("TextPart is not a citation");
    }
    if (!this.citation) {
      throw new Error("TextPart citation is empty");
    }
    return this.citation;
  }
}

/**
 * 处理文本中的特殊引用标记，将文本拆分成多个部分，并将引用部分解析为结构化数据。
 *
 * 特殊引用标记的格式为：
 * `[标题](<类型>:<artifactId>)`
 *
 * 其中，类型为 `COURSE`、`MIND_MAP`、`SOLUTION_CODE` 之一。
 *
 * 引用标记处理后，在文本中留下标题。引用结构化数据出现在该段文本的后面。
 *
 * 不考虑引用标记跨段、嵌套等情况。
 *
 * 例如：
 * 输入：
 * `
 * 这是一段文本 [14 打家劫舍：动态规划的解题四步骤](COURSE:14-dynamic-programming-basics) 后面还有文本。
 *
 * 这是第二段文本。
 * `
 * 输出：
 * [
 *   TextPart('plain-text', '这是一段文本 《14 打家劫舍：动态规划的解题四步骤》 后面还有文本。 '),
 *   TextPart('citation', { type: 'course', artifactId: '14-dynamic-programming-basics', title: '14 打家劫舍：动态规划的解题四步骤' }),
 *   TextPart('plain-text', '这是第二段文本。')
 * ]
 *
 * 输入：
 * "这是一段文本 [14 打家劫舍：动态规划的解题四步骤](COURSE:14-dynamic-programming-basics) 还没结束"
 * 输出：
 * [TextPart('plain-text', '这是一段文本 '), TextPart('citation', { type: 'course', artifactId: '14-dynamic-programming-basics', title: '14 打家劫舍：动态规划的解题四步骤' }), TextPart('plain-text', ' 还没结束')]
 *
 * @param text 包含特殊引用标记的文本
 * @returns 拆分后的文本数组
 */
export class CitationParser {

  private text: string;

  constructor(text: string) {
    this.text = text;
  }

  parse(): TextPart[] {
    const allLines = this.text.split("\n");
    const result: TextPart[] = [];
    let currentLines: string[] = [];
    for (const line of allLines) {
      const citation = this.parseCitation(line);
      if (citation) {
        currentLines.push(this.transformLineWithCitations(line));
        result.push(TextPart.plainText(currentLines.join("\n")));
        result.push(TextPart.citation(citation));
        currentLines = [];
      } else {
        currentLines.push(line);
      }
    }
    if (currentLines.length > 0) {
      result.push(TextPart.plainText(currentLines.join("\n")));
    }
    return result;
  }

  // 替换：
  // "这是一段文本 [14 打家劫舍：动态规划的解题四步骤](COURSE:14-dynamic-programming-basics) 后面还有文本。"
  // ==>
  // "这是一段文本 《14 打家劫舍：动态规划的解题四步骤》 后面还有文本。"
  private transformLineWithCitations(line: string): string {
    return line.replace(/\[(.+?)\]\(.+?\)/g, "《$1》");
  }

  private parseCitation(line: string): Citation | null {
    const match = /\[(.+?)\]\(([^:]+):(.+?)\)/.exec(line);
    if (!match) {
      return null;
    }
    return {
      title: match[1],
      type: CitationType[match[2].toUpperCase() as keyof typeof CitationType],
      artifactId: match[3],
    };
  }
}
