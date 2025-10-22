import re
from enum import Enum

from pydantic import BaseModel


class CitationType(str, Enum):
    COURSE = "course"
    MIND_MAP = "mind_map"
    SOLUTION_CODE = "solution_code"


class Citation(BaseModel):
    type: CitationType
    artifactId: str
    title: str


class TextPart:
    """表示文本的一部分，可以是普通文本或引用"""

    def __init__(
        self, part_type: str, text: str | None = None, citation: Citation | None = None
    ):
        if part_type not in ["plain-text", "citation"]:
            raise ValueError("part_type must be 'plain-text' or 'citation'")

        self.type = part_type
        self.text = text
        self.citation = citation

    @classmethod
    def plain_text(cls, text: str) -> 'TextPart':
        """创建普通文本部分"""
        return cls("plain-text", text=text)

    @classmethod
    def citation(cls, citation: Citation) -> 'TextPart':
        """创建引用部分"""
        return cls("citation", citation=citation)

    def get_text(self) -> str:
        """获取普通文本内容"""
        if self.type != "plain-text":
            raise ValueError("TextPart is not a plain-text")
        return self.text or ""

    def get_citation(self) -> Citation:
        """获取引用内容"""
        if self.type != "citation":
            raise ValueError("TextPart is not a citation")
        if not self.citation:
            raise ValueError("TextPart citation is empty")
        return self.citation


class CitationParser:
    """
    处理文本中的特殊引用标记，将文本拆分成多个部分，并将引用部分解析为结构化数据。

    特殊引用标记的格式为：
    `[标题](<类型>:<artifactId>)`

    其中，类型为 `COURSE`、`MIND_MAP`、`SOLUTION_CODE` 之一。

    引用标记处理后，在文本中留下标题。引用结构化数据出现在该段文本的后面。

    不考虑引用标记跨段、嵌套等情况。

    例如：
    输入：
    ```
    这是一段文本 [14 打家劫舍：动态规划的解题四步骤](COURSE:14-dynamic-programming-basics) 后面还有文本。

    这是第二段文本。
    ```
    输出：
    [
      TextPart('plain-text', '这是一段文本 《14 打家劫舍：动态规划的解题四步骤》 后面还有文本。 '),
      TextPart('citation', Citation(type='course', artifactId='14-dynamic-programming-basics', title='14 打家劫舍：动态规划的解题四步骤')),
      TextPart('plain-text', '这是第二段文本。')
    ]
    """

    def __init__(self, text: str):
        self.text = text

    def parse_citations(self) -> list[Citation]:
        """解析文本，返回 Citation 列表"""
        text_parts = self.parse_text_parts()
        return [
            text_part.get_citation()
            for text_part in text_parts
            if text_part.type == "citation"
        ]

    def parse_text_parts(self) -> list[TextPart]:
        """解析文本，返回 TextPart 列表"""
        all_lines = self.text.split("\n")
        result: list[TextPart] = []
        current_lines: list[str] = []

        for line in all_lines:
            citation = self._parse_citation(line)
            if citation:
                current_lines.append(self._transform_line_with_citations(line))
                result.append(TextPart.plain_text("\n".join(current_lines)))
                result.append(TextPart.citation(citation))
                current_lines = []
            else:
                current_lines.append(line)

        if current_lines:
            result.append(TextPart.plain_text("\n".join(current_lines)))

        return result

    def _transform_line_with_citations(self, line: str) -> str:
        """
        替换：
        "这是一段文本 [14 打家劫舍：动态规划的解题四步骤](COURSE:14-dynamic-programming-basics) 后面还有文本。"
        ==>
        "这是一段文本 《14 打家劫舍：动态规划的解题四步骤》 后面还有文本。"
        """
        return re.sub(r'\[(.+?)\]\(.+?\)', r'《\1》', line)

    def _parse_citation(self, line: str) -> Citation | None:
        """从行中解析引用信息"""
        match = re.search(r'\[(.+?)\]\(([^:]+):(.+?)\)', line)
        if not match:
            return None

        title = match.group(1)
        citation_type_str = match.group(2).upper()
        artifact_id = match.group(3)

        try:
            citation_type = CitationType(citation_type_str.lower())
        except ValueError:
            # 如果类型不匹配，返回 None
            return None

        return Citation(title=title, type=citation_type, artifactId=artifact_id)
