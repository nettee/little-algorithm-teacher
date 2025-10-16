import logging
import uuid
from collections.abc import AsyncGenerator
from enum import Enum
from typing import Annotated, TypedDict

from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
from langgraph.graph import END, START, StateGraph
from langgraph.graph.message import add_messages
from langgraph.prebuilt import ToolNode
from pydantic import BaseModel

from synphora.artifact_manager import artifact_manager
from synphora.course import CourseManager
from synphora.langgraph_sse import write_sse_event
from synphora.llm import create_llm_client
from synphora.models import ArtifactRole, ArtifactType
from synphora.prompt import AgentPrompts
from synphora.reference import Reference, ReferenceType, parse_references
from synphora.sse import (
    ArtifactListUpdatedEvent,
    RunFinishedEvent,
    RunStartedEvent,
    SseEvent,
    TextMessageEvent,
)
from synphora.tool import AlgorithmTeacherTool

# 设置日志
logger = logging.getLogger(__name__)

# 超时配置
AGENT_TIMEOUT_SECONDS = 30
TOOL_TIMEOUT_SECONDS = 60


class NodeType(str, Enum):
    """代理图节点类型"""

    FIRST = "start"
    REASON = "reason"
    ACT = "act"
    LAST = "end"


class AgentRequest(BaseModel):
    message: str
    model_key: str


def generate_id() -> str:
    return str(uuid.uuid4())[:8]


# LangGraph State Schema
class AgentState(TypedDict):
    request: AgentRequest
    messages: Annotated[list, add_messages]


tools = AlgorithmTeacherTool.get_tools()


def start_node(state: AgentState) -> AgentState:
    """开始节点：发送运行开始事件"""
    # print('start_node')

    write_sse_event(RunStartedEvent.new())

    return state


def process_references(references: list[Reference]):
    print(f'process references: {references}')
    for reference in references:
        artifact_id = reference.artifactId

        if reference.type == ReferenceType.COURSE:
            course_manager = CourseManager()
            course = course_manager.get_course(artifact_id)
            title = course.title
            content = course_manager.read_course_content(artifact_id)

            artifact = artifact_manager.create_artifact_with_id(
                artifact_id=artifact_id,
                title=title,
                content=content,
                artifact_type=ArtifactType.COURSE,
                role=ArtifactRole.ASSISTANT,
            )

        elif reference.type == ReferenceType.MIND_MAP:
            # TODO
            print(f'process mind map reference: {reference}')

        # TODO only update once for all references
        write_sse_event(ArtifactListUpdatedEvent.from_artifact(artifact))


def reason_node(state: AgentState) -> AgentState:
    """推理节点：使用LLM决定调用哪个工具"""
    # print(f'reason_node, tools: {[t.name for t in tools]}')
    llm = create_llm_client(state["request"].model_key)
    llm_with_tools = llm.bind_tools(tools)

    # 使用分片归并：累积所有chunk，最后合并成完整AIMessage
    message_id = generate_id()

    # 用于归并的累加器
    accumulated_chunks = []

    # print(f'reason_node, state["messages"]: {state["messages"]}')
    for chunk in llm_with_tools.stream(state["messages"]):
        # 累积分片用于最终归并
        accumulated_chunks.append(chunk)

        # 流式输出文本内容到SSE
        if chunk.content:
            write_sse_event(
                TextMessageEvent.new(message_id=message_id, content=chunk.content)
            )

    ai_message = merge_chunks(accumulated_chunks)

    references = parse_references(ai_message.content)
    if references:
        process_references(references)

    return {"messages": [ai_message]}


def should_continue(state: AgentState) -> NodeType:
    """决定是否继续循环的条件函数"""
    messages = state["messages"]
    last_message = messages[-1]

    # 如果最后一条消息包含工具调用，则继续到act节点
    if hasattr(last_message, 'tool_calls') and last_message.tool_calls:
        # print(f'tool calls: {last_message.tool_calls}')
        return NodeType.ACT
    # 否则结束
    else:
        # print('no tool calls, go to last node')
        return NodeType.LAST


def merge_chunks(accumulated_chunks):
    # 使用LangChain的分片归并机制得到完整AIMessage
    # 这样可以正确处理tool_calls、ID等结构化信息
    final_message = None
    for chunk in accumulated_chunks:
        if final_message is None:
            final_message = chunk
        else:
            # 使用 + 运算符合并分片，这是LangChain推荐的方式
            final_message = final_message + chunk

    return final_message


def end_node(state: AgentState) -> AgentState:
    """结束节点：发送运行完成事件"""
    # print('end_node')

    write_sse_event(RunFinishedEvent.new())

    return state


def build_agent_graph() -> StateGraph:
    """构建LangGraph代理图 - 标准 re-act 模式"""
    graph = StateGraph(AgentState)

    # 添加节点
    graph.add_node(NodeType.FIRST, start_node)
    graph.add_node(NodeType.REASON, reason_node)
    graph.add_node(NodeType.ACT, ToolNode(tools, handle_tool_errors=False))
    graph.add_node(NodeType.LAST, end_node)

    # 连接节点 - re-act 模式
    graph.add_edge(START, NodeType.FIRST)
    graph.add_edge(NodeType.FIRST, NodeType.REASON)

    # 从 reason 节点添加条件边，根据是否有工具调用决定下一步
    graph.add_conditional_edges(
        NodeType.REASON,
        should_continue,
        {
            NodeType.ACT: NodeType.ACT,  # 如果有工具调用，执行工具
            NodeType.LAST: NodeType.LAST,  # 如果没有工具调用，结束
        },
    )

    # 从 act 节点返回到 reason 节点，形成循环
    graph.add_edge(NodeType.ACT, NodeType.REASON)
    graph.add_edge(NodeType.LAST, END)

    return graph.compile()


async def generate_agent_response(
    request: AgentRequest,
) -> AsyncGenerator[SseEvent]:
    """
    主要的Agent响应函数，使用LangGraph流式处理
    """

    print(f'generate_agent_response, request: {request}')

    graph = build_agent_graph()

    # 创建初始消息
    agent_prompts = AgentPrompts()
    initial_messages = [
        SystemMessage(content=agent_prompts.system()),
        HumanMessage(content=agent_prompts.user(user_message=request.message)),
    ]

    # 创建初始状态
    initial_state: AgentState = {
        "request": request,
        "messages": initial_messages,
    }

    # 使用LangGraph的流式处理，订阅custom事件来获取SSE事件
    async for kind, payload in graph.astream(initial_state, stream_mode=["custom"]):
        if kind == "custom":
            # 处理自定义事件（SSE事件）
            channel = payload.get("channel")
            if channel == "sse":
                event = payload.get("event")
                if event:
                    yield event


def run_agent(request: AgentRequest):
    graph = build_agent_graph()

    # 创建初始消息
    agent_prompts = AgentPrompts()
    initial_messages = [
        SystemMessage(content=agent_prompts.system()),
        HumanMessage(content=agent_prompts.user(user_message=request.message)),
    ]

    # 创建初始状态
    initial_state: AgentState = {
        "request": request,
        "messages": initial_messages,
    }

    # 执行 agent，并打印 message 和 tool calls
    for event in graph.stream(initial_state):
        # 检查是否为 last node，如果是则跳过打印
        if NodeType.LAST in event:
            continue

        for value in event.values():
            last_message = value["messages"][-1]
            if not isinstance(last_message, AIMessage):
                continue
            print('-' * 100)
            if last_message.content:
                print(f"🤖: {last_message.content}")
            if hasattr(last_message, "tool_calls") and len(last_message.tool_calls) > 0:
                for tool_call in last_message.tool_calls:
                    print(f'🔧: ToolCall({tool_call["name"]}, {tool_call["args"]})')


def main():
    request = AgentRequest(
        message='编辑距离这道题怎么解？', model_key='deepseek/deepseek-chat'
    )
    run_agent(request)


if __name__ == '__main__':
    main()
