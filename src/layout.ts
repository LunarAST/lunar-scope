import ELK from "elkjs/lib/elk.bundled.js";
import type { ElkNode } from "elkjs";

const elk = new ELK();

export async function computeLayout(
  nodes: { id: string; width: number; height: number }[],
  edges: { id: string; source: string; target: string }[]
): Promise<{ id: string; x: number; y: number }[]> {
  const graph: ElkNode = {
    id: "root",
    layoutOptions: {
      "elk.algorithm": "layered",
      "elk.direction": "RIGHT",
      "elk.spacing.nodeNode": "80",
      "elk.layered.spacing.nodeNodeBetweenLayers": "120",
    },
    children: nodes.map((n) => ({
      id: n.id,
      width: n.width,
      height: n.height,
    })),
    edges: edges.map((e) => ({
      id: e.id,
      sources: [e.source],
      targets: [e.target],
    })),
  };

  const layout = await elk.layout(graph);

  if (!layout.children) return [];

  return layout.children.map((child) => ({
    id: child.id,
    x: child.x ?? 0,
    y: child.y ?? 0,
  }));
}
