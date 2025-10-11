'use client';

import { ReferenceCards } from '@/components/ai-elements/reference-card';
import { ArtifactType } from '@/lib/types';

const testReferences = [
  {
    title: '动态规划基础教程',
    artifactId: 'artifact-1',
    description: '这是一篇关于动态规划基础概念和应用的详细教程，包含了多个经典例题的解析。',
    type: ArtifactType.ORIGINAL
  },
  {
    title: 'LeetCode 动态规划题目集合',
    artifactId: 'artifact-2',
    description: '收集了 LeetCode 上最经典的动态规划题目，从简单到困难，适合不同水平的学习者。',
    type: ArtifactType.COMMENT
  },
  {
    title: '算法导论 - 动态规划章节',
    artifactId: 'artifact-3',
    description: '经典算法教材中关于动态规划的理论基础和数学证明。',
    type: ArtifactType.ORIGINAL
  }
];

export default function ReferenceCardDemo() {
  return (
    <div className="container mx-auto p-8 max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">引用卡片组件演示</h1>
      
      <div className="space-y-8">
        <section>
          <h2 className="text-lg font-semibold mb-4">单个引用卡片</h2>
          <ReferenceCards
            references={[testReferences[0]]}
            onReferenceClick={(reference) => {
              console.log('点击了引用:', reference);
              alert(`点击了引用: ${reference.title} (Artifact ID: ${reference.artifactId})`);
            }}
          />
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-4">多个引用卡片</h2>
          <ReferenceCards
            references={testReferences}
            onReferenceClick={(reference) => {
              console.log('点击了引用:', reference);
              alert(`将导航到 Artifact: ${reference.artifactId}`);
            }}
          />
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-4">在对话中的效果预览</h2>
          <div className="border rounded-lg p-4 bg-background">
            <div className="mb-4">
              <div className="bg-muted p-3 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">用户</p>
                <p>请介绍一下动态规划的基本概念</p>
              </div>
            </div>
            
            <div className="mb-4">
              <div className="bg-primary/5 p-3 rounded-lg">
                <p className="text-sm text-muted-foreground mb-2">助手</p>
                <p className="mb-4">
                  动态规划是一种算法设计技术，通过将复杂问题分解为更简单的子问题来求解。
                  它的核心思想是避免重复计算，通过存储已经计算过的结果来提高效率。
                </p>
                <ReferenceCards
                  references={testReferences}
                  onReferenceClick={(reference) => {
                    console.log('点击了引用:', reference);
                    alert(`将导航到 Artifact: ${reference.artifactId}`);
                  }}
                />
              </div>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-4">不同类型的引用</h2>
          <div className="space-y-4">
            <div>
              <h3 className="text-md font-medium mb-2">原文类型</h3>
              <ReferenceCards
                references={testReferences.filter(ref => ref.type === ArtifactType.ORIGINAL)}
                onReferenceClick={(reference) => {
                  console.log('点击了原文引用:', reference);
                }}
              />
            </div>
            <div>
              <h3 className="text-md font-medium mb-2">评论类型</h3>
              <ReferenceCards
                references={testReferences.filter(ref => ref.type === ArtifactType.COMMENT)}
                onReferenceClick={(reference) => {
                  console.log('点击了评论引用:', reference);
                }}
              />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
