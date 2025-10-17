import json
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
from synphora.session_manager import session_manager
from synphora.sse import (
    ArtifactListUpdatedEvent,
    RunFinishedEvent,
    RunStartedEvent,
    SseEvent,
    TextMessageEvent,
    ToolCallEndEvent,
    ToolCallStartEvent,
)
from synphora.tool import AlgorithmTeacherTool

# 设置日志
logger = logging.getLogger(__name__)

# 超时配置
AGENT_TIMEOUT_SECONDS = 30
TOOL_TIMEOUT_SECONDS = 60


class NodeType(str, Enum):
    """代理图节点类型"""

    FIRST = "first"
    REASON = "reason"
    ACT = "act"
    LAST = "last"


class AgentRequest(BaseModel):
    message: str
    model_key: str
    session_id: str


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
            # 无需处理，因为在 tool 中已经创建了 artifact
            pass

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


class ActNode(ToolNode):
    """执行节点，继承自 ToolNode，添加工具调用事件拦截"""

    def __init__(self, tools, **kwargs):
        super().__init__(tools, **kwargs)

    def invoke(self, state, config=None):
        self._send_tool_call_start_events(state)
        result = super().invoke(state, config)
        self._send_tool_call_end_events(state, result)
        return result

    async def ainvoke(self, state, config=None):
        self._send_tool_call_start_events(state)
        result = await super().ainvoke(state, config)
        self._send_tool_call_end_events(state, result)
        return result

    def _send_tool_call_start_events(self, state):
        """发送工具调用开始事件"""
        messages = state["messages"]
        last_message = messages[-1]

        # 发送工具调用开始事件
        if hasattr(last_message, 'tool_calls') and last_message.tool_calls:
            for tool_call in last_message.tool_calls:
                attributes = self._parse_attributes_from_dict(tool_call["args"])

                event = ToolCallStartEvent.new(
                    tool_call_id=tool_call["id"],
                    tool_name=tool_call["name"],
                    attributes=attributes,
                )
                # print(f'send tool call start event: {event}')
                write_sse_event(event)

    def _send_tool_call_end_events(self, state, result):
        """发送工具调用结束事件"""
        messages = state["messages"]
        last_message = messages[-1]

        if hasattr(last_message, 'tool_calls') and last_message.tool_calls:
            # 获取工具执行结果
            result_messages = result["messages"]
            tool_result_message = result_messages[-1]  # 最后一条消息应该是工具结果

            for tool_call in last_message.tool_calls:
                # 尝试从工具结果消息中提取对应的结果
                tool_result = ""
                if hasattr(tool_result_message, 'content'):
                    tool_result = tool_result_message.content
                elif hasattr(tool_result_message, 'tool_calls'):
                    # 如果是工具调用结果消息，可能需要不同的处理方式
                    tool_result = str(tool_result_message)

                attributes = self._parse_attributes_from_string(tool_result)

                event = ToolCallEndEvent.new(
                    tool_call_id=tool_call["id"],
                    tool_name=tool_call["name"],
                    attributes=attributes,
                )
                # print(f'send tool call end event: {event}')
                write_sse_event(event)

    def _parse_attributes_from_string(self, data: str) -> dict:
        if not data.startswith('{'):
            return {}

        try:
            data_json = json.loads(data)
        except json.JSONDecodeError:
            return {}

        return self._parse_attributes_from_dict(data_json)

    def _parse_attributes_from_dict(self, data: dict) -> dict:
        if not isinstance(data, dict):
            return {}

        attributes = {}

        if 'tag' in data:
            attributes['tag'] = data['tag']

        artifact_id = None
        if not artifact_id:
            # try 1
            artifact_id = data.get('artifact_id')
        if not artifact_id:
            # try 2
            artifact_id = data.get('artifactId')

        if artifact_id:
            attributes['artifact_id'] = artifact_id

            title = None
            if not title:
                # try 1
                artifact = artifact_manager.get_artifact(artifact_id)
                if artifact:
                    title = artifact.title
            if not title:
                # try 2
                course = CourseManager().get_course(artifact_id)
                if course:
                    title = course.title

            if title:
                attributes['title'] = title

        return attributes


def build_agent_graph() -> StateGraph:
    """构建LangGraph代理图 - 标准 re-act 模式"""
    graph = StateGraph(AgentState)

    # 添加节点
    graph.add_node(NodeType.FIRST, start_node)
    graph.add_node(NodeType.REASON, reason_node)
    graph.add_node(NodeType.ACT, ActNode(tools, handle_tool_errors=False))
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

    session_id = request.session_id
    session, is_created = session_manager.get_or_create_session(session_id)

    messages = session.get_messages().copy()
    agent_prompts = AgentPrompts()

    # 如果是新会话，添加系统提示词
    if is_created:
        messages.append(SystemMessage(content=agent_prompts.system()))

    # 添加用户消息
    messages.append(
        HumanMessage(content=agent_prompts.user(user_message=request.message))
    )

    graph = build_agent_graph()

    # 创建初始状态
    initial_state: AgentState = {
        "request": request,
        "messages": messages,
    }

    # 使用LangGraph的流式处理，订阅custom事件来获取SSE事件
    final_state = None
    async for kind, payload in graph.astream(
        initial_state, stream_mode=["custom", "values"]
    ):
        if kind == "custom":
            # 处理自定义事件（SSE事件）
            channel = payload.get("channel")
            if channel == "sse":
                event = payload.get("event")
                if event:
                    yield event
        elif kind == "values":
            # 保存最终状态用于批量保存
            final_state = payload

    # agent 运行结束后，批量保存所有消息到会话
    if final_state and "messages" in final_state:
        session_manager.set_session_messages(
            request.session_id, final_state["messages"]
        )


def run_agent(request: AgentRequest):
    """命令行运行agent的函数"""
    session_id = request.session_id
    session, is_created = session_manager.get_or_create_session(session_id)

    messages = session.get_messages().copy()
    agent_prompts = AgentPrompts()

    # 如果是新会话，添加系统提示词
    if is_created:
        messages.append(SystemMessage(content=agent_prompts.system()))

    # 添加用户消息
    messages.append(
        HumanMessage(content=agent_prompts.user(user_message=request.message))
    )

    graph = build_agent_graph()

    # 创建初始状态
    initial_state: AgentState = {
        "request": request,
        "messages": messages,
    }

    # 执行 agent，并打印 message 和 tool calls
    final_state = None
    for event in graph.stream(initial_state):
        # 检查是否为 last node，如果是则跳过打印
        if NodeType.LAST in event:
            final_state = event[NodeType.LAST]
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

    # agent 运行结束后，批量保存所有消息到会话
    if final_state and "messages" in final_state:
        messages = final_state["messages"]
        print('💾 save messages to session:')
        for i, message in enumerate(messages):
            if message.type in ('system', 'human', 'tool'):
                content = message.content
                if len(message.content) > 100:
                    print(
                        f'[{i}] {message.type}: {content[:80]} ...(omit {len(content) - 100} characters)... {content[-20:]}'
                    )
                else:
                    print(f'[{i}] {message.type}: {content}')
            else:
                print(f'[{i}] {message.type}: {message.content}')
        session_manager.set_session_messages(session_id, messages)


def main():
    """多轮对话示例"""
    import uuid

    model_key = 'deepseek/deepseek-chat'
    session_id = str(uuid.uuid4())

    user_messages = [
        '编辑距离这道题怎么解？',
        '继续',
    ]

    print("=" * 100)
    for user_message in user_messages:
        print(f'🧑: {user_message}')
        run_agent(
            AgentRequest(
                message=user_message,
                model_key=model_key,
                session_id=session_id,
            )
        )
        print("=" * 100)


if __name__ == '__main__':
    main()
