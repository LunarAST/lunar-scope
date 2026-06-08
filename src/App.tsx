import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  type Node,
  type Edge,
  MarkerType,
  type NodeChange,
  type EdgeChange,
  applyNodeChanges,
  applyEdgeChanges,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { LunarMap, AggregatedEdge } from "./types";

const STATUS_STYLE: Record<string, { stroke: string }> = {
  Aligned:            { stroke: "#10B981" },
  ParamNameMismatch:  { stroke: "#3B82F6" },
  Orphaned:           { stroke: "#F59E0B" },
  MethodMismatch:     { stroke: "#EF4444" },
  Unverified:         { stroke: "#6B7280" },
};

const METHOD_COLORS: Record<string, string> = {
  GET: "#10B981", POST: "#3B82F6", PUT: "#F59E0B", DELETE: "#EF4444", PATCH: "#8B5CF6",
};

function App() {
  const [data, setData] = useState<LunarMap | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<AggregatedEdge | null>(null);
  const edgeMapRef = useRef<Map<string, AggregatedEdge>>(new Map());

  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);

  // hover state
  const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/lunar-map.json")
      .then((res) => res.json())
      .then((json) => {
        const d = json as LunarMap;
        setData(d);
        const newNodes: Node[] = d.projects.map((p, i) => ({
          id: p.name,
          type: "default",
          data: { label: p.name },
          position: { x: 80 + i * 260, y: 200 },
          style: {
            background: "#1f1f22", color: "#fff", border: "1px solid #10B981",
            borderRadius: 8, width: 180,
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
        setNodes(newNodes);
        setEdges(newEdges);
      })
      .catch(() => {
        const payload = (window as unknown as Record<string, unknown>).lunarMapPayload;
        if (payload) setData(payload as LunarMap);
      });
  }, []);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => setNodes((nds) => applyNodeChanges(changes, nds)), []
  );
  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => setEdges((eds) => applyEdgeChanges(changes, eds)), []
  );

  const onEdgeClick = useCallback((_event: React.MouseEvent, edge: Edge) => {
    const agg = edgeMapRef.current.get(edge.id);
    setSelectedEdge(agg ?? null);
  }, []);

  const onPaneClick = useCallback(() => setSelectedEdge(null), []);

  const activeAlignments = useMemo(() => {
    if (!selectedEdge || !data) return [];
    return data.alignments.filter(
      (a) => a.clientProject === selectedEdge.clientProject &&
           a.serverProject === selectedEdge.serverProject
    );
  }, [selectedEdge, data]);

  // 增强节点标签
  const enhancedNodes = useMemo(() => {
    if (!data) return nodes;
    return nodes.map((n) => {
      const p = data.projects.find((p) => p.name === n.id);
      if (!p) return n;
      return {
        ...n,
        data: {
          label: (
            <div style={{ padding: 4 }}>
              <strong>{p.name}</strong>
              <div style={{ fontSize: 10, color: "#9ca3af" }}>
                E:{p.interfaces.exposed.length} / C:{p.interfaces.consumed.length}
              </div>
            </div>
          ),
        },
      };
    });
  }, [nodes, data]);

  // 聚焦变暗 + hover 高亮
  const styledNodes = useMemo(() => {
    return enhancedNodes.map((n) => {
      const isFocused = !selectedEdge ||
        n.id === selectedEdge?.clientProject ||
        n.id === selectedEdge?.serverProject;
      const isHovered = n.id === hoveredNodeId;
      return {
        ...n,
        style: {
          ...n.style,
          opacity: isFocused ? 1 : 0.15,
          border: isHovered
            ? "1px solid #fff"
            : n.style?.border ?? "1px solid #10B981",
          boxShadow: isHovered
            ? "0 0 12px rgba(255,255,255,0.25)"
            : undefined,
          transition: "opacity 0.2s, border-color 0.2s, box-shadow 0.2s",
        },
      };
    });
  }, [enhancedNodes, selectedEdge, hoveredNodeId]);

  const styledEdges = useMemo(() => {
    return edges.map((e) => {
      const isFocused = !selectedEdge ||
        e.id.startsWith(`${selectedEdge.clientProject}->${selectedEdge.serverProject}-`);
      const isHovered = e.id === hoveredEdgeId;
      const style = STATUS_STYLE[
        edgeMapRef.current.get(e.id)?.status ?? "Aligned"
      ] ?? STATUS_STYLE.Aligned;
      return {
        ...e,
        style: {
          ...e.style,
          opacity: isFocused ? 1 : 0.12,
          strokeWidth: isHovered || isFocused ? 3 : 2,
          stroke: isHovered ? "#ffffff" : style.stroke,
          transition: "opacity 0.2s, stroke-width 0.2s, stroke 0.2s",
        },
      };
    });
  }, [edges, selectedEdge, hoveredEdgeId]);

  if (!data) {
    return (
      <div style={{ background: "#0B0B0C", color: "#fff", height: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        Loading lunar-map.json...
      </div>
    );
  }

  return (
    <div style={{ width: "100vw", height: "100vh", background: "#0B0B0C" }}>
      <ReactFlow
        nodes={styledNodes}
        edges={styledEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onEdgeClick={onEdgeClick}
        onPaneClick={onPaneClick}
        onEdgeMouseEnter={(_event, edge) => setHoveredEdgeId(edge.id)}
        onEdgeMouseLeave={() => setHoveredEdgeId(null)}
        onNodeMouseEnter={(_event, node) => setHoveredNodeId(node.id)}
        onNodeMouseLeave={() => setHoveredNodeId(null)}
        fitView
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#1F1F22" gap={24} />
        <Controls />
      </ReactFlow>

      {/* 右上角固定卡片 */}
      {selectedEdge && (
        <div
          style={{
            position: "fixed",
            top: 12,
            right: 12,
            background: "#18181b",
            border: "1px solid #27272a",
            borderRadius: 8,
            padding: 14,
            color: "#e5e7eb",
            fontSize: 12,
            zIndex: 1000,
            boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
            maxWidth: 320,
            pointerEvents: "auto",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <div style={{ fontWeight: 600, fontSize: 13 }}>
              {selectedEdge.clientProject} → {selectedEdge.serverProject}
            </div>
            <button
              onClick={() => setSelectedEdge(null)}
              style={{ background: "none", border: "none", color: "#9ca3af", fontSize: 18, cursor: "pointer", lineHeight: 1 }}
            >
              ×
            </button>
          </div>
          <div style={{ color: STATUS_STYLE[selectedEdge.status]?.stroke, fontWeight: 600, marginBottom: 6 }}>
            {selectedEdge.status} · {selectedEdge.callCount} call{selectedEdge.callCount > 1 ? "s" : ""}
          </div>
          <div style={{ borderTop: "1px solid #27272a", paddingTop: 6 }}>
            {activeAlignments.slice(0, 5).map((a, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                <span style={{
                  display: "inline-block",
                  width: 8, height: 8, borderRadius: 4,
                  background: METHOD_COLORS[a.method] || "#6B7280",
                }} />
                <span style={{ color: METHOD_COLORS[a.method] || "#9ca3af", fontWeight: 600 }}>
                  {a.method}
                </span>
                <span style={{ color: "#d1d5db", fontFamily: "monospace" }}>{a.path}</span>
              </div>
            ))}
            {activeAlignments.length > 5 && (
              <div style={{ color: "#6B7280", fontSize: 11 }}>+ {activeAlignments.length - 5} more</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
