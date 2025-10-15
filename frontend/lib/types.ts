// 定义消息类型
export interface MessagePart {
  type: 'text' | 'reasoning' | 'source-url' | 'reference';
  text: string;
  url?: string;
  references?: Reference[];
}

// 引用类型定义 - 引用的是 artifact 列表中的项目
export interface Reference {
  artifactId: string;
  title: string;
  description?: string;
}

export enum MessageRole {
  USER = 'user',
  ASSISTANT = 'assistant',
}

export interface ChatMessage {
  id: string;
  role: MessageRole;
  parts: MessagePart[];
}

export type ChatStatus = 'submitted' | 'streaming' | 'ready' | 'error';

export enum ArtifactStatus {
  HIDDEN = "hidden",
  COLLAPSED = "collapsed",
  EXPANDED = "expanded",
}

export enum ArtifactType {
  PROBLEM = 'problem',
  COURSE = 'course',
  EXPLANATION = 'explanation',
  OTHER = 'other',
}

export interface ArtifactData {
  id: string;
  role: MessageRole;
  type: ArtifactType;
  title: string;
  description?: string;
  content: string;
  created_at?: string;
  updated_at?: string;
  isStreaming?: boolean; // 新增：流式状态标识
}