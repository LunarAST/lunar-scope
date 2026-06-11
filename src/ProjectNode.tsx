import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import { getHandleStyle } from "./portStyles";

interface PortInfo {
  method: string;
  path: string;
  status: "aligned" | "orphaned" | "unused" | "mismatch";
  targetProject?: string;
}

interface ProjectNodeData {
  name: string;
  type: string;
  path?: string; // [ADDED] Display project physical workspace path
  exposed: PortInfo[];
  consumed: PortInfo[];
  isFocused?: boolean;
  isAnomalyHighlight?: boolean;
  isHovered?: boolean;
}

const PORT_GAP = 16;

export default memo(function ProjectNode({ data }: { data: ProjectNodeData }) {
  const nodeHeight = Math.max(
    40,
    Math.max(data.exposed.length, data.consumed.length) * PORT_GAP + 20
  );

  let borderColor = `var(--lunar-node-border-${data.type})`;
  let boxShadow = "none";
  if (data.isAnomalyHighlight) {
    borderColor = "#F59E0B";
    boxShadow = "0 0 16px rgba(245, 158, 11, 0.5)";
  } else if (data.isHovered) {
    borderColor = "#ffffff";
    boxShadow = "0 0 12px rgba(255,255,255,0.25)";
  }

  return (
    <div
      title={`${data.name} (${data.type})\nPath: ${data.path || "N/A"}\nExposed: ${data.exposed.length}\nConsumed: ${data.consumed.length}`}
      style={{
        background: "var(--lunar-node-bg)",
        color: "var(--lunar-text-primary)",
        border: `1px solid ${borderColor}`,
        borderRadius: "var(--lunar-node-radius)",
        minWidth: "var(--lunar-node-min-width)",
        padding: "var(--lunar-node-padding)",
        position: "relative",
        height: nodeHeight,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 13,
        fontWeight: 600,
        cursor: "pointer",
        boxShadow,
        transition: "border-color 0.2s, box-shadow 0.2s",
      }}
    >
      <span>{data.name}</span>

      {/* Exposed ports (left) */}
      <div style={{ position: "absolute", left: -5, top: 10, display: "flex", flexDirection: "column", gap: PORT_GAP - 10 }}>
        {data.exposed.map((p, i) => (
          <Handle
            key={`exp-${i}`}
            type="target"
            position={Position.Left}
            id={`exp-${i}`}
            style={getHandleStyle(p.method, p.status)}
          />
        ))}
      </div>

      {/* Consumed ports (right) */}
      <div style={{ position: "absolute", right: -5, top: 10, display: "flex", flexDirection: "column", gap: PORT_GAP - 10 }}>
        {data.consumed.map((p, i) => (
          <Handle
            key={`con-${i}`}
            type="source"
            position={Position.Right}
            id={`con-${i}`}
            style={getHandleStyle(p.method, p.status, true)}
          />
        ))}
      </div>
    </div>
  );
});
