import { useArtifactContext } from "@/app/artifact-context";
import { Message, MessageContent } from "@/components/ai-elements/message";
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "@/components/ai-elements/reasoning";
import { Response } from "@/components/ai-elements/response";
import { ToolCall } from "@/components/ai-elements/simple-tool";
import { Citation } from "@/components/citation";
import { CitationParser } from "@/lib/citation-parser";
import { ChatMessage, MessagePart } from "@/lib/types";

const renderToolCall = (key: string, part: MessagePart): React.ReactNode => {
  const { toolCall } = part;
  if (!toolCall) {
    return null;
  }

  const attributes = toolCall.attributes;

  let toolCallTitle = toolCall.name;
  let toolCallDescription = "";

  if (toolCall.name === "list_articles") {
    toolCallTitle = "查询文章";
    if (attributes) {
      toolCallDescription = attributes.tag;
    }
  } else if (toolCall.name === "read_article") {
    toolCallTitle = "读取文章";
    if (attributes) {
      toolCallDescription = attributes.title;
    }
  } else if (toolCall.name === "generate_mind_map") {
    toolCallTitle = "生成思维导图";
    if (attributes) {
      toolCallDescription = attributes.title;
    }
  } else if (toolCall.name === "report_solution_code") {
    toolCallTitle = "生成题解代码";
    if (attributes) {
      toolCallDescription = attributes.title;
    }
  }

  return (
    <ToolCall
      key={key}
      status={toolCall.status}
      title={toolCallTitle}
      description={toolCallDescription}
      className="mb-2"
    />
  );
};

const renderReasoningPart = (
  key: string,
  part: MessagePart
): React.ReactNode => {
  // TODO 需要判断 isStreaming
  // const isLastMessage = i === message.parts.length - 1 && message.id === messages.at(-1)?.id;
  // const isStreaming = status === "streaming" && isLastMessage;

  return (
    <Reasoning key={key} className="w-full" isStreaming={false}>
      <ReasoningTrigger />
      <ReasoningContent>{part.text}</ReasoningContent>
    </Reasoning>
  );
};

export const getMessageType = (message: ChatMessage): "normal" | "tool" => {
  for (const part of message.parts) {
    if (part.type === "tool") {
      return "tool";
    }
  }
  return "normal";
};

export const renderToolMessage = (message: ChatMessage) => {
  const toolParts = message.parts.filter((part) => part.type === "tool");
  return (
    <div key={message.id}>
      {toolParts.map((part, i) => {
        const key = `${message.id}-${i}`;
        return renderToolCall(key, part);
      })}
    </div>
  );
};

type MessagePartGroup = {
  type: "reasoning" | "normal";
  parts: MessagePart[];
};

// reasoning 单独分一组，其他的相邻的 part 放在一组
const groupMessageParts = (message: ChatMessage): MessagePartGroup[] => {
  const result: MessagePartGroup[] = [];
  let currentParts: MessagePart[] = [];
  for (const part of message.parts) {
    if (part.type === "reasoning") {
      if (currentParts.length > 0) {
        result.push({ type: "normal", parts: currentParts });
      }
      result.push({ type: "reasoning", parts: [part] });
      currentParts = [];
    } else {
      currentParts.push(part);
    }
  }
  if (currentParts.length > 0) {
    result.push({ type: "normal", parts: currentParts });
  }
  return result;
};

const transformParts = (parts: MessagePart[]): MessagePart[] => {
  const result: MessagePart[] = [];
  for (const part of parts) {
    const parser = new CitationParser(part.text);
    const textParts = parser.parse();
    for (const textPart of textParts) {
      if (textPart.type === "plain-text") {
        result.push({
          ...part,
          type: "text",
          text: textPart.getText(),
        });
      } else if (textPart.type === "citation") {
        result.push({
          ...part,
          type: "citation",
          citation: textPart.getCitation(),
        });
      }
    }
  }
  return result;
};

const renderNormalParts = (
  key: string,
  message: ChatMessage,
  parts: MessagePart[]
): React.ReactNode => {
  const { openArtifact } = useArtifactContext();

  return (
    <Message data-role="message" key={key} from={message.role}>
      <MessageContent>
        {parts.map((part, i) => {
          const partKey = `${key}-${i}`;
          if (part.type === "citation") {
            return (
              <Citation
                data-role="message-citation"
                key={partKey}
                citation={part.citation}
                onClick={() => {
                  openArtifact(part.citation!.artifactId);
                }}
              />
            );
          } else {
            return (
              <Response data-role="message-text" key={partKey}>
                {part.text}
              </Response>
            );
          }
        })}
      </MessageContent>
    </Message>
  );
};

export const renderNormalMessage = (message: ChatMessage): React.ReactNode => {
  const partGroups = groupMessageParts(message);
  return (
    <div key={message.id}>
      {partGroups.map((partGroup, i) => {
        const key = `${message.id}-${i}`;
        if (partGroup.type === "reasoning") {
          return renderReasoningPart(key, partGroup.parts[0]);
        } else {
          return renderNormalParts(
            key,
            message,
            transformParts(partGroup.parts)
          );
        }
      })}
    </div>
  );
};

export const renderMessage = (message: ChatMessage): React.ReactNode => {
  const messageType = getMessageType(message);
  if (messageType === "tool") {
    return renderToolMessage(message);
  }
  return renderNormalMessage(message);
};
