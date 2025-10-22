import { CitationParser, TextPart } from "./citation-parser";
import { CitationType } from "./types";

describe("citation-parser", () => {
  it("simple test", () => {
    const text = `这是一段文本 [14 打家劫舍：动态规划的解题四步骤](COURSE:14-dynamic-programming-basics) 后面还有文本。

这是第二段文本。`; 
    const parser = new CitationParser(text);
    const result = parser.parse();

    result.forEach(part => {
      console.log(part.type, part.text, part.citation);
    });

    expect(result).toEqual([
      TextPart.plainText("这是一段文本 《14 打家劫舍：动态规划的解题四步骤》 后面还有文本。"),
      TextPart.citation({
        type: CitationType.COURSE,
        artifactId: "14-dynamic-programming-basics",
        title: "14 打家劫舍：动态规划的解题四步骤",
      }),
      TextPart.plainText("\n这是第二段文本。"),
    ]);
  });
});
