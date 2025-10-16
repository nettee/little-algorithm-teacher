import re
from enum import Enum

from pydantic import BaseModel


class ReferenceType(str, Enum):
    COURSE = "COURSE"
    MIND_MAP = "MIND_MAP"


class Reference(BaseModel):
    type: ReferenceType
    artifactId: str
    title: str


def clean_references(text: str) -> str:
    """
    清理文本中的 <references> 标记。
    如果只遇到了打开标记 <references>，没有对应的关闭标记 </references>，则清理打开标记以后的所有内容。

    Args:
        text: 包含 <references> 标记的文本

    Returns:
        清理后的文本
    """
    # 清理 <references> 标记中的内容
    if '<references>' in text and '</references>' in text:
        text = re.sub(r'<references>([\s\S]*?)</references>', '', text)

    # 如果只遇到了打开标记 <references>，没有对应的关闭标记 </references>，则清理打开标记以后的所有内容。
    if '<references>' in text and '</references>' not in text:
        text = re.sub(r'<references>[\s\S]*$', '', text)

    return text


def parse_references(content: str) -> list[Reference]:
    """
    解析文本中的 <reference> 标记

    Args:
        content: 包含 reference 标记的文本

    Returns:
        解析结果，只包含提取的引用
    """
    references: list[Reference] = []

    # 先匹配外层 <reference> 标签，获取内容
    reference_pattern = r'<reference>([\s\S]*?)</reference>'

    for match in re.finditer(reference_pattern, content):
        reference_content = match.group(1)

        # 在 reference 内容中查找 type、artifactId 和 title，不要求特定顺序
        # 使用更严格的正则表达式，不允许嵌套标签
        type_match = re.search(r'<type>([^<]+)</type>', reference_content)
        artifact_id_match = re.search(
            r'<artifactId>([^<]+)</artifactId>', reference_content
        )
        title_match = re.search(r'<title>([^<]+)</title>', reference_content)

        # 只有当所有必需标签都存在且内容不为空时才创建引用对象
        if type_match and artifact_id_match and title_match:
            type_value = type_match.group(1).strip()
            artifact_id = artifact_id_match.group(1).strip()
            title = title_match.group(1).strip()

            # 只有当所有字段都不为空时才添加引用
            if type_value and artifact_id and title:
                try:
                    # 验证 type 值是否为有效的 ReferenceType
                    reference_type = ReferenceType(type_value)
                    reference = Reference(
                        type=reference_type,
                        artifactId=artifact_id,
                        title=title,
                    )
                    references.append(reference)
                except ValueError:
                    # 如果 type 值无效，跳过这个引用
                    continue

    return references
