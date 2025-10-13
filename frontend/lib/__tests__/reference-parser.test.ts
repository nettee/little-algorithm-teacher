import { parseReferences, cleanReferences } from "../reference-parser";

describe("reference-parser", () => {
  it("应该正确解析单个引用", () => {
    const text = `这是一段文本 <reference>
    <artifactId>abc123</artifactId>
    <title>测试标题</title>
</reference> 后面还有文本。`;

    const result = parseReferences(text);

    expect(result.references).toHaveLength(1);
    expect(result.references[0]).toEqual({
      artifactId: "abc123",
      title: "测试标题",
    });
  });

  it("应该正确解析多个引用", () => {
    const text = `第一个引用 <reference>
    <artifactId>ref1</artifactId>
    <title>标题1</title>
</reference> 中间文本 <reference>
    <artifactId>ref2</artifactId>
    <title>标题2</title>
</reference> 结束文本。`;

    const result = parseReferences(text);

    expect(result.references).toHaveLength(2);
    expect(result.references[0]).toEqual({
      artifactId: "ref1",
      title: "标题1",
    });
    expect(result.references[1]).toEqual({
      artifactId: "ref2",
      title: "标题2",
    });
  });

  it("应该处理紧凑格式的引用（无换行）", () => {
    const text =
      "文本 <reference><artifactId>compact</artifactId><title>紧凑标题</title></reference> 更多文本。";

    const result = parseReferences(text);

    expect(result.references).toHaveLength(1);
    expect(result.references[0]).toEqual({
      artifactId: "compact",
      title: "紧凑标题",
    });
  });

  it("应该处理包含特殊字符的引用", () => {
    const text = `<reference>
    <artifactId>special-id_123</artifactId>
    <title>标题 with "quotes" & symbols!</title>
</reference>`;

    const result = parseReferences(text);

    expect(result.references).toHaveLength(1);
    expect(result.references[0]).toEqual({
      artifactId: "special-id_123",
      title: '标题 with "quotes" & symbols!',
    });
  });

  it("应该处理空的 artifactId 和 title（不会被匹配）", () => {
    const text = `<reference>
    <artifactId></artifactId>
    <title></title>
</reference>`;

    const result = parseReferences(text);

    // 由于正则表达式使用 [^<]+ 匹配非空内容，空的 artifactId 和 title 不会被匹配
    expect(result.references).toHaveLength(0);
  });

  it("应该处理没有引用的文本", () => {
    const text = "这是一段普通的文本，没有任何引用标记。";

    const result = parseReferences(text);

    expect(result.references).toHaveLength(0);
  });

  it("应该处理空字符串", () => {
    const result = parseReferences("");

    expect(result.references).toHaveLength(0);
  });

  it("应该处理不完整的引用标记", () => {
    const text =
      "文本 <reference><artifactId>incomplete</artifactId> 缺少title标记";

    const result = parseReferences(text);

    expect(result.references).toHaveLength(0);
  });

  it("应该处理嵌套的XML标记（但不应该匹配）", () => {
    const text =
      "<reference><artifactId><nested>test</nested></artifactId><title>标题</title></reference>";

    const result = parseReferences(text);

    // 由于正则表达式使用 [^<]+ 来匹配内容，嵌套标记不应该被匹配
    expect(result.references).toHaveLength(0);
  });

  it("应该正确trim空白字符", () => {
    const text = `<reference>
    <artifactId>   whitespace-id   </artifactId>
    <title>   带空格的标题   </title>
</reference>`;

    const result = parseReferences(text);

    expect(result.references[0]).toEqual({
      artifactId: "whitespace-id",
      title: "带空格的标题",
    });
  });

  it("应该处理非常长的文本", () => {
    const longText = "a".repeat(10000);
    const textWithRef = `${longText} <reference>
    <artifactId>long-test</artifactId>
    <title>长文本测试</title>
</reference> ${longText}`;

    const result = parseReferences(textWithRef);

    expect(result.references).toHaveLength(1);
    expect(result.references[0].artifactId).toBe("long-test");
  });

  it("应该处理包含换行符的内容", () => {
    const text = `多行文本
第二行 <reference>
    <artifactId>multiline</artifactId>
    <title>多行标题</title>
</reference>
第三行`;

    const result = parseReferences(text);

    expect(result.references).toHaveLength(1);
  });

  it("应该处理Unicode字符", () => {
    const text = `<reference>
    <artifactId>unicode-测试-🚀</artifactId>
    <title>包含Unicode的标题 😊 中文</title>
</reference>`;

    const result = parseReferences(text);

    expect(result.references).toHaveLength(1);
    expect(result.references[0]).toEqual({
      artifactId: "unicode-测试-🚀",
      title: "包含Unicode的标题 😊 中文",
    });
  });

  it("应该正确解析 title 在前，artifactId 在后的引用", () => {
    const text = `这是一段文本 <reference>
    <title>标题在前</title>
    <artifactId>id-after-title</artifactId>
</reference> 后面还有文本。`;

    const result = parseReferences(text);

    expect(result.references).toHaveLength(1);
    expect(result.references[0]).toEqual({
      artifactId: "id-after-title",
      title: "标题在前",
    });
  });

  it("应该处理多个引用的不同标签顺序", () => {
    const text = `第一个引用 <reference>
    <artifactId>ref1</artifactId>
    <title>标题1</title>
</reference> 第二个引用 <reference>
    <title>标题2</title>
    <artifactId>ref2</artifactId>
</reference> 结束文本。`;

    const result = parseReferences(text);

    expect(result.references).toHaveLength(2);
    expect(result.references[0]).toEqual({
      artifactId: "ref1",
      title: "标题1",
    });
    expect(result.references[1]).toEqual({
      artifactId: "ref2",
      title: "标题2",
    });
  });

  describe("cleanReferences", () => {
    it("应该清理完整的 <references></references> 标记及其内容", () => {
      const text = `这是前面的文本。<references>
      <reference>
        <artifactId>ref1</artifactId>
        <title>标题1</title>
      </reference>
      <reference>
        <artifactId>ref2</artifactId>
        <title>标题2</title>
      </reference>
      </references>这是后面的文本。`;

      const result = cleanReferences(text);

      expect(result).toBe("这是前面的文本。这是后面的文本。");
    });

    it("应该清理未闭合的 <references> 标记及其后的所有内容", () => {
      const text = `这是前面的文本。<references>
      <reference>
        <artifactId>ref1</artifactId>
        <title>标题1</title>
      </reference>
      这里还有一些内容但没有闭合标记`;

      const result = cleanReferences(text);

      expect(result).toBe("这是前面的文本。");
    });
  });
});
