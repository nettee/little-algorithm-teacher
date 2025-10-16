/**
 * 思维导图组件
 */

import { transformer } from '@/lib/markmap';
import { Toolbar } from 'markmap-toolbar';
import 'markmap-toolbar/dist/style.css';
import { Markmap } from 'markmap-view';
import React, { useEffect, useRef, useCallback } from 'react';

/**
 * 渲染工具栏
 * @param mm Markmap 实例
 * @param wrapper 工具栏容器元素
 */
function renderToolbar(mm: Markmap, wrapper: HTMLElement) {
  while (wrapper?.firstChild) wrapper.firstChild.remove();
  if (mm && wrapper) {
    const toolbar = new Toolbar();
    toolbar.attach(mm);
    // 设置 toolbar，不展示 markmap 标识，只取前三个按钮
    toolbar.setBrand(false);
    toolbar.setItems(Toolbar.defaultItems.slice(0, 3));
    wrapper.append(toolbar.render());
  }
}

export default function MindMap({ content }: { content: string }) {
  console.log(`MindMap content: ${content}`)

  // DOM 元素引用
  const refSvg = useRef<SVGSVGElement>(null);        // SVG 画布元素
  const refMm = useRef<Markmap>(null);               // Markmap 实例
  const refToolbar = useRef<HTMLDivElement>(null);   // 工具栏容器
  const refContainer = useRef<HTMLDivElement>(null); // 整个组件的容器元素

  /**
   * 适应画布的函数
   * 解决问题：确保思维导图在容器尺寸确定后正确适应画布
   * 使用 setTimeout 的原因：给 DOM 渲染和布局计算留出时间
   */
  const fitToCanvas = useCallback(() => {
    if (refMm.current) {
      // 延迟执行 fit()，确保容器尺寸已经稳定
      // 100ms 的延迟足够让大多数布局变化完成
      setTimeout(() => {
        refMm.current?.fit();
      }, 100);
    }
  }, []);

  /**
   * 初始化 markmap 实例
   * 只在组件首次挂载时执行一次
   * 分离初始化和数据设置，避免重复创建实例
   */
  useEffect(() => {
    if (refSvg.current && !refMm.current) {
      // 创建 markmap 实例
      const mm = Markmap.create(refSvg.current);
      refMm.current = mm;
      
      // 初始化工具栏（如果容器已准备好）
      if (refToolbar.current) {
        renderToolbar(refMm.current, refToolbar.current);
      }
    }
  }, []); // 空依赖数组，只执行一次

  /**
   * 响应内容变化，更新思维导图数据
   * 当 content 属性变化时重新渲染思维导图
   * 解决问题：确保内容更新后立即适应画布
   */
  useEffect(() => {
    if (refMm.current && content) {
      // 将 markdown 内容转换为思维导图数据结构
      const { root } = transformer.transform(content);
      
      // 设置数据并在完成后适应画布
      refMm.current.setData(root).then(() => {
        fitToCanvas(); // 数据设置完成后立即适应画布
      });
    }
  }, [content, fitToCanvas]); // 依赖 content 和 fitToCanvas

  /**
   * 监听容器尺寸变化
   * 解决问题：当 artifact 从折叠状态展开时，容器尺寸发生变化，
   * 思维导图需要重新适应新的容器尺寸
   */
  useEffect(() => {
    if (!refContainer.current) return;

    // 创建 ResizeObserver 监听容器尺寸变化
    const resizeObserver = new ResizeObserver(() => {
      // 容器尺寸变化时重新适应画布
      fitToCanvas();
    });

    // 开始监听容器元素
    resizeObserver.observe(refContainer.current);

    // 清理函数：组件卸载时停止监听
    return () => {
      resizeObserver.disconnect();
    };
  }, [fitToCanvas]); // 依赖 fitToCanvas 函数

  return (
    <React.Fragment>
      {/* 主容器：添加 ref 用于监听尺寸变化 */}
      <div ref={refContainer} className="h-full flex flex-col border-1 border-gray-200 rounded-lg">
        {/* SVG 画布：flex-1 让它占据剩余空间 */}
        <svg className="flex-1" ref={refSvg} />
        
        {/* 底部工具栏区域 */}
        <div className="flex justify-between items-center border-t-1 p-2">
          <p>思维导图</p>
          {/* 工具栏容器：放置缩放、适应等操作按钮 */}
          <div className="" ref={refToolbar}></div>
        </div>
      </div>
    </React.Fragment>
  );
}
