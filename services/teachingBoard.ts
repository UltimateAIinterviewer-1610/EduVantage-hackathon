export type BoardBlock =
  | { kind: 'points' | 'definition'; title: string; items: string[] }
  | { kind: 'table'; title: string; columns: string[]; rows: string[][] }
  | { kind: 'diagram'; title: string; nodes: string[] }
  | { kind: 'drawing'; title: string; shapes: { type: 'circle' | 'rectangle' | 'line'; x: number; y: number; width: number; height: number; label: string }[] }
  | { kind: 'chart'; title: string; labels: string[]; values: number[]; unit: string };
export interface TeachingStep { title: string; narration: string; blocks: BoardBlock[]; question: string }

export const teachingBoardInstruction = `Teach as a patient classroom teacher, one small concept per turn. Start with a relatable example, explain why it works, and ask one question before moving on. Respond to student answers and questions before continuing. Do not deliver an entire chapter at once. Speak directly to the learner in a warm, conversational voice; use short sentences, refer to each visual as you explain it, and pause for their response. Never recite board notes, headings, markup, or a prepared essay aloud. Keep the spoken explanation to roughly 60–90 words and make it different from the concise board notes. Use the requested teaching language for every string.
Return ONLY JSON with this shape:
{"title":"Short concept title","narration":"Conversational explanation, roughly 60–90 words. No markdown. Refer to the board naturally.","blocks":[{"kind":"definition","title":"Term","items":["Short definition"]},{"kind":"points","title":"Remember","items":["Point one","Point two"]}],"question":"One short understanding check"}.
Include 1–3 relevant board blocks. Other permitted blocks:
{"kind":"table","title":"Comparison","columns":["Aspect","A","B"],"rows":[["Property","Description A","Description B"]]}
{"kind":"diagram","title":"Labelled process or relationship","nodes":["First","Then","Result"]}
{"kind":"drawing","title":"A labelled concept sketch","shapes":[{"type":"circle","x":80,"y":100,"width":60,"height":60,"label":"Sun"},{"type":"line","x":150,"y":130,"width":100,"height":0,"label":"Light"},{"type":"rectangle","x":270,"y":100,"width":90,"height":90,"label":"Panel"}]}
Drawings use a 480 by 300 canvas; x and y are the top-left position and width/height are dimensions. Use at most 10 non-overlapping labelled shapes. Use lines for connections, circles and rectangles for concept sketches. Keep labels short and leave room for them below each shape.
{"kind":"chart","title":"Comparison (illustrative if hypothetical)","labels":["A","B"],"values":[2,4],"unit":"units"}
Use diagrams to show processes, tables to compare concepts, and charts only when numerical data is relevant. Never invent factual statistics; explicitly label hypothetical data illustrative. No HTML, SVG, scripts, URLs or markdown in the JSON. Stay on the student's chosen subject/chapter/topic. Never reveal the answer to the understanding check before the student attempts it.`;

const clean = (value: unknown, limit = 1000) => typeof value === 'string' ? value.slice(0, limit).trim() : '';
const strings = (value: unknown, max: number) => Array.isArray(value) ? value.slice(0, max).map(item => clean(item, 240)).filter(Boolean) : [];
export function parseTeachingStep(reply: string, topic: string): TeachingStep {
  try {
    const data = JSON.parse(reply.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, ''));
    if (!data || typeof data.narration !== 'string' || !Array.isArray(data.blocks)) throw new Error('Invalid step');
    const blocks: BoardBlock[] = [];
    for (const block of data.blocks.slice(0, 3)) {
      if (!block || typeof block !== 'object') continue;
      const title = clean(block.title, 160);
      if (block.kind === 'points' || block.kind === 'definition') {
        const items = strings(block.items, 5); if (items.length) blocks.push({ kind: block.kind, title, items });
      } else if (block.kind === 'diagram') {
        const nodes = strings(block.nodes, 5); if (nodes.length) blocks.push({ kind: 'diagram', title, nodes });
      } else if (block.kind === 'table') {
        const columns = strings(block.columns, 5);
        const rows = Array.isArray(block.rows) ? block.rows.filter(Array.isArray).slice(0, 6).map((row: unknown[]) => columns.map((_, i) => clean(row[i], 240))) : [];
        if (columns.length && rows.length) blocks.push({ kind: 'table', title, columns, rows });
      } else if (block.kind === 'drawing') {
        const coordinate = (value: unknown, max: number) => typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.min(max, value)) : 0;
        const shapes = Array.isArray(block.shapes) ? block.shapes.filter((shape: any) => shape && ['circle','rectangle','line'].includes(shape.type)).slice(0,10).map((shape: any) => {
          const x=coordinate(shape.x,440),y=coordinate(shape.y,240);
          return {type:shape.type,x,y,width:coordinate(shape.width,480-x),height:coordinate(shape.height,270-y),label:clean(shape.label,45)};
        }) : [];
        if (shapes.length) blocks.push({kind:'drawing',title,shapes});
      } else if (block.kind === 'chart') {
        const labels = strings(block.labels, 6);
        const values = Array.isArray(block.values) ? block.values.slice(0, labels.length) : [];
        if (labels.length && values.length === labels.length && values.every((v: unknown) => typeof v === 'number' && Number.isFinite(v) && v >= 0)) blocks.push({ kind: 'chart', title, labels, values, unit: clean(block.unit, 60) });
      }
    }
    const narration = clean(data.narration, 3000);
    if (!narration || !blocks.length) throw new Error('Empty step');
    return { title: clean(data.title, 180) || topic, narration, blocks, question: clean(data.question, 400) };
  } catch {
    // Plain-text providers still produce readable notes, without interpreting model HTML.
    const plain = reply.replace(/```[^\n]*\n?/g, '').replace(/^\s*#{1,6}\s*/gm, '').replace(/\*\*/g, '').trim();
    const items = plain.split(/\n+/).map(line => line.replace(/^[-*]\s*/, '').trim()).filter(Boolean);
    return { title: topic, narration: plain, blocks: [{ kind: 'points', title: '', items: items.length ? items : ['No explanation received. Please try again.'] }], question: '' };
  }
}
