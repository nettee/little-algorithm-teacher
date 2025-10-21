import json

from langchain_core.tools import Tool, tool

from synphora.artifact_manager import artifact_manager
from synphora.course import CourseManager
from synphora.models import ArtifactRole, ArtifactType


class AlgorithmTeacherTool:
    """算法辅导员工具类"""

    COURSE_MANAGER = CourseManager()

    @classmethod
    def get_tools(cls) -> list[Tool]:
        return [
            cls.list_articles,
            cls.read_article,
            cls.generate_mind_map_artifact,
        ]

    @staticmethod
    @tool
    def list_articles(tag: str) -> str:
        """
        查询文章元信息列表。
        参数：
        - tag: 文章标签，可选取值为："链表", "二叉树", "动态规划"，如果为空，则查询所有文章。
        返回内容为 JSON 格式，包括文章标题、slug、标签、摘要等。
        """

        courses = AlgorithmTeacherTool.COURSE_MANAGER.list_courses()
        data = [course.to_data() for course in courses]
        result = json.dumps(data, ensure_ascii=False)
        # print(f'list_articles, result: {result}')

        return result

    @staticmethod
    @tool
    def read_article(artifact_id: str) -> str:
        """
        根据 artifact_id 读取文章内容
        """

        content = AlgorithmTeacherTool.COURSE_MANAGER.read_course_content(artifact_id)
        # print(f'read_article, artifact_id: {artifact_id}, content: {content[:100]}')

        return content

    @staticmethod
    @tool
    def generate_mind_map_artifact(markdown_content: str) -> str:
        """
        根据 markdown_content 文本内容，生成思维导图 artifact。返回结果为 JSON 格式，包括 artifactId, title 等。

        markdown_content 使用 Markdown 格式的 h1, h2, ul 表示思维导图的标题、一级分支、二级分支。示例内容如下：
        ```markdown
        # 动态规划解题思路

        ## 解题四步骤

        + 定义子问题
        + 写出子问题的递推关系
        + 确定 DP 数组的计算顺序
        + 空间优化（可选）

        ## 二维动态规划

        + 二维子问题
        + 二维 DP 数组
        ```
        """

        print(
            f'generate_mind_map_artifact start, text: {len(markdown_content)} characters'
        )

        title = "解题思路"  # TODO parse
        content = markdown_content
        try:
            artifact = artifact_manager.create_artifact(
                title=title,
                content=content,
                artifact_type=ArtifactType.MIND_MAP,
                role=ArtifactRole.ASSISTANT,
            )

            data = {
                "artifactId": artifact.id,
                "title": artifact.title,
            }
            result = json.dumps(data, ensure_ascii=False)
        except Exception as e:
            print(f'generate_mind_map_artifact error: {e}')
            e.print_exc()
        print(f'generate_mind_map_artifact end, result: {result}')
        return result
