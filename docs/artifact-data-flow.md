# Artifact 数据流与函数传递分析

本文档旨在分析和记录 `frontend/app/synphora.tsx` 中 `artifact` 相关数据的管理方式以及函数在组件树中的传递现象。

## 1. `useArtifacts` Hook 的作用

`useArtifacts` 是一个定义在 `synphora.tsx` 文件中的自定义 React hook，它是 `artifact` 功能区 **UI 状态管理的核心**。

它的主要职责是：
- 接收从外部（通常是 SWR hook）获取的 `artifacts` 数据。
- 管理与 `artifact` 面板显示/隐藏/折叠相关的 UI 状态。
- 管理当前被选中（或正在查看）的 `artifact` 的 ID。

### 输入 (Inputs)

该 hook 接收三个参数：
- `initialStatus: ArtifactStatus`: `artifact` 面板的初始状态（例如 `COLLAPSED`）。
- `artifacts: ArtifactData[]`: 完整的 `artifact` 对象数组。
- `initialArtifactId: string`: 初始状态下被选中的 `artifact` 的 ID。

### 输出 (Outputs)

该 hook 返回一个对象，包含以下状态和函数：
- **`artifacts`**: 接收到的原始 `artifacts` 数组，直接透传出来。
- **`artifactStatus`**: 当前 `artifact` 面板的 UI 状态 (`HIDDEN`, `COLLAPSED`, `EXPANDED`)。
- **`currentArtifact`**: 根据 `currentArtifactId` 从 `artifacts` 数组中计算得出的当前 `artifact` 对象。
- **`collapseArtifact()`**: 将 `artifactStatus` 设置为 `COLLAPSED` 的函数。
- **`expandArtifact()`**: 将 `artifactStatus` 设置为 `EXPANDED` 的函数。
- **`hideArtifact()`**: 将 `artifactStatus` 设置为 `HIDDEN` 的函数。
- **`setCurrentArtifactId()`**: 用于更新当前选中的 `artifact` ID 的函数。

在 `SynphoraPage` 组件中，`useArtifacts` 与 `useSWR` 协同工作，形成一个清晰的关注点分离：
- **`useSWR`**: 负责数据的获取、缓存和更新（与后端同步）。
- **`useArtifacts`**: 负责基于 `useSWR` 提供的数据，管理纯粹的前端 UI 展示逻辑。

## 2. 函数的传递深度 (Prop Drilling)

在 `SynphoraPage` 组件中，许多 `artifact` 相关的操作函数被定义后，通过 props 逐层传递到深层嵌套的子组件中。这种现象被称为 "Prop Drilling"。

这导致一些中间组件需要接收并传递它们自身并不使用的 props，增加了组件间的耦合度和维护成本。

以下一个典型的函数传递路径示例：

### 示例: `openArtifact` 函数

`openArtifact` 函数用于打开并展示一个 `artifact` 的详情。

- **源头**: 在 `SynphoraPage` 中定义。
- **传递路径 A (导航至 Artifact)**:
  1. `SynphoraPage` -> `Chatbot` (作为 `onArtifactNavigate` prop)
  2. `Chatbot` -> `Conversation` (假设的对话列表组件)
  3. `Conversation` -> `Message` (单个消息组件)
  4. `Message` -> `MarkdownRenderer` (Markdown 渲染器)
  5. `MarkdownRenderer` -> `CitationLink` (最终的引用链接组件，在此处被调用)
- **传递路径 B (打开列表项)**:
  1. `SynphoraPage` -> `ArtifactList` (作为 `onOpenArtifact` prop)
  2. `ArtifactList` -> `ArtifactListItem` (列表项组件)
  3. `ArtifactListItem` -> `<button>` (最终触发事件的按钮)

在这个链条中，`Chatbot`, `Conversation`, `Message`, `ArtifactList` 等组件都扮演了“中间人”的角色。
