import { isSynphoraPageTest } from "./env";
import {
  ArtifactData,
  ArtifactStatus,
  ArtifactType,
  ChatMessage,
  CitationType,
  MessageRole,
  ReferenceType,
  ToolCallStatus,
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
    id: "3",
    role: MessageRole.ASSISTANT,
    parts: [
      {
        type: "reasoning",
        text: "嗯。用户问我动态规划怎么解。"
      },
      {
        type: "text",
        text: "让我查找一些相关文章",
      },
    ],
  },
  {
    id: "tool-1",
    role: MessageRole.ASSISTANT,
    parts: [
      {
        type: "tool",
        text: "",
        toolCall: {
          id: "tool-1",
          status: ToolCallStatus.COMPLETED,
          name: "查询文章列表",
        },
      },
    ],
  },
  {
    id: "tool-2",
    role: MessageRole.ASSISTANT,
    parts: [
      {
        type: "tool",
        text: "",
        toolCall: {
          id: "tool-2",
          status: ToolCallStatus.RUNNING,
          name: "查询文章内容",
        },
      }
    ],
  },
  {
    id: "with-citations",
    role: MessageRole.ASSISTANT,
    parts: [
      {
        type: "text",
        text: `## 动态规划基础

首先，让我们回顾一下动态规划的基本解题框架。根据[14 打家劫舍：动态规划的解题四步骤](COURSE:14-dynamic-programming-basics)，动态规划问题的解题分为四个步骤：

1. **定义子问题** - 将原问题分解为规模较小的相似问题
2. **写出子问题的递推关系** - 找出子问题之间的数学关系
3. **确定 DP 数组的计算顺序** - 确保计算每个子问题时，其依赖的子问题已经计算完成
4. **空间优化（可选）** - 降低空间复杂度

## 二维动态规划思路

编辑距离问题属于二维动态规划问题，与最长公共子序列（LCS）问题类似。根据[15 最长公共子序列：二维动态规划的解法](COURSE:15-two-dimensional-dynamic-programming)，二维动态规划的核心思想是：

- 子问题有两个参数，对应两个维度
- DP 数组是二维的，每个元素对应一个子问题
- 需要确定正确的计算顺序，确保依赖关系得到满足
`,
      },
    ],
  },
  {
    id: "with-mind-map",
    role: MessageRole.ASSISTANT,
    parts: [
      {
        type: "text",
        text: "这是为你生成的[思维导图](MIND_MAP:mindmap-1)，你可以参考这个思维导图来学习动态规划。",
      },
    ],
  },
  {
    id: "user-2",
    role: MessageRole.USER,
    parts: [
      {
        type: "text",
        text: "继续讲解代码实现",
      },
    ],
  },
  {
    id: "solution-code-explanation",
    role: MessageRole.ASSISTANT,
    parts: [
      {
        type: "text",
        text: `这是具体的题解代码，已为您生成：[题解代码](SOLUTION_CODE:solution-code-1)`,
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
    type: ArtifactType.USER_CODE,
    title: "用户代码",
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
    id: "solution-code-1",
    role: MessageRole.ASSISTANT,
    type: ArtifactType.SOLUTION_CODE,
    title: "题解代码",
    content: `\`\`\`python
def solution(nums, target):
  for i in range(len(nums)):
    for j in range(i + 1, len(nums)):
      if nums[i] + nums[j] == target:
        return [i, j]
  return []
\`\`\``,
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
