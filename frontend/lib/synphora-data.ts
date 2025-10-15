import { isSynphoraPageTest } from "./env";
import { ArtifactData, ArtifactStatus, ArtifactType, ChatMessage, MessageRole } from "./types";

const initialMessages: ChatMessage[] = [
  {
    id: "1",
    role: MessageRole.ASSISTANT,
    parts: [
      {
        type: "text",
        text: "你好，我是你的算法题辅导员。请输入你想学习的算法题，我会根据《LeetCode 例题精讲》的思路为你讲解。",
      },
    ],
  },
];

const testInitialMessages: ChatMessage[] = [
  {
    id: "1",
    role: MessageRole.ASSISTANT,
    parts: [
      {
        type: "text",
        text: "你好，我是你的算法题辅导员。请输入你想学习的算法题，我会根据《LeetCode 例题精讲》的思路为你讲解。",
      },
    ],
  },
  {
    id: "2",
    role: MessageRole.USER,
    parts: [{ type: 'text', text: '动态规划怎么解？' }],
  },
  {
    id: "4",
    role: MessageRole.ASSISTANT,
    parts: [
      { 
        type: "text",
        text: `这里有两篇关于动态规划的例子，你可以参考这两篇文档来学习基础知识。
        <references>
          <reference>
            <artifactId>dynamic-programming-basics</artifactId>
            <title>动态规划基础</title>
          </reference>
          <reference>
            <artifactId>two-dimensional-dynamic-programming</artifactId>
            <title>二维动态规划的解法</title>
          </reference>
        </references>`,
      },
    ],
  },
];

const testArtifacts: ArtifactData[] = [
  {
    id: "dynamic-programming-basics",
    role: MessageRole.ASSISTANT,
    type: ArtifactType.COURSE,
    title: "动态规划基础",
    content: `动态规划的的四个解题步骤是：

- 定义子问题
- 写出子问题的递推关系
- 确定 DP 数组的计算顺序
- 空间优化（可选）`,
  },
  {
    id: "two-dimensional-dynamic-programming",
    role: MessageRole.ASSISTANT,
    type: ArtifactType.COURSE,
    title: "二维动态规划的解法",
    content: "二维动态规划问题同样遵循这四个解题步骤，不过每个步骤可能会更复杂。",
  },
];

export const getSynphoraInitialData = (): {
  initialArtifactStatus: ArtifactStatus;
  initialMessages: ChatMessage[];
} => {
  if (isSynphoraPageTest()) {
    return {
      initialArtifactStatus: ArtifactStatus.COLLAPSED,
      initialMessages: testInitialMessages,
    };
  }

  return {
    initialArtifactStatus: ArtifactStatus.HIDDEN,
    initialMessages: initialMessages,
  };
}

export const getSynphoraTestArtifacts = (): ArtifactData[] => {
  return testArtifacts;
}