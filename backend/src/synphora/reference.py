import re

from pydantic import BaseModel


class Reference(BaseModel):
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

        # 在 reference 内容中查找 artifactId 和 title，不要求特定顺序
        # 使用更严格的正则表达式，不允许嵌套标签
        artifact_id_match = re.search(
            r'<artifactId>([^<]+)</artifactId>', reference_content
        )
        title_match = re.search(r'<title>([^<]+)</title>', reference_content)

        # 只有当两个标签都存在且内容不为空时才创建引用对象
        if artifact_id_match and title_match:
            artifact_id = artifact_id_match.group(1).strip()
            title = title_match.group(1).strip()

            # 只有当 artifactId 和 title 都不为空时才添加引用
            if artifact_id and title:
                reference = Reference(
                    artifactId=artifact_id,
                    title=title,
                )
                references.append(reference)

    return references
