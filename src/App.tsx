import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import {
  ReactFlow, Background, Controls, Handle, Position,
  type Node, type Edge, MarkerType,
  type NodeChange, type EdgeChange,
  applyNodeChanges, applyEdgeChanges,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { LunarMap, AggregatedEdge, ProjectInfo, AnomalyEndpoint } from "./types";
import ProjectNode from "./ProjectNode";
import { computeLayout } from "./layout";
import { getIndicatorStyle } from "./portStyles";

const nodeTypes = { projectNode: ProjectNode };

const STATUS_STYLE: Record<string, { stroke: string }> = {
  Aligned:            { stroke: "var(--lunar-edge-aligned)" },
  ParamNameMismatch:  { stroke: "var(--lunar-edge-param-mismatch)" },
  Orphaned:           { stroke: "var(--lunar-edge-orphaned)" },
  MethodMismatch:     { stroke: "var(--lunar-edge-method-mismatch)" },
  Unverified:         { stroke: "var(--lunar-edge-unverified)" },
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

const METHOD_BG_COLORS: Record<string, string> = {
  GET: "var(--lunar-method-get-bg)", POST: "var(--lunar-method-post-bg)",
  PUT: "var(--lunar-method-put-bg)", DELETE: "var(--lunar-method-delete-bg)",
  PATCH: "var(--lunar-method-put-bg)",
};

fn determinePortStatus(method: string, path: string, project: string, isExposed: boolean, data: LunarMap) -> "aligned" | "orphaned" | "unused" | "mismatch" {
  if (isExposed) {
    const used = data.alignments.some(
      a => a.serverProject === project && a.path === path && a.method === method && a.status !== "Orphaned"
    );
    return used ? "aligned" : "unused";
  } else {
    const aligned = data.alignments.some(
      a => a.clientProject === project && a.path === path && a.method === method && a.status !== "Orphaned"
    );
    return aligned ? "aligned" : "orphaned";
  }
}

function App() {
  const [data, setData] = useState<LunarMap | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<AggregatedEdge | null>(null);
  const [selectedNode, setSelectedNode] = useState<ProjectInfo | null>(null);
  const [showAnomalies, setShowAnomalies] = useState(false);
  const [highlightAnomaly, setHighlightAnomaly] = useState<AnomalyEndpoint | null>(null);
  const edgeMapRef = useRef<Map<string, AggregatedEdge>>(new Map());
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetch("/lunar-map.json")
      .then((r) => r.json())
      .then(async (json) => {
        const d = json as LunarMap;
        setData(d);

        const rawNodes: Node[] = d.projects.map((p) => {
          const nodeHeight = Math.max(40, Math.max(p.interfaces.exposed.length, p.interfaces.consumed.length) * 14 + 20);
          return {
            id: p.name,
            type: "projectNode",
            data: {
              name: p.name,
              type: p.type,
              path: p.path, // [ADDED] Map absolute workspace path natively to canvas nodes
              exposed: p.interfaces.exposed.map(e => ({ ...e, status: determinePortStatus(e.method, e.path, p.name, true, d) })),
              consumed: p.interfaces.consumed.map(e => ({ ...e, status: determinePortStatus(e.method, e.path, p.name, false, d) })),
              isFocused: true,
              isAnomalyHighlight: false,
              isHovered: false,
            },
            position: { x: 0, y: 0 },
            style: { height: nodeHeight, width: 160 },
          };
        });

        const map = new Map<string, AggregatedEdge>();
        const rawEdges: Edge[] = [];

        d.aggregatedEdges.forEach((e, i) => {
          const baseId = `${e.clientProject}->${e.serverProject}-${i}`;
          map.set(baseId, e);

          if (e.ports && e.ports.length > 0) {
            const baseStyle = STATUS_STYLE[e.status] ?? STATUS_STYLE.Aligned;
            rawEdges.push({
              id: `${baseId}-guide`,
              source: e.clientProject, target: e.serverProject,
              animated: true,
              style: { stroke: baseStyle.stroke, strokeWidth: 1.5, opacity: 0.2 },
              selectable: false, focusable: false,
            });

            e.ports.forEach((port) => {
              const portStyle = STATUS_STYLE[port.status] ?? STATUS_STYLE.Aligned;
              rawEdges.push({
                id: `${baseId}-port-${port.sourcePortIndex}-${port.targetPortIndex}`,
                source: e.clientProject, sourceHandle: `con-${port.sourcePortIndex}`,
                target: e.serverProject, targetHandle: `exp-${port.targetPortIndex}`,
                style: { stroke: portStyle.stroke, strokeWidth: 1.5 },
                markerEnd: { type: MarkerType.ArrowClosed, color: portStyle.stroke, width: 14, height: 14 },
              });
            });
          } else {
            const baseStyle = STATUS_STYLE[e.status] ?? STATUS_STYLE.Aligned;
            rawEdges.push({
              id: baseId, source: e.clientProject, target: e.serverProject,
              style: { stroke: baseStyle.stroke, strokeWidth: 1.5 },
              markerEnd: { type: MarkerType.ArrowClosed, color: baseStyle.stroke, width: 14, height: 14 },
            });
          }
        });

        edgeMapRef.current = map;

        try {
          const positions = await computeLayout(
            rawNodes.map(n => ({ id: n.id, width: 160, height: (n.style as any)?.height || 60 })),
            rawEdges.filter(e => !e.id.endsWith('-guide')).map(e => ({ id: e.id, source: e.source, target: e.target }))
          );
          if (positions.length > 0) {
            for (const n of rawNodes) {
              const pos = positions.find(p => p.id === n.id);
              if (pos) n.position = { x: pos.x, y: pos.y };
            }
          }
        } catch {
          rawNodes.forEach((n, i) => { n.position = { x: 80 + i * 300, y: 100 }; });
        }

        setNodes(rawNodes);
        setEdges(rawEdges);
      });
  }, []);

  const onNodesChange = useCallback((c: NodeChange[]) => setNodes((n) => applyNodeChanges(c, n)), []);
  const onEdgesChange = useCallback((c: EdgeChange[]) => setEdges((e) => applyEdgeChanges(c, e)), []);

  const onEdgeClick = useCallback((_: React.MouseEvent, e: Edge) => {
    const baseId = e.id.replace(/-guide$/, '').replace(/-port-\d+-\d+$/, '');
    const agg = edgeMapRef.current.get(baseId);
    setSelectedEdge(agg ?? null);
    setSelectedNode(null);
  }, []);

  const onNodeClick = useCallback((_: React.MouseEvent, n: Node) => {
    if (!data) return;
    const p = data.projects.find(p => p.name === n.id);
    setSelectedNode(p ?? null);
    setSelectedEdge(null);
  }, [data]);

  const onPaneClick = useCallback(() => { setSelectedEdge(null); setSelectedNode(null); setHighlightAnomaly(null); }, []);

  const activeAlignments = useMemo(() => {
    if (!selectedEdge || !data) return [];
    return data.alignments.filter(a => a.clientProject === selectedEdge.clientProject && a.serverProject === selectedEdge.serverProject);
  }, [selectedEdge, data]);

  // Parse search query for special prefixes
  const searchFilter = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (q.startsWith("status:")) {
      const status = q.slice(7).trim();
      return { type: "status" as const, value: status };
    }
    if (q.startsWith("method:")) {
      const method = q.slice(7).trim().toUpperCase();
      return { type: "method" as const, value: method };
    }
    return { type: "text" as const, value: q };
  }, [searchQuery]);

  // Filter nodes and edges based on search
  const styledNodes = useMemo(() => {
    const hasSearch = searchQuery.trim().length > 0;
    return nodes.map((n) => {
      let match = !hasSearch;
      if (hasSearch) {
        const project = data?.projects.find(p => p.name === n.id);
        if (project) {
          const allPaths: string[] = [
            ...project.interfaces.exposed.map(e => e.path),
            ...project.interfaces.consumed.map(e => e.path),
          ];
          const nameMatch = n.id.toLowerCase().includes(searchFilter.value);
          const pathMatch = allPaths.some(p => p.toLowerCase().includes(searchFilter.value));
          const statusMatch = searchFilter.type === "status" &&
            (project.interfaces.exposed.some(e => determinePortStatus(e.method, e.path, project.name, true, data!) === searchFilter.value) ||
             project.interfaces.consumed.some(e => determinePortStatus(e.method, e.path, project.name, false, data!) === searchFilter.value));
          match = nameMatch || pathMatch || (searchFilter.type === "status" && statusMatch);
        }
      }
      const isFocused = !selectedEdge || n.id === selectedEdge?.clientProject || n.id === selectedEdge?.serverProject;
      const isAnomalyHighlight = highlightAnomaly && n.id === highlightAnomaly.project;
      const isHovered = n.id === hoveredNodeId;
      return {
        ...n,
        data: { ...n.data, isFocused, isAnomalyHighlight: !!isAnomalyHighlight, isHovered },
        style: {
          ...n.style,
          opacity: hasSearch && !match ? 0.15 : (isFocused || isAnomalyHighlight) ? 1 : "var(--lunar-spotlight-dim)",
          transition: "opacity 0.2s",
        },
      };
    });
  }, [nodes, selectedEdge, hoveredNodeId, highlightAnomaly, searchQuery, searchFilter, data]);

  const styledEdges = useMemo(() => {
    const hasSearch = searchQuery.trim().length > 0;
    return edges.map((e) => {
      const isGuideLine = e.id.endsWith("-guide");
      const baseId = e.id.replace(/-guide$/, '').replace(/-port-\d+-\d+$/, '');
      const isSelected = selectedEdge && baseId.startsWith(`${selectedEdge.clientProject}->${selectedEdge.serverProject}-`);
      const isHovered = e.id === hoveredEdgeId;

      let match = !hasSearch;
      if (hasSearch) {
        const edge = edgeMapRef.current.get(baseId);
        if (edge) {
          const nameMatch = `${edge.clientProject}->${edge.serverProject}`.toLowerCase().includes(searchFilter.value);
          const pathMatch = edge.paths.some(p => p.toLowerCase().includes(searchFilter.value));
          const statusMatch = searchFilter.type === "status" && edge.status.toLowerCase() === searchFilter.value;
          match = nameMatch || pathMatch || statusMatch;
        }
      }

      if (isGuideLine) {
        return {
          ...e,
          style: {
            ...e.style,
            opacity: hasSearch && !match ? 0.05 : (isSelected ? 0.4 : 0.15),
            transition: "opacity 0.2s",
          },
        };
      }

      return {
        ...e,
        animated: !!isSelected,
        style: {
          ...e.style,
          opacity: hasSearch && !match ? 0.08 : (!selectedEdge || isSelected) ? 1 : 0.12,
          strokeWidth: isHovered || isSelected ? 2 : 1.5,
          stroke: isHovered ? "#ffffff" : (e.style as any)?.stroke,
          transition: "all 0.2s",
        },
      };
    });
  }, [edges, selectedEdge, hoveredEdgeId, searchQuery, searchFilter]);

  const totalAnomalies = data
    ? data.anomalies.unusedEndpoints.length + data.anomalies.orphanedConsumers.length
    : 0;

  if (!data) return (
    <div style={{ background: "var(--lunar-theme-bg)", color: "var(--lunar-text-primary)", height: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      Loading lunar-map.json...
    </div>
  );

  return (
    <div style={{ width: "100vw", height: "100vh", background: "var(--lunar-theme-bg)" }}>
      {/* Search bar */}
      <div style={{
        position: "fixed", top: 12, left: "50%", transform: "translateX(-50%)", zIndex: 1000,
        background: "var(--lunar-card-bg)", border: "1px solid var(--lunar-card-border)",
        borderRadius: 8, padding: "8px 14px", display: "flex", alignItems: "center", gap: 8,
        boxShadow: "0 2px 12px rgba(0,0,0,0.4)", minWidth: 320,
      }}>
        <span style={{ color: "var(--lunar-text-secondary)", fontSize: 14 }}>🔍</span>
        <input
          type="text"
          placeholder="Search projects, paths, or status:orphaned..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            background: "transparent", border: "none", color: "var(--lunar-text-primary)",
            fontSize: 13, outline: "none", flex: 1,
          }}
          onKeyDown={(e) => { if (e.key === "Escape") setSearchQuery(""); }}
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            style={{ background: "none", border: "none", color: "var(--lunar-text-secondary)", cursor: "pointer", fontSize: 16 }}
          >
            ×
          </button>
        )}
      </div>

      <ReactFlow
        nodes={styledNodes} edges={styledEdges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
        onEdgeClick={onEdgeClick} onNodeClick={onNodeClick} onPaneClick={onPaneClick}
        onEdgeMouseEnter={(_, e) => setHoveredEdgeId(e.id)} onEdgeMouseLeave={() => setHoveredEdgeId(null)}
        onNodeMouseEnter={(_, n) => setHoveredNodeId(n.id)} onNodeMouseLeave={() => setHoveredNodeId(null)}
        fitView proOptions={{ hideAttribution: true }}
      >
        <Background color="var(--lunar-theme-grid)" gap={24} />
        <Controls />
      </ReactFlow>

      {/* Anomalies toggle button */}
      <button onClick={() => setShowAnomalies(!showAnomalies)} style={{
        position: "fixed", left: showAnomalies ? 328 : 12, top: 12, zIndex: 910,
        background: "var(--lunar-card-bg)", border: "1px solid var(--lunar-card-border)",
        borderRadius: 6, color: totalAnomalies > 0 ? "#F59E0B" : "var(--lunar-text-secondary)",
        padding: "8px 12px", cursor: "pointer", fontSize: 13,
        display: "flex", alignItems: "center", gap: 6,
        boxShadow: "0 2px 8px rgba(0,0,0,0.3)", transition: "left 0.25s ease-in-out",
      }}>
        <span>🔍</span>
        {totalAnomalies > 0 && <span style={{ fontWeight: 700, color: "#F59E0B" }}>{totalAnomalies}</span>}
      </button>

      {/* Anomalies panel */}
      <div style={{
        position: "fixed", left: showAnomalies ? 0 : -320, top: 0, width: 320, height: "100vh",
        background: "var(--lunar-card-bg)", borderRight: "1px solid var(--lunar-card-border)",
        color: "var(--lunar-text-primary)", zIndex: 900,
        boxShadow: showAnomalies ? "4px 0 24px rgba(0,0,0,0.6)" : "none",
        transition: "left 0.25s ease-in-out", display: "flex", flexDirection: "column",
      }}>
        <div style={{ padding: "20px 16px", borderBottom: "1px solid var(--lunar-card-border)" }}>
          <h3 style={{ margin: 0, fontSize: 15, display: "flex", alignItems: "center", gap: 8 }}>
            <span>🔍</span> Ecosystem Anomalies
            {totalAnomalies > 0 && (
              <span style={{ background: "#F59E0B", color: "#000", fontSize: 11, borderRadius: 10, padding: "2px 8px", fontWeight: 600 }}>
                {totalAnomalies}
              </span>
            )}
          </h3>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>
          {data.anomalies.unusedEndpoints.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, textTransform: "uppercase", color: "var(--lunar-text-muted)", marginBottom: 12, letterSpacing: "0.05em" }}>
                Unused Endpoints
              </div>
              {data.anomalies.unusedEndpoints.map((ep, i) => (
                <div key={i} onClick={() => { setHighlightAnomaly(ep); setSelectedEdge(null); setSelectedNode(null); }}
                  style={{ padding: "10px 10px", marginBottom: 4, background: highlightAnomaly === ep ? "#27272a" : "transparent", borderRadius: 4, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, fontSize: 12, lineHeight: "18px", border: highlightAnomaly === ep ? "1px solid var(--lunar-text-secondary)" : "1px solid transparent", transition: "background 0.15s" }}>
                  <span style={getIndicatorStyle(ep.method, "unused")} />
                  <span style={{ color: "var(--lunar-text-muted)", fontWeight: "bold", width: 36, flexShrink: 0 }}>{ep.method}</span>
                  <span style={{ color: "var(--lunar-text-primary)", fontFamily: "monospace", wordBreak: "break-all" }}>{ep.path}</span>
                  <span style={{ marginLeft: "auto", color: "var(--lunar-text-muted)", fontSize: 10, flexShrink: 0 }}>{ep.project}</span>
                </div>
              ))}
            </div>
          )}
          {data.anomalies.orphanedConsumers.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, textTransform: "uppercase", color: "#F59E0B", marginBottom: 12, letterSpacing: "0.05em" }}>
                Orphaned Consumers
              </div>
              {data.anomalies.orphanedConsumers.map((ep, i) => (
                <div key={i} onClick={() => { setHighlightAnomaly(ep); setSelectedEdge(null); setSelectedNode(null); }}
                  style={{ padding: "10px 10px", marginBottom: 4, background: highlightAnomaly === ep ? "#27272a" : "transparent", borderRadius: 4, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, fontSize: 12, lineHeight: "18px", border: highlightAnomaly === ep ? "1px solid #F59E0B55" : "1px solid transparent", transition: "background 0.15s" }}>
                  <span style={getIndicatorStyle(ep.method, "orphaned")} />
                  <span style={{ color: "#F59E0B", fontWeight: "bold", width: 36, flexShrink: 0 }}>{ep.method}</span>
                  <span style={{ color: "var(--lunar-text-primary)", fontFamily: "monospace", wordBreak: "break-all" }}>{ep.path}</span>
                  <span style={{ marginLeft: "auto", color: "#F59E0B", fontSize: 10, flexShrink: 0 }}>{ep.project}</span>
                </div>
              ))}
            </div>
          )}
          {totalAnomalies === 0 && (
            <div style={{ color: "var(--lunar-text-secondary)", fontSize: 13, textAlign: "center", marginTop: 40 }}>
              ✓ No anomalies detected
            </div>
          )}
        </div>
      </div>

      {/* Edge info card */}
      {selectedEdge && !selectedNode && (
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
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4, padding: "4px 0" }}>
                  <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 4, background: METHOD_COLORS[a.method] || "#6B7280", flexShrink: 0 }} />
                  <span style={{ color: METHOD_COLORS[a.method] || "var(--lunar-text-secondary)", fontWeight: 600, flexShrink: 0 }}>{a.method}</span>
                  <span style={{ color: "var(--lunar-text-primary)", fontFamily: "monospace", wordBreak: "break-all" }}>{a.path}</span>
                </div>
              );
            })}
            {activeAlignments.length > 5 && <div style={{ color: "var(--lunar-text-muted)", fontSize: 11 }}>+ {activeAlignments.length - 5} more</div>}
          </div>
        </div>
      )}

      {/* Node info card */}
      {selectedNode && (
        <div style={{ position: "fixed", top: 12, right: 12, background: "var(--lunar-card-bg)", border: "1px solid var(--lunar-card-border)", borderRadius: 8, padding: 14, color: "var(--lunar-text-primary)", fontSize: 12, zIndex: 1000, boxShadow: "0 4px 16px rgba(0,0,0,0.5)", maxWidth: 360 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <div style={{ fontWeight: 600, fontSize: 13 }}>
              {selectedNode.name} <span style={{ color: "var(--lunar-text-secondary)", fontWeight: 400 }}>({selectedNode.type})</span>
              {selectedNode.path && (
                <div style={{ fontSize: 11, color: "var(--lunar-text-muted)", marginTop: 4, fontFamily: "monospace" }}>
                  Path: {selectedNode.path}
                </div>
              )}
            </div>
            <button onClick={() => setSelectedNode(null)} style={{ background: "none", border: "none", color: "var(--lunar-text-secondary)", fontSize: 18, cursor: "pointer", lineHeight: 1 }}>×</button>
          </div>
          <div style={{ marginBottom: 10 }}>
            <div style={{ color: "var(--lunar-method-get-text)", fontWeight: 600, marginBottom: 4 }}>Exposed ({selectedNode.interfaces.exposed.length})</div>
            {selectedNode.interfaces.exposed.map((e, i) => {
              const status = data ? determinePortStatus(e.method, e.path, selectedNode.name, true, data) : "aligned";
              return (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4, padding: "3px 0 3px 8px" }}>
                  <span style={getIndicatorStyle(e.method, status)} />
                  <span style={{ color: METHOD_COLORS[e.method] || "var(--lunar-text-secondary)", fontWeight: 600, flexShrink: 0 }}>{e.method}</span>
                  <span style={{ color: "var(--lunar-text-primary)", fontFamily: "monospace", wordBreak: "break-all" }}>{e.path}</span>
                  {status === "unused" && <span style={{ color: "var(--lunar-text-muted)", fontSize: 10, flexShrink: 0 }}>(unused)</span>}
                </div>
              );
            })}
          </div>
          <div>
            <div style={{ color: "var(--lunar-method-post-text)", fontWeight: 600, marginBottom: 4 }}>Consumed ({selectedNode.interfaces.consumed.length})</div>
            {selectedNode.interfaces.consumed.map((e, i) => {
              const status = data ? determinePortStatus(e.method, e.path, selectedNode.name, false, data) : "aligned";
              return (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4, padding: "3px 0 3px 8px" }}>
                  <span style={getIndicatorStyle(e.method, status)} />
                  <span style={{ color: METHOD_COLORS[e.method] || "var(--lunar-text-secondary)", fontWeight: 600, flexShrink: 0 }}>{e.method}</span>
                  <span style={{ color: "var(--lunar-text-primary)", fontFamily: "monospace", wordBreak: "break-all" }}>{e.path}</span>
                  {e.targetProject && <span style={{ color: "var(--lunar-text-muted)", fontSize: 10, flexShrink: 0 }}>→ {e.targetProject}</span>}
                  {status === "orphaned" && <span style={{ color: "#F59E0B", fontSize: 10, flexShrink: 0 }}>(orphaned)</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
