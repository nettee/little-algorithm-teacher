import { isSynphoraPageTest } from "./env";
import {
  ArtifactData,
  ArtifactStatus,
  ArtifactType,
  ChatMessage,
  MessageRole,
} from "./types";

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
    parts: [{ type: "text", text: "动态规划怎么解？" }],
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
            <type>COURSE</type>
            <artifactId>dynamic-programming-basics</artifactId>
            <title>动态规划基础</title>
          </reference>
          <reference>
            <type>COURSE</type>
            <artifactId>two-dimensional-dynamic-programming</artifactId>
            <title>二维动态规划的解法</title>
          </reference>
          <reference>
            <type>MIND_MAP</type>
            <artifactId>mindmap-1</artifactId>
            <title>思维导图</title>
          </reference>
        </references>`,
      },
    ],
  },
];

const testArtifacts: ArtifactData[] = [
  {
    id: "problem-1",
    role: MessageRole.USER,
    type: ArtifactType.PROBLEM,
    title: "原问题",
    content: "给定一个整数数组，找出其中两个数，使得它们的和等于目标值。",
  },
  {
    id: "code-1",
    role: MessageRole.USER,
    type: ArtifactType.CODE,
    title: "代码",
    content: "使用动态规划解决这个问题。",
  },
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
    content:
      "二维动态规划问题同样遵循这四个解题步骤，不过每个步骤可能会更复杂。",
  },
  {
    id: "mindmap-1",
    role: MessageRole.ASSISTANT,
    type: ArtifactType.MIND_MAP,
    title: "思维导图",
    content: `
---
title: markmap
markmap:
  colorFreezeLevel: 2
---

# 动态规划

## 解题四步骤

+ 定义子问题
+ 写出子问题的递推关系
+ 确定 DP 数组的计算顺序
+ 空间优化（可选）

## 二维动态规划

+ 二维子问题
+ 二维 DP 数组
`,
  },
  {
    id: "explanation-1",
    role: MessageRole.ASSISTANT,
    type: ArtifactType.EXPLANATION,
    title: "文字讲解",
    content: "解释二维动态规划的解法。",
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
};

export const getSynphoraTestData = (): {
  artifacts: ArtifactData[];
  initialArtifactId: string;
} => {
  return {
    artifacts: testArtifacts,
    initialArtifactId: "explanation-1",
  };
};
