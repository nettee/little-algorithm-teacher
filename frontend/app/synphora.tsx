"use client";

import React, { useState } from "react";
import useSWR from "swr";

import { ArtifactDetail, ArtifactList } from "@/components/artifact";
import { Chatbot } from "@/components/chatbot";
import { ArtifactData, ChatMessage, MessageRole, ArtifactType } from "@/lib/types";
import { fetchArtifacts } from "@/lib/api";

enum ArtifactStatus {
  COLLAPSED = "collapsed",
  EXPANDED = "expanded",
}

const useArtifacts = (
  initialStatus: ArtifactStatus = ArtifactStatus.COLLAPSED,
  artifacts: ArtifactData[],
  initialArtifactId: string
) => {
  const [artifactStatus, setArtifactStatus] =
    useState<ArtifactStatus>(artifacts.length > 0 ? initialStatus : ArtifactStatus.COLLAPSED);
  const [currentArtifactId, setCurrentArtifactId] =
    useState<string>(initialArtifactId);

  const currentArtifact =
    artifacts.find((artifact) => artifact.id === currentArtifactId) ||
    artifacts[0];

  const collapseArtifact = () => {
    setArtifactStatus(ArtifactStatus.COLLAPSED);
  };

  const expandArtifact = () => {
    setArtifactStatus(ArtifactStatus.EXPANDED);
  };

  return {
    artifacts,
    artifactStatus,
    currentArtifact,
    collapseArtifact,
    expandArtifact,
    setCurrentArtifactId,
  };
};

const initialMessages: ChatMessage[] = [
  {
    id: "2",
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
    id: "2",
    role: MessageRole.ASSISTANT,
    parts: [
      {
        type: "text",
        text: "你好，我是你的算法题辅导员。请输入你想学习的算法题，我会根据《LeetCode 例题精讲》的思路为你讲解。",
      },
    ],
  },
  {
    id: "4",
    role: MessageRole.ASSISTANT,
    parts: [
      {
        type: "text",
        text: `这里有两篇关于动态规划的例子，你可以参考这两篇文档来学习基础知识。
        <reference>
          <artifactId>14-dynamic-programming-basics</artifactId>
          <title>动态规划基础</title>
        </reference>
        <reference>
          <artifactId>15-two-dimensional-dynamic-programming</artifactId>
          <title>最长公共子序列：二维动态规划的解法</title>
        </reference>`,
      },
    ],
  },
];


const SynphoraPage = ({
  initialArtifactStatus = ArtifactStatus.EXPANDED,
}: {
  initialArtifactStatus?: ArtifactStatus;
} = {}) => {
  const synphoraPageTest = process.env.NEXT_PUBLIC_SYNPHORA_PAGE_TEST === "true";

  const {
    data: artifactsData = [],
    error,
    isLoading,
    mutate,
  } = useSWR("/artifacts", fetchArtifacts);

  const {
    artifacts,
    artifactStatus,
    currentArtifact,
    collapseArtifact,
    expandArtifact,
    setCurrentArtifactId,
  } = useArtifacts(
    initialArtifactStatus,
    artifactsData,
    artifactsData[0]?.id || ""
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen text-gray-500">
        <div className="text-center">
          <h2 className="text-xl mb-2">Loading...</h2>
          <p>正在加载文档数据...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen text-red-500">
        <div className="text-center">
          <h2 className="text-xl mb-2">加载失败</h2>
          <p>无法连接到后端服务，请检查后端是否正常运行。</p>
        </div>
      </div>
    );
  }

  const openArtifact = (artifactId: string) => {
    expandArtifact();
    setCurrentArtifactId(artifactId);
  };

  const closeArtifact = () => {
    collapseArtifact();
  };

  // 处理流式 Artifact 事件 - 使用 SWR 缓存作为单一数据源
  const onArtifactContentStart = (artifactId: string, title: string, description?: string) => {
    const newArtifact: ArtifactData = {
      id: artifactId,
      title,
      description,
      content: "",
      isStreaming: true,
      role: MessageRole.ASSISTANT,
      type: ArtifactType.OTHER,
    };

    // 直接写入 SWR 缓存，避免本地副本
    mutate((prev: ArtifactData[] = []) => {
      if (prev.some(a => a.id === artifactId)) return prev;
      return [...prev, newArtifact];
    }, false);
    setCurrentArtifactId(artifactId);
    expandArtifact(); // 自动展开 artifact 面板
  };

  const onArtifactContentChunk = (artifactId: string, chunk: string) => {
    mutate((prev: ArtifactData[] = []) =>
      prev.map(a => a.id === artifactId ? { ...a, content: (a.content || "") + chunk } : a)
    , false);
  };

  const onArtifactContentComplete = (artifactId: string) => {
    mutate((prev: ArtifactData[] = []) =>
      prev.map(a => a.id === artifactId ? { ...a, isStreaming: false } : a)
    , false);
  };

  const onArtifactListUpdated = () => {
    // 以服务端为准，刷新缓存
    mutate();
  };

  return (
    <div className="w-full h-screen mx-auto flex flex-col">
      <div className="w-full flex-1 flex gap-4 p-6 min-h-0">
        {/* 
          根据 artifactStatus 灵活布局
          当 artifact 部分收起时，artifact 部分固定占据 w-96 宽度，chatbot 部分占据剩余宽度
          当 artifact 部分展开时，artifact 部分占据 2/3 宽度，chatbot 部分占据 1/3 宽度
        */}
        <div
          data-role="chatbot-container"
          className={`flex flex-col min-h-0 ${
            artifactStatus === ArtifactStatus.COLLAPSED ? "flex-1" : "w-1/3"
          }`}
        >
          <Chatbot
            initialMessages={synphoraPageTest ? testInitialMessages : initialMessages}
            onArtifactContentStart={onArtifactContentStart}
            onArtifactContentChunk={onArtifactContentChunk}
            onArtifactContentComplete={onArtifactContentComplete}
            onArtifactListUpdated={onArtifactListUpdated}
            onArtifactNavigate={openArtifact}
          />
        </div>
        {artifacts.length > 0 && (
          <div
            data-role="artifact-container"
            className={`min-h-0 transition-all duration-300 ${
              artifactStatus === ArtifactStatus.COLLAPSED ? "w-96" : "w-2/3"
            }`}
          >
            {artifactStatus === ArtifactStatus.COLLAPSED ? (
              <ArtifactList artifacts={artifacts} onOpenArtifact={openArtifact} />
            ) : currentArtifact ? (
              <ArtifactDetail
                artifact={currentArtifact}
                onCloseArtifact={closeArtifact}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                <div className="text-center">
                  <h3 className="text-lg mb-2">No artifact selected</h3>
                  <p>Please select an artifact from the list.</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SynphoraPage;
