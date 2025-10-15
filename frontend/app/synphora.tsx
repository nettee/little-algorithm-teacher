"use client";

import React, { useState } from "react";
import useSWR from "swr";

import { ArtifactDetail, ArtifactList } from "@/components/artifact";
import { Chatbot } from "@/components/chatbot";
import {
  ArtifactData,
  MessageRole,
  ArtifactType,
  ArtifactStatus,
} from "@/lib/types";
import { fetchArtifacts } from "@/lib/api";
import { getSynphoraInitialData, getSynphoraTestArtifacts } from "@/lib/synphora-data";
import { isSynphoraPageTest } from "@/lib/env";

const useArtifacts = (
  initialStatus: ArtifactStatus,
  artifacts: ArtifactData[],
  initialArtifactId: string
) => {
  const [artifactStatus, setArtifactStatus] = useState<ArtifactStatus>(initialStatus);
  const [currentArtifactId, setCurrentArtifactId] =
    useState<string>(initialArtifactId);

  const currentArtifact =
    artifacts.find((artifact) => artifact.id === currentArtifactId) ||
    artifacts[0];
  
  console.log(`artifacts: ${artifacts}`);
  console.log(`currentArtifactId: ${currentArtifactId}, currentArtifact: ${currentArtifact}`);
    
  const collapseArtifact = () => {
    setArtifactStatus(ArtifactStatus.COLLAPSED);
  };

  const expandArtifact = () => {
    setArtifactStatus(ArtifactStatus.EXPANDED);
  };

  const hideArtifact = () => {
    setArtifactStatus(ArtifactStatus.HIDDEN);
  };

  return {
    artifacts,
    artifactStatus,
    currentArtifact,
    collapseArtifact,
    expandArtifact,
    hideArtifact,
    setCurrentArtifactId,
  };
};

const SynphoraPage = () => {
  const { initialArtifactStatus, initialMessages } = getSynphoraInitialData();

  const {
    data,
    error,
    isLoading,
    mutate,
  } = useSWR("/artifacts", fetchArtifacts);

  let artifactsData = isSynphoraPageTest() ? getSynphoraTestArtifacts() : data || [];

  const {
    artifacts,
    artifactStatus,
    currentArtifact,
    collapseArtifact,
    expandArtifact,
    hideArtifact,
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

  const closeArtifactToCollapsed = () => {
    collapseArtifact();
  };

  // 处理流式 Artifact 事件 - 使用 SWR 缓存作为单一数据源
  const onArtifactContentStart = (
    artifactId: string,
    title: string,
    description?: string
  ) => {
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
      if (prev.some((a) => a.id === artifactId)) return prev;
      return [...prev, newArtifact];
    }, false);
    setCurrentArtifactId(artifactId);
    expandArtifact(); // 自动展开 artifact 面板
  };

  const onArtifactContentChunk = (artifactId: string, chunk: string) => {
    mutate(
      (prev: ArtifactData[] = []) =>
        prev.map((a) =>
          a.id === artifactId ? { ...a, content: (a.content || "") + chunk } : a
        ),
      false
    );
  };

  const onArtifactContentComplete = (artifactId: string) => {
    mutate(
      (prev: ArtifactData[] = []) =>
        prev.map((a) =>
          a.id === artifactId ? { ...a, isStreaming: false } : a
        ),
      false
    );
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
          当 artifact 部分隐藏时，chatbot 部分占据全部宽度
          当 artifact 部分收起时，artifact 部分固定占据 w-96 宽度，chatbot 部分占据剩余宽度
          当 artifact 部分展开时，artifact 部分占据 2/3 宽度，chatbot 部分占据 1/3 宽度
        */}
        <div
          data-role="chatbot-container"
          className={`flex flex-col min-h-0 ${
            artifactStatus === ArtifactStatus.EXPANDED ? "w-1/3" : "flex-1"
          }`}
        >
          <Chatbot
            initialMessages={initialMessages}
            onArtifactContentStart={onArtifactContentStart}
            onArtifactContentChunk={onArtifactContentChunk}
            onArtifactContentComplete={onArtifactContentComplete}
            onArtifactListUpdated={onArtifactListUpdated}
            onArtifactNavigate={openArtifact}
          />
        </div>
        {artifactStatus !== ArtifactStatus.HIDDEN && (
          <div
            data-role="artifact-container"
            className={`min-h-0 transition-all duration-300 ${
              artifactStatus === ArtifactStatus.COLLAPSED ? "w-96" : "w-2/3"
            }`}
          >
            {artifactStatus === ArtifactStatus.COLLAPSED ? (
              <ArtifactList
                artifacts={artifacts}
                onOpenArtifact={openArtifact}
                onHideArtifact={hideArtifact}
              />
            ) : currentArtifact ? (
              <ArtifactDetail
                artifact={currentArtifact}
                onCloseArtifact={closeArtifactToCollapsed}
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
