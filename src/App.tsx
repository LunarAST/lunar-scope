import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import {
  ReactFlow, Background, Controls,
  type Node, type Edge, MarkerType,
  type NodeChange, type EdgeChange,
  applyNodeChanges, applyEdgeChanges,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { LunarMap, AggregatedEdge, ProjectInfo } from "./types";

const STATUS_STYLE: Record<string, { stroke: string; dashed: boolean; animated: boolean }> = {
  Aligned:            { stroke: "var(--lunar-edge-aligned)", dashed: false, animated: false },
  ParamNameMismatch:  { stroke: "var(--lunar-edge-param-mismatch)", dashed: true,  animated: false },
  Orphaned:           { stroke: "var(--lunar-edge-orphaned)", dashed: true,  animated: true },
  MethodMismatch:     { stroke: "var(--lunar-edge-method-mismatch)", dashed: false, animated: true },
  Unverified:         { stroke: "var(--lunar-edge-unverified)", dashed: true,  animated: false },
};

const METHOD_BADGE: Record<string, { bg: string; text: string; border: string }> = {
  GET:    { bg: "var(--lunar-method-get-bg)", text: "var(--lunar-method-get-text)", border: "var(--lunar-method-get-border)" },
  POST:   { bg: "var(--lunar-method-post-bg)", text: "var(--lunar-method-post-text)", border: "var(--lunar-method-post-border)" },
  PUT:    { bg: "var(--lunar-method-put-bg)", text: "var(--lunar-method-put-text)", border: "var(--lunar-method-put-border)" },
  PATCH:  { bg: "var(--lunar-method-put-bg)", text: "var(--lunar-method-put-text)", border: "var(--lunar-method-put-border)" },
  DELETE: { bg: "var(--lunar-method-delete-bg)", text: "var(--lunar-method-delete-text)", border: "var(--lunar-method-delete-border)" },
};

const METHOD_COLORS: Record<string, string> = {
  GET: "var(--lunar-method-get-text)", POST: "var(--lunar-method-post-text)",
  PUT: "var(--lunar-method-put-text)", DELETE: "var(--lunar-method-delete-text)",
  PATCH: "var(--lunar-method-put-text)",
};

function App() {
  const [data, setData] = useState<LunarMap | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<AggregatedEdge | null>(null);
  const [selectedNode, setSelectedNode] = useState<ProjectInfo | null>(null);
  const edgeMapRef = useRef<Map<string, AggregatedEdge>>(new Map());
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/lunar-map.json")
      .then((r) => r.json())
      .then((json) => {
        const d = json as LunarMap;
        setData(d);
        const newNodes: Node[] = d.projects.map((p, i) => ({
          id: p.name, type: "default",
          data: {
            label: (
              <div
                title={`${p.name}\nExposed: ${p.interfaces.exposed.length} · Consumed: ${p.interfaces.consumed.length}`}
                style={{ padding: "var(--lunar-node-padding)", cursor: "pointer" }}
              >
                <strong>{p.name}</strong>
                <div style={{ fontSize: 10, color: "var(--lunar-text-secondary)", marginTop: 2 }}>
                  {p.interfaces.exposed.map((e, j) => (
                    <span key={j} style={{
                      display: "inline-block", width: 6, height: 6, borderRadius: 3,
                      background: METHOD_COLORS[e.method] || "#6B7280", marginRight: 2,
                    }} />
                  ))}
                  <span style={{ margin: "0 3px" }}>|</span>
                  {p.interfaces.consumed.map((e, j) => (
                    <span key={j} style={{
                      display: "inline-block", width: 6, height: 6, borderRadius: 3,
                      background: METHOD_COLORS[e.method] || "#6B7280", marginRight: 2,
                    }} />
                  ))}
                </div>
              </div>
            ),
          },
          position: { x: 80 + i * 260, y: 200 },
          style: {
            background: "var(--lunar-node-bg)", color: "var(--lunar-text-primary)",
            border: `1px solid var(--lunar-node-border-${p.type})`,
            borderRadius: "var(--lunar-node-radius)", minWidth: "var(--lunar-node-min-width)",
          },
        }));
        const map = new Map<string, AggregatedEdge>();
        const newEdges: Edge[] = d.aggregatedEdges.map((e, i) => {
          const edgeId = `${e.clientProject}->${e.serverProject}-${i}`;
          map.set(edgeId, e);
          const style = STATUS_STYLE[e.status] ?? STATUS_STYLE.Aligned;
          return {
            id: edgeId, source: e.clientProject, target: e.serverProject,
            label: `${e.callCount} call${e.callCount > 1 ? "s" : ""}`,
            style: { stroke: style.stroke, strokeWidth: 2 },
            markerEnd: { type: MarkerType.ArrowClosed, color: style.stroke },
          };
        });
        edgeMapRef.current = map;
        setNodes(newNodes); setEdges(newEdges);
      });
  }, []);

  const onNodesChange = useCallback((c: NodeChange[]) => setNodes((n) => applyNodeChanges(c, n)), []);
  const onEdgesChange = useCallback((c: EdgeChange[]) => setEdges((e) => applyEdgeChanges(c, e)), []);
  const onEdgeClick = useCallback((_: React.MouseEvent, e: Edge) => {
    setSelectedEdge(edgeMapRef.current.get(e.id) ?? null);
    setSelectedNode(null);
  }, []);
  const onNodeClick = useCallback((_: React.MouseEvent, n: Node) => {
    if (!data) return;
    const p = data.projects.find(p => p.name === n.id);
    setSelectedNode(p ?? null);
    setSelectedEdge(null);
  }, [data]);
  const onPaneClick = useCallback(() => { setSelectedEdge(null); setSelectedNode(null); }, []);

  const activeAlignments = useMemo(() => {
    if (!selectedEdge || !data) return [];
    return data.alignments.filter(a => a.clientProject === selectedEdge.clientProject && a.serverProject === selectedEdge.serverProject);
  }, [selectedEdge, data]);

  const styledNodes = useMemo(() => nodes.map((n) => {
    const isFocused = !selectedEdge || n.id === selectedEdge?.clientProject || n.id === selectedEdge?.serverProject;
    const isHovered = n.id === hoveredNodeId;
    return { ...n, style: { ...n.style, opacity: isFocused ? 1 : "var(--lunar-spotlight-dim)", border: isHovered ? "1px solid #fff" : n.style?.border, boxShadow: isHovered ? "0 0 12px rgba(255,255,255,0.25)" : undefined, transition: "opacity 0.2s, border-color 0.2s, box-shadow 0.2s" } };
  }), [nodes, selectedEdge, hoveredNodeId]);

  const styledEdges = useMemo(() => edges.map((e) => {
    const isFocused = !selectedEdge || e.id.startsWith(`${selectedEdge.clientProject}->${selectedEdge.serverProject}-`);
    const isHovered = e.id === hoveredEdgeId;
    const style = STATUS_STYLE[edgeMapRef.current.get(e.id)?.status ?? "Aligned"] ?? STATUS_STYLE.Aligned;
    return { ...e, style: { ...e.style, opacity: isFocused ? 1 : 0.12, strokeWidth: isHovered || isFocused ? 3 : 2, stroke: isHovered ? "#ffffff" : style.stroke, transition: "opacity 0.2s, stroke-width 0.2s, stroke 0.2s" } };
  }), [edges, selectedEdge, hoveredEdgeId]);

  if (!data) return (<div style={{ background: "var(--lunar-theme-bg)", color: "var(--lunar-text-primary)", height: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>Loading lunar-map.json...</div>);

  return (
    <div style={{ width: "100vw", height: "100vh", background: "var(--lunar-theme-bg)" }}>
      <ReactFlow
        nodes={styledNodes} edges={styledEdges}
        onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
        onEdgeClick={onEdgeClick} onNodeClick={onNodeClick} onPaneClick={onPaneClick}
        onEdgeMouseEnter={(_, e) => setHoveredEdgeId(e.id)} onEdgeMouseLeave={() => setHoveredEdgeId(null)}
        onNodeMouseEnter={(_, n) => setHoveredNodeId(n.id)} onNodeMouseLeave={() => setHoveredNodeId(null)}
        fitView proOptions={{ hideAttribution: true }}
      >
        <Background color="var(--lunar-theme-grid)" gap={24} />
        <Controls />
      </ReactFlow>

      {/* 边线信息卡片 */}
      {selectedEdge && (
        <div style={{ position: "fixed", top: 12, right: 12, background: "var(--lunar-card-bg)", border: "1px solid var(--lunar-card-border)", borderRadius: 8, padding: 14, color: "var(--lunar-text-primary)", fontSize: 12, zIndex: 1000, boxShadow: "0 4px 16px rgba(0,0,0,0.5)", maxWidth: 320 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <div style={{ fontWeight: 600, fontSize: 13 }}>{selectedEdge.clientProject} → {selectedEdge.serverProject}</div>
            <button onClick={() => setSelectedEdge(null)} style={{ background: "none", border: "none", color: "var(--lunar-text-secondary)", fontSize: 18, cursor: "pointer", lineHeight: 1 }}>×</button>
          </div>
          <div style={{ color: STATUS_STYLE[selectedEdge.status]?.stroke, fontWeight: 600, marginBottom: 6 }}>{selectedEdge.status} · {selectedEdge.callCount} call{selectedEdge.callCount > 1 ? "s" : ""}</div>
          <div style={{ borderTop: "1px solid var(--lunar-card-border)", paddingTop: 6 }}>
            {activeAlignments.slice(0, 5).map((a, i) => {
              const mStyle = METHOD_BADGE[a.method] ?? { bg: "#27272a", text: "#e5e7eb", border: "#3f3f46" };
              return (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                  <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 4, background: METHOD_COLORS[a.method] || "#6B7280" }} />
                  <span style={{ color: METHOD_COLORS[a.method] || "var(--lunar-text-secondary)", fontWeight: 600 }}>{a.method}</span>
                  <span style={{ color: "var(--lunar-text-primary)", fontFamily: "monospace" }}>{a.path}</span>
                </div>
              );
            })}
            {activeAlignments.length > 5 && <div style={{ color: "var(--lunar-text-muted)", fontSize: 11 }}>+ {activeAlignments.length - 5} more</div>}
          </div>
        </div>
      )}

      {/* 节点信息卡片 */}
      {selectedNode && (
        <div style={{ position: "fixed", top: 12, right: 12, background: "var(--lunar-card-bg)", border: "1px solid var(--lunar-card-border)", borderRadius: 8, padding: 14, color: "var(--lunar-text-primary)", fontSize: 12, zIndex: 1000, boxShadow: "0 4px 16px rgba(0,0,0,0.5)", maxWidth: 360 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <div style={{ fontWeight: 600, fontSize: 13 }}>{selectedNode.name} <span style={{ color: "var(--lunar-text-secondary)", fontWeight: 400 }}>({selectedNode.type})</span></div>
            <button onClick={() => setSelectedNode(null)} style={{ background: "none", border: "none", color: "var(--lunar-text-secondary)", fontSize: 18, cursor: "pointer", lineHeight: 1 }}>×</button>
          </div>

          <div style={{ marginBottom: 10 }}>
            <div style={{ color: "var(--lunar-method-get-text)", fontWeight: 600, marginBottom: 4 }}>Exposed ({selectedNode.interfaces.exposed.length})</div>
            {selectedNode.interfaces.exposed.map((e, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2, paddingLeft: 8 }}>
                <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 4, background: METHOD_COLORS[e.method] || "#6B7280" }} />
                <span style={{ color: METHOD_COLORS[e.method] || "var(--lunar-text-secondary)", fontWeight: 600 }}>{e.method}</span>
                <span style={{ color: "var(--lunar-text-primary)", fontFamily: "monospace" }}>{e.path}</span>
              </div>
            ))}
          </div>

          <div>
            <div style={{ color: "var(--lunar-method-post-text)", fontWeight: 600, marginBottom: 4 }}>Consumed ({selectedNode.interfaces.consumed.length})</div>
            {selectedNode.interfaces.consumed.map((e, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2, paddingLeft: 8 }}>
                <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 4, background: METHOD_COLORS[e.method] || "#6B7280" }} />
                <span style={{ color: METHOD_COLORS[e.method] || "var(--lunar-text-secondary)", fontWeight: 600 }}>{e.method}</span>
                <span style={{ color: "var(--lunar-text-primary)", fontFamily: "monospace" }}>{e.path}</span>
                {e.targetProject && <span style={{ color: "var(--lunar-text-muted)", fontSize: 10 }}>→ {e.targetProject}</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
