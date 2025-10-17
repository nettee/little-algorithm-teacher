from datetime import datetime

from langchain_core.messages import BaseMessage
from pydantic import BaseModel


class Session(BaseModel):
    """对话会话模型"""

    session_id: str
    messages: list[BaseMessage]  # 直接存储 BaseMessage 对象
    created_at: datetime
    updated_at: datetime

    def get_messages(self) -> list[BaseMessage]:
        """获取会话中的所有消息"""
        return self.messages

    def set_messages(self, messages: list[BaseMessage]) -> None:
        """批量设置会话消息（用于 agent 运行结束后统一保存）"""
        self.messages = messages
        self.updated_at = datetime.now()


class SessionManager:
    """会话管理器 - 基于内存的实现"""

    def __init__(self):
        self._sessions: dict[str, Session] = {}

    def create_session(self, session_id: str) -> Session:
        """使用指定ID创建新会话"""
        now = datetime.now()
        session = Session(
            session_id=session_id, messages=[], created_at=now, updated_at=now
        )
        self._sessions[session_id] = session
        return session

    def get_session(self, session_id: str) -> Session | None:
        """获取会话"""
        if session_id not in self._sessions:
            raise ValueError(f'session {session_id} not found')
        return self._sessions[session_id]

    def get_or_create_session(self, session_id: str) -> tuple[Session, bool]:
        """获取现有会话或创建新会话
        Returns:
            session: 会话对象
            is_created: 是否创建新会话
        """
        if session_id not in self._sessions:
            return self.create_session(session_id), True
        return self._sessions[session_id], False

    def set_session_messages(
        self, session_id: str, messages: list[BaseMessage]
    ) -> None:
        """更新会话消息（用于 agent 运行结束后统一保存）"""
        session = self.get_session(session_id)
        session.set_messages(messages)


# 全局会话管理器实例
session_manager = SessionManager()
