import React, { useEffect, useState } from 'react';
import type { TeachingStep } from '../services/teachingBoard';

export default function TeachingBoard({ step }: { step: TeachingStep }) {
  const [visibleCount,setVisibleCount]=useState(1);
  useEffect(()=>{
    if(visibleCount>=step.blocks.length)return;
    const timer=window.setTimeout(()=>setVisibleCount(count=>Math.min(step.blocks.length,count+1)),5000);
    return ()=>window.clearTimeout(timer);
  },[visibleCount,step]);
  return <article className="teaching-board-page"><div className="board-lesson-heading"><div><p className="board-lesson-kicker">On the board · {Math.min(visibleCount,step.blocks.length)} of {step.blocks.length}</p><h2>{step.title}</h2></div>{visibleCount<step.blocks.length&&<button type="button" className="board-reveal-button" onClick={()=>setVisibleCount(count=>Math.min(step.blocks.length,count+1))}>Show next point →</button>}</div><div className="teaching-board-blocks">{step.blocks.slice(0,visibleCount).map((block, index) => <section key={index} className={`board-block board-${block.kind}`} style={{ animationDelay: `${index * 160}ms` }}>
    {block.title && <h3>{block.title}</h3>}
    {(block.kind === 'points' || block.kind === 'definition') && <ul>{block.items.map((item, i) => <li key={i}>{item}</li>)}</ul>}
    {block.kind === 'table' && <div className="board-table-scroll"><table><caption className="sr-only">{block.title}</caption><thead><tr>{block.columns.map((column, i) => <th key={i} scope="col">{column}</th>)}</tr></thead><tbody>{block.rows.map((row, i) => <tr key={i}>{row.map((cell, j) => <td key={j}>{cell}</td>)}</tr>)}</tbody></table></div>}
    {block.kind === 'diagram' && <ol className="board-flow" aria-label={block.title}>{block.nodes.map((node, i) => <li key={i}><span className="board-node-number">{i + 1}</span><strong>{node}</strong>{i < block.nodes.length - 1 && <span className="board-arrow" aria-hidden="true">↓</span>}</li>)}</ol>}
    {block.kind === 'drawing' && <svg className="board-drawing-svg" viewBox="0 0 480 300" role="img" aria-label={`${block.title}: ${block.shapes.map(shape=>shape.label).filter(Boolean).join(', ')}`}>{block.shapes.map((shape,i)=><g key={i}>{shape.type==='circle'?<ellipse cx={shape.x+shape.width/2} cy={shape.y+shape.height/2} rx={shape.width/2} ry={shape.height/2}/>:shape.type==='rectangle'?<rect x={shape.x} y={shape.y} width={shape.width} height={shape.height} rx="8"/>:<line x1={shape.x} y1={shape.y} x2={shape.x+shape.width} y2={shape.y+shape.height}/>}<text x={Math.max(45,Math.min(435,shape.x+shape.width/2))} y={Math.min(292,shape.y+shape.height+20)} textAnchor="middle">{shape.label}</text></g>)}</svg>}
    {block.kind === 'chart' && <figure aria-label={block.title}><div className="board-bars">{block.labels.map((label, i) => <div key={i}><span>{label}</span><div className="board-bar-track"><div className="board-bar" style={{ width: `${block.values[i] / Math.max(1, ...block.values) * 100}%` }}/></div><strong>{block.values[i]} {block.unit}</strong></div>)}</div><figcaption>{block.unit}</figcaption></figure>}
  </section>)}</div>{step.question && visibleCount>=step.blocks.length && <div className="board-check"><span>Your turn</span><p>{step.question}</p></div>}</article>;
}
