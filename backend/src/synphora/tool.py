import json
from pathlib import Path

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_core.tools import Tool, tool

from synphora.artifact_manager import artifact_manager
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
            artifact_type = ArtifactType.COMMENT
        elif self.evaluate_type == EvaluateType.TITLE:
            artifact_title = "候选标题"
            artifact_type = ArtifactType.COMMENT
        elif self.evaluate_type == EvaluateType.INTRODUCTION:
            artifact_title = "介绍语"
            artifact_type = ArtifactType.COMMENT
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


class LeetCodeArticleTool:
    """LeetCode 文章工具类"""

    @classmethod
    def get_tools(cls) -> list[Tool]:
        return [
            cls.list_articles,
            cls.read_article,
        ]

    @staticmethod
    @tool
    def list_articles() -> str:
        """
        列出所有文章，返回内容为 JSON 格式，包括文章标题、slug、标签、摘要等。
        """
        data = [
            {
                "slug": "14-dynamic-programming-basics",
                "title": "14 打家劫舍：动态规划的解题四步骤 ",
                "tags": ["动态规划"],
                "summary": "动态规划是一类很讲究「触类旁通」的题型。很多动态规划的解法需要你做过某一类型的例题，再做类似的题目的时候就可以想起来相应的思路。动态规划的典型入门题目是打家劫舍问题，本文以打家劫舍问题为例，讲解动态规划的解题四步骤：定义子问题、写出子问题的递推关系、确定 DP 数组的计算顺序、空间优化。",
            }
        ]
        return json.dumps(data, ensure_ascii=False)

    @staticmethod
    @tool
    def read_article(slug: str) -> str:
        """
        根据文章slug，读取文章
        """
        current_file_path = Path(__file__).parent
        file_path = (
            current_file_path / 'data' / 'leetcode-by-example' / slug / f'{slug}.md'
        )
        print(f'cwd: {Path.cwd()}')
        print(f'file_path: {file_path}')
        if not file_path.exists():
            return '文章不存在'
        with open(file_path, encoding='utf-8') as f:
            content = f.read()
        return content
