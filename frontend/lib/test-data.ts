import { ArtifactData, ArtifactType, ChatMessage, MessageRole } from "./types";




export const testArtifacts: ArtifactData[] = [
  {
    id: '1',
    role: MessageRole.USER,
    type: ArtifactType.OTHER,
    title: '如何在 Cursor 与 Claude Code 之间选择.md',
    content: 'aaaaaa',
  },
  // {
  //   id: '2',
  //   role: MessageRole.ASSISTANT,
  //   type: ArtifactType.COMMENT,
  //   title: 'React Component Example',
  //   content: 'import React from "react";\n\nfunction Example() {\n  return <div>Hello World</div>;\n}\n\nexport default Example;',
  // },
  // {
  //   id: '3',
  //   role: MessageRole.ASSISTANT,
  //   type: ArtifactType.COMMENT,
  //   title: 'API Response Schema',
  //   content: '{\n  "status": "success",\n  "data": {\n    "message": "Hello from API"\n  }\n}',
  // },
];