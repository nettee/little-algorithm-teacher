import React, { useRef, useEffect } from 'react';
import { Markmap } from 'markmap-view';
import { transformer } from './markmap';
import { Toolbar } from 'markmap-toolbar';
import 'markmap-toolbar/dist/style.css';

const content = `
# 动态规划

+ 定义子问题
+ 写出子问题的递推关系
+ 确定 DP 数组的计算顺序
+ 空间优化（可选）
`;

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

export default function MarkmapHooks() {
  const value = content; // 固定使用 content 作为值
  // Ref for SVG element
  const refSvg = useRef<SVGSVGElement>();
  // Ref for markmap object
  const refMm = useRef<Markmap>();
  // Ref for toolbar wrapper
  const refToolbar = useRef<HTMLDivElement>();

  useEffect(() => {
    // Create markmap and initialize with data
    if (refSvg.current && !refMm.current) {
      const mm = Markmap.create(refSvg.current);
      refMm.current = mm;
      renderToolbar(refMm.current, refToolbar.current);
      
      // Set initial data
      const { root } = transformer.transform(value);
      mm.setData(root).then(() => {
        mm.fit();
      });
    }
  }, []);

  return (
    <React.Fragment>
      <svg className="flex-1" ref={refSvg} />
      <div className="flex justify-between items-center border-t-1 p-2">
        <p>思维导图</p>
        <div className="" ref={refToolbar}></div>
      </div>
    </React.Fragment>
  );
}
