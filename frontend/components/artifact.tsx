import { getArtifactTypeRepresentation } from "@/lib/artifact";
import { isShowDebugInfo } from "@/lib/env";
import { ArtifactData, ArtifactType } from "@/lib/types";
import { Loader2, XIcon } from "lucide-react";
import { Streamdown } from "streamdown";
import {
  Artifact,
  ArtifactAction,
  ArtifactActions,
  ArtifactContent,
  ArtifactDescription,
  ArtifactHeader,
  ArtifactTitle,
} from "./ai-elements/artifact";

// Artifact 详情组件
export const ArtifactDetail = ({
  artifact,
  onCloseArtifact,
}: {
  artifact: ArtifactData;
  onCloseArtifact: () => void;
}) => {
  return (
    <Artifact data-role="artifact-detail" className="h-full">
      <ArtifactHeader>
        <div>
          <ArtifactTitle className="flex items-center gap-2">
            {artifact.title}
            {artifact.isStreaming && (
              <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
            )}
            {isShowDebugInfo() && (
              <span className="text-xs text-gray-500">{artifact.id}</span>
            )}
          </ArtifactTitle>
          {artifact.description && (
            <ArtifactDescription>{artifact.description}</ArtifactDescription>
          )}
        </div>
        <ArtifactActions>
          <ArtifactAction
            icon={XIcon}
            label="关闭"
            tooltip="关闭面板"
            onClick={() => onCloseArtifact()}
          />
        </ArtifactActions>
      </ArtifactHeader>
      <ArtifactContent className="h-full">
        {/* 定义 classname 为 streamdown，这样 globals.css 中的样式会生效 */}
        <Streamdown className="streamdown">{artifact.content}</Streamdown>
        {artifact.isStreaming && (
          <div className="mt-2 text-sm text-gray-500 flex items-center gap-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            正在生成中...
          </div>
        )}
      </ArtifactContent>
    </Artifact>
  );
};

interface ArtifactGroup {
  name: string;
  artifacts: ArtifactData[];
}

class ArtifactGrouper {
  public groupArtifacts(artifacts: ArtifactData[]): ArtifactGroup[] {
    const artifactsGroupMap = new Map<string, ArtifactData[]>();
    for (const artifact of artifacts) {
      const groupName = this.getArtifactGroup(artifact);
      if (!artifactsGroupMap.has(groupName)) {
        artifactsGroupMap.set(groupName, []);
      }
      artifactsGroupMap.get(groupName)?.push(artifact);
    }
    return Array.from(artifactsGroupMap.entries()).map(([name, artifacts]) => ({
      name,
      artifacts,
    }));
  }

  private getArtifactGroup(artifact: ArtifactData): string {
    if (artifact.type === ArtifactType.PROBLEM) {
      return "原问题";
    } else if (artifact.type === ArtifactType.CODE) {
      return "代码";
    } else if (
      artifact.type === ArtifactType.COURSE ||
      artifact.type === ArtifactType.EXPLANATION
    ) {
      return "讲解";
    } else {
      return "其他";
    }
  }

  public getArtifactLabel(artifact: ArtifactData): string | null {
    if (artifact.type === ArtifactType.COURSE) {
      return "课程";
    } else {
      return null;
    }
  }
}

// Artifact 列表组件
export const ArtifactList = ({
  artifacts,
  onOpenArtifact,
  onHideArtifact,
}: {
  artifacts: ArtifactData[];
  onOpenArtifact: (artifactId: string) => void;
  onHideArtifact?: () => void;
}) => {
  if (artifacts.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center text-gray-500">
          <div className="text-sm">暂无文件</div>
          <div className="text-xs mt-1">开始对话来创建文件</div>
        </div>
      </div>
    );
  }

  const artifactGrouper = new ArtifactGrouper();
  const artifactsGroups = artifactGrouper.groupArtifacts(artifacts);

  const renderArtifactItem = (artifact: ArtifactData) => {
    const artifactLabel = artifactGrouper.getArtifactLabel(artifact);
    return (
      <div
        key={artifact.id}
        onClick={() => onOpenArtifact(artifact.id)}
        className="p-3 rounded-lg border border-gray-200 cursor-pointer transition-all duration-200 hover:shadow-sm hover:border-gray-300 hover:bg-gray-50"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-gray-900 truncate">
              {artifact.title}
            </div>
            {artifact.description && (
              <div className="text-xs text-gray-600 mt-1 line-clamp-2">
                {artifact.description}
              </div>
            )}
            {isShowDebugInfo() && (
              <div className="text-xs text-gray-500 mt-1">{artifact.id}</div>
            )}
          </div>
          {artifactLabel && (
            <div className="text-xs px-2 py-1 rounded-full flex-shrink-0 bg-green-100 text-green-700">
              {artifactLabel}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div
      data-role="artifact-list"
      className="h-full flex flex-col bg-white border border-gray-200 rounded-lg"
    >
      {/* Artifact list header */}
      <div className="p-4 border-b border-gray-200 bg-gray-50 rounded-t-lg flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-900">所有文件</h3>
        {onHideArtifact && (
          <button
            onClick={onHideArtifact}
            className="p-1 rounded-md hover:bg-gray-200 transition-colors"
            title="隐藏文件面板"
          >
            <XIcon className="h-4 w-4 text-gray-500" />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {artifactsGroups.map((group) => (
          <div key={group.name} className="p-3 pb-0">
            <div className="flex items-center gap-2 mb-3">
              <div className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                {group.name}
              </div>
            </div>
            <div className="space-y-2">
              {group.artifacts.map(renderArtifactItem)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
