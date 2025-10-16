import { Streamdown } from "streamdown";
import { Loader2 } from "lucide-react";

export default function Markdown({
  content,
  isStreaming = false,
}: {
  content: string;
  isStreaming?: boolean;
}) {
  return (
    <div className="p-4">
      {/* 定义 classname 为 streamdown，这样 globals.css 中的样式会生效 */}
      <Streamdown className="streamdown">{content}</Streamdown>
      {isStreaming && (
        <div className="mt-2 text-sm text-gray-500 flex items-center gap-1">
          <Loader2 className="h-3 w-3 animate-spin" />
          正在生成中...
        </div>
      )}
    </div>
  );
}
