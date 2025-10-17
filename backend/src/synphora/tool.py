import json

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_core.tools import Tool, tool

from synphora.artifact_manager import artifact_manager
from synphora.course import CourseManager
from synphora.langgraph_sse import write_sse_event
from synphora.llm import create_llm_client
from synphora.models import ArtifactRole, ArtifactType, EvaluateType
from synphora.prompt import ArticleEvaluatorPrompts
from synphora.sse import (
    ArtifactContentChunkEvent,
    ArtifactContentCompleteEvent,
    ArtifactContentStartEvent,
    ArtifactListUpdatedEvent,
)


class ArticleEvaluator:
    def __init__(self, evaluate_type: EvaluateType):
        self.evaluate_type = evaluate_type

    def evaluate(self, original_artifact_id: str) -> str:
        print(
            f'evaluate_article, evaluate_type: {self.evaluate_type}, original_artifact_id: {original_artifact_id}'
        )

        if self.evaluate_type == EvaluateType.COMMENT:
            artifact_title = "文章评价"
            artifact_type = ArtifactType.OTHER
        elif self.evaluate_type == EvaluateType.TITLE:
            artifact_title = "候选标题"
            artifact_type = ArtifactType.OTHER
        elif self.evaluate_type == EvaluateType.INTRODUCTION:
            artifact_title = "介绍语"
            artifact_type = ArtifactType.OTHER
        else:
            raise ValueError(f'Unsupported evaluate type: {self.evaluate_type}')

        article_evaluator_prompts = ArticleEvaluatorPrompts()
        original_artifact = artifact_manager.get_artifact(original_artifact_id)
        system_prompt = article_evaluator_prompts.system()
        user_prompt = article_evaluator_prompts.user(
            type=self.evaluate_type, artifact=original_artifact
        )

        # 1. 发送ARTIFACT_CONTENT_START事件
        generated_artifact_id = artifact_manager.generate_artifact_id()

        write_sse_event(
            ArtifactContentStartEvent.new(
                artifact_id=generated_artifact_id,
                title=artifact_title,
                artifact_type=artifact_type.value,
            )
        )

        # 2. 准备评价prompt
        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=user_prompt),
        ]

        # 3. 调用LLM并流式生成内容
        llm = create_llm_client()
        llm_result_content = ''

        # 4. 流式发送ARTIFACT_CONTENT_CHUNK事件 - 实时流式处理
        for chunk in llm.stream(messages):
            if chunk.content:
                write_sse_event(
                    ArtifactContentChunkEvent.new(
                        artifact_id=generated_artifact_id, content=chunk.content
                    )
                )
                llm_result_content += chunk.content

        # 5. 发送ARTIFACT_CONTENT_COMPLETE事件
        write_sse_event(
            ArtifactContentCompleteEvent.new(artifact_id=generated_artifact_id)
        )

        # 6. 创建artifact并发送ARTIFACT_LIST_UPDATED事件
        # 保证artifact_id与生成的一致，避免前端显示错误
        artifact = artifact_manager.create_artifact_with_id(
            artifact_id=generated_artifact_id,
            title=artifact_title,
            content=llm_result_content,
            artifact_type=artifact_type,
            role=ArtifactRole.ASSISTANT,
        )

        write_sse_event(
            ArtifactListUpdatedEvent.new(
                artifact_id=artifact.id,
                title=artifact.title,
                artifact_type=artifact.type.value,
                role=artifact.role.value,
            )
        )

        return json.dumps(
            {
                "evaluate_type": self.evaluate_type.value,
                "artifact_id": artifact.id,
                "title": artifact.title,
            }
        )


class ArticleEvaluatorTool:
    """文章评价工具类"""

    @classmethod
    def get_tools(cls) -> list[Tool]:
        return [
            cls.write_comment,
            cls.write_candidate_titles,
            cls.write_introduction,
        ]

    @staticmethod
    @tool
    def write_comment(original_artifact_id: str) -> str:
        """
        评价这篇文章的质量，包括读者画像分析和六大维度评估

        Args:
            original_artifact_id: 原文 Artifact ID

        Returns:
            str: 评价结果的元数据
        """
        evaluator = ArticleEvaluator(EvaluateType.COMMENT)
        result = evaluator.evaluate(original_artifact_id)
        print(f'tool call finished, tool name: write_comment, result: {result}')
        return result

    @staticmethod
    @tool
    def write_candidate_titles(original_artifact_id: str) -> str:
        """
        根据文章内容，撰写三个候选标题

        Args:
            original_artifact_id: 原文 Artifact ID

        Returns:
            str: 候选标题的元数据
        """
        evaluator = ArticleEvaluator(EvaluateType.TITLE)
        result = evaluator.evaluate(original_artifact_id)
        print(
            f'tool call finished, tool name: write_candidate_titles, result: {result}'
        )
        return result

    @staticmethod
    @tool
    def write_introduction(original_artifact_id: str) -> str:
        """
        根据文章内容，撰写一篇介绍语
        Args:
            original_artifact_id: 原文 Artifact ID

        Returns:
            str: 介绍语的元数据
        """
        evaluator = ArticleEvaluator(EvaluateType.INTRODUCTION)
        result = evaluator.evaluate(original_artifact_id)
        print(f'tool call finished, tool name: write_introduction, result: {result}')
        return result


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
    def generate_mind_map_artifact(text: str) -> str:
        """
        根据 text 文本内容，生成思维导图 artifact。返回结果为 JSON 格式，包括 artifactId, title 等。
        """

        print(f'generate_mind_map_artifact start, text: {len(text)} characters')

        # TODO mock
        # import time

        # time.sleep(6)

        title = "动态规划解题思路"
        content = """
# 动态规划

+ 定义子问题
+ 写出子问题的递推关系
+ 确定 DP 数组的计算顺序
+ 空间优化（可选）
"""
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
