# 算法题教学 Agent

以 LeetCode 例题精讲课程为内容基础，将静态的课程内容转化为动态的 AI 教学内容，包括解题思路讲解与代码讲解。

## 快速开始

设置 LLM 环境变量：

```bash
cp .env.example .env
```

在 .env 文件中设置 LLM 的 API Key，推荐 DeepSeek。

启动后端服务：

```bash
cd backend
uv sync
uv run dev
```

启动前端服务：

```bash
cd frontend
pnpm install
pnpm dev
```