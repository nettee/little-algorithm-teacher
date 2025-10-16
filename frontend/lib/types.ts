// 定义消息类型
export interface MessagePart {
  type: 'text' | 'reasoning' | 'source-url' | 'reference';
  text: string;
  url?: string;
  references?: Reference[];
}

export enum ReferenceType {
  COURSE = 'course',
  MIND_MAP = 'mind_map',
}

export interface Reference {
  type: ReferenceType;
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
  CODE = 'code',
  COURSE = 'course',
  MIND_MAP = 'mind_map',
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