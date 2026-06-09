import ELK from "elkjs/lib/elk.bundled.js";
import type { ElkNode } from "elkjs";

const elk = new ELK();

const deterministicOptions = {
  "elk.algorithm": "layered",
  "elk.layered.nodePlacement.strategy": "BRANDES_KOEPF",
  "elk.layered.nodePlacement.bk.fixedAlignment": "BALANCED",
  "elk.layered.crossingMinimization.strategy": "LAYER_SWEEP",
  "elk.layered.considerModelOrder.strategy": "NODES_AND_PORTS",
  "elk.layered.layering.strategy": "NETWORK_SIMPLEX",
  "elk.spacing.nodeNode": "80",
  "elk.layered.spacing.nodeNodeBetweenLayers": "120",
  "elk.spacing.portPort": "20",
  "elk.spacing.edgeEdge": "16",
  "elk.spacing.edgeNode": "24",
  "elk.portConstraints": "FIXED_ORDER",
  "elk.portAlignment.default": "CENTER",
  "elk.edgeRouting": "ORTHOGONAL",
  "elk.layered.unnecessaryBendpoints": "false",
};

export async function computeLayout(
  nodes: { id: string; width: number; height: number }[],
  edges: { id: string; source: string; target: string }[]
): Promise<{ id: string; x: number; y: number }[]> {
  const graph: ElkNode = {
    id: "root",
    layoutOptions: deterministicOptions,
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
