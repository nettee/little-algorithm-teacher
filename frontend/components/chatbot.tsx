import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Loader } from "@/components/ai-elements/loader";
import {
  PromptInput,
  PromptInputModelSelect,
  PromptInputModelSelectContent,
  PromptInputModelSelectItem,
  PromptInputModelSelectTrigger,
  PromptInputModelSelectValue,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputToolbar,
  PromptInputTools,
} from "@/components/ai-elements/prompt-input";
import { MessageComponent } from "@/components/message";
import { isShowDebugInfo } from "@/lib/env";
import { getSynphoraInitialMessages } from "@/lib/synphora-data";
import {
  ChatMessage,
  ChatStatus,
  MessageRole,
  ToolCallStatus
} from "@/lib/types";
import { fetchEventSource } from "@microsoft/fetch-event-source";
import React, { useRef, useState } from "react";

// 生成唯一的 session_id
const generateSessionId = () => {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

const models = [
  {
    key: "deepseek/deepseek-chat",
    label: "DeepSeek V3",
  },
  {
    key: "moonshot/kimi-k2",
    label: "Kimi K2",
  },
  {
    key: "gemini/gemini-2.5-flash",
    label: "Gemini 2.5 Flash",
  },
];

export const Chatbot = ({
  onArtifactContentStart,
  onArtifactContentChunk,
  onArtifactContentComplete,
  onArtifactListUpdated,
  onArtifactNavigate,
}: {
  onArtifactContentStart: (
    artifactId: string,
    title: string,
    description?: string
  ) => void;
  onArtifactContentChunk: (artifactId: string, chunk: string) => void;
  onArtifactContentComplete: (artifactId: string) => void;
  onArtifactListUpdated: () => void;
  onArtifactNavigate?: (artifactId: string) => void;
}) => {
  const initialMessages = getSynphoraInitialMessages();

  const [input, setInput] = useState("");
  const [modelKey, setModelKey] = useState<string>(models[0].key);
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [status, setStatus] = useState<ChatStatus>("ready");
  const abortControllerRef = useRef<AbortController | null>(null);
  const sessionIdRef = useRef<string>(generateSessionId());

  const addUserMessage = (text: string) => {
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: MessageRole.USER,
      parts: [{ type: "text", text }],
    };
    setMessages((prev) => [...prev, userMessage]);
  };

  // 发送消息函数
  const sendMessage = async (text: string) => {
    // 中止之前的请求
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    // 添加用户消息
    addUserMessage(text);

    setStatus("submitted");

    let currentMessageId = "";
    let currentContent = "";

    try {
      await fetchEventSource("http://127.0.0.1:8000/agent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          session_id: sessionIdRef.current,
          message: text,
          model_key: modelKey,
        }),
        signal: controller.signal,
        async onopen(response) {
          if (
            response.ok &&
            response.headers.get("content-type")?.includes("text/event-stream")
          ) {
            setStatus("streaming");
            console.log("SSE connection opened");
          } else if (response.status >= 400 && response.status < 500) {
            // 客户端错误
            throw new Error(`HTTP error! status: ${response.status}`);
          } else {
            // 其他错误
            throw new Error(`HTTP error! status: ${response.status}`);
          }
        },
        onmessage(msg) {
          try {
            if (msg.data && msg.data.trim() !== "") {
              const eventData = JSON.parse(msg.data);

              switch (eventData.type) {
                case "RUN_STARTED":
                  // 开始新的助手消息
                  currentMessageId = "";
                  currentContent = "";
                  break;

                case "TEXT_MESSAGE":
                  const { message_id, content } = eventData.data;

                  if (message_id !== currentMessageId) {
                    // 新消息开始
                    currentMessageId = message_id;
                    currentContent = content;

                    const assistantMessage: ChatMessage = {
                      id: message_id,
                      role: MessageRole.ASSISTANT,
                      parts: [{ type: "text", text: content }],
                    };

                    setMessages((prev) => [...prev, assistantMessage]);
                  } else {
                    // 继续当前消息
                    currentContent += content;

                    setMessages((prev) =>
                      prev.map((msg) =>
                        msg.id === message_id
                          ? {
                              ...msg,
                              parts: [{ type: "text", text: currentContent }],
                            }
                          : msg
                      )
                    );
                  }
                  break;

                case "RUN_FINISHED":
                  setStatus("ready");
                  break;

                case "ARTIFACT_CONTENT_START":
                  const {
                    artifact_id: startArtifactId,
                    title,
                    description,
                  } = eventData.data;
                  console.log("Artifact content start:", eventData.data);
                  onArtifactContentStart(startArtifactId, title, description);
                  break;

                case "ARTIFACT_CONTENT_CHUNK":
                  const {
                    artifact_id: chunkArtifactId,
                    content: chunkContent,
                  } = eventData.data;
                  // console.log("Artifact content chunk:", eventData.data);
                  onArtifactContentChunk(chunkArtifactId, chunkContent);
                  break;

                case "ARTIFACT_CONTENT_COMPLETE":
                  const { artifact_id: completeArtifactId } = eventData.data;
                  console.log("Artifact content complete:", eventData.data);
                  onArtifactContentComplete(completeArtifactId);
                  break;

                case "ARTIFACT_LIST_UPDATED":
                  console.log("Artifact list updated:", eventData.data);
                  onArtifactListUpdated();
                  break;

                case "TOOL_CALL_START":
                  const {
                    tool_call_id: startToolCallId,
                    tool_name: startToolName,
                    attributes: startAttributes,
                  } = eventData.data;
                  console.log("Tool call start:", eventData.data);

                  // 为工具调用创建独立的消息
                  const toolCallMessage: ChatMessage = {
                    id: startToolCallId, // 使用 tool_call_id 作为消息 ID
                    role: MessageRole.ASSISTANT,
                    parts: [
                      {
                        type: "tool",
                        text: "",
                        toolCall: {
                          id: startToolCallId,
                          name: startToolName,
                          attributes: startAttributes,
                          status: ToolCallStatus.RUNNING,
                        },
                      },
                    ],
                  };

                  setMessages((prev) => [...prev, toolCallMessage]);
                  break;

                case "TOOL_CALL_END":
                  const {
                    tool_call_id: endToolCallId,
                    tool_name: endToolName,
                    attributes: endAttributes,
                  } = eventData.data;
                  console.log("Tool call end:", eventData.data);

                  // 更新对应的工具调用消息状态为完成
                  setMessages((prev) => {
                    return prev.map((msg) => {
                      if (
                        msg.id === endToolCallId &&
                        msg.role === MessageRole.ASSISTANT
                      ) {
                        return {
                          ...msg,
                          parts: msg.parts.map((part) => {
                            if (
                              part.type === "tool" &&
                              part.toolCall?.id === endToolCallId &&
                              part.toolCall
                            ) {
                              // 合并 start 和 end 的 attributes
                              const mergedAttributes = {
                                ...part.toolCall.attributes,
                                ...endAttributes,
                              };

                              return {
                                ...part,
                                toolCall: {
                                  id: part.toolCall.id,
                                  name: part.toolCall.name,
                                  attributes: mergedAttributes,
                                  status: ToolCallStatus.COMPLETED,
                                },
                              };
                            }
                            return part;
                          }),
                        };
                      }
                      return msg;
                    });
                  });
                  break;
              }
            }
          } catch (error) {
            console.error("Error parsing SSE data:", error);
          }
        },
        onclose() {
          console.log("SSE connection closed");
          setStatus("ready");
        },
        onerror(err) {
          console.error("SSE error:", err);
          setStatus("error");
          throw err; // 重新抛出错误以触发重连机制
        },
      });
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        console.log("Request was aborted");
      } else {
        console.error("Error sending message:", error);
        setStatus("error");
      }
    }
  };

  // 重新生成最后一条消息
  const regenerate = () => {
    if (messages.length >= 2) {
      const lastUserMessage = messages[messages.length - 2];
      if (lastUserMessage.role === MessageRole.USER) {
        // 移除最后一条助手消息
        setMessages((prev) => prev.slice(0, -1));
        // 重新发送用户消息
        sendMessage(lastUserMessage.parts[0].text);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      sendMessage(input);
      setInput("");
    }
  };

  return (
    <div
      data-role="chatbot"
      className="w-full max-w-3xl min-h-0 flex-1 mx-auto flex flex-col"
    >
      {isShowDebugInfo() && (
        <div className="mb-4 flex justify-center">
          <p className="text-xs text-gray-500">
            Session ID: {sessionIdRef.current}
          </p>
        </div>
      )}

      <Conversation data-role="conversation" className="flex-1 min-h-0">
        <ConversationContent>
          {messages.map((message) => (
            <MessageComponent key={message.id} message={message} />
          ))}
          {status === "submitted" && <Loader />}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      {/* <Suggestions>
        {suggestions.map((suggestion) => (
          <Suggestion
            key={suggestion.value}
            onClick={() => {
              sendMessage(suggestion.value);
            }}
            suggestion={suggestion.value}
          />
        ))}
      </Suggestions> */}

      <PromptInput onSubmit={handleSubmit} className="mt-4 flex-shrink-0">
        <PromptInputTextarea
          onChange={(e) => setInput(e.target.value)}
          value={input}
        />
        <PromptInputToolbar>
          <PromptInputTools>
            <PromptInputModelSelect
              onValueChange={(value) => {
                setModelKey(value);
              }}
              value={modelKey}
            >
              <PromptInputModelSelectTrigger>
                <PromptInputModelSelectValue />
              </PromptInputModelSelectTrigger>
              <PromptInputModelSelectContent>
                {models.map((model) => (
                  <PromptInputModelSelectItem key={model.key} value={model.key}>
                    {model.label}
                  </PromptInputModelSelectItem>
                ))}
              </PromptInputModelSelectContent>
            </PromptInputModelSelect>
          </PromptInputTools>
          <PromptInputSubmit disabled={!input} status={status} />
        </PromptInputToolbar>
      </PromptInput>
    </div>
  );
};
