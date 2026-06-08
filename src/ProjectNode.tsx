import { memo } from "react";
import { Handle, Position } from "@xyflow/react";

interface PortInfo {
  method: string;
  path: string;
  status: "aligned" | "orphaned" | "unused" | "mismatch";
  targetProject?: string;
}

interface ProjectNodeData {
  name: string;
  type: string;
  exposed: PortInfo[];
  consumed: PortInfo[];
  isFocused?: boolean;
  isAnomalyHighlight?: boolean;
  isHovered?: boolean;
}

const METHOD_VAR: Record<string, string> = {
  GET: "var(--lunar-method-get-text)",
  POST: "var(--lunar-method-post-text)",
  PUT: "var(--lunar-method-put-text)",
  DELETE: "var(--lunar-method-delete-text)",
  PATCH: "var(--lunar-method-put-text)",
};

// 方法对应的半透明填充色（用于空心端口）
const METHOD_BG_VAR: Record<string, string> = {
  GET: "var(--lunar-method-get-bg)",
  POST: "var(--lunar-method-post-bg)",
  PUT: "var(--lunar-method-put-bg)",
  DELETE: "var(--lunar-method-delete-bg)",
  PATCH: "var(--lunar-method-put-bg)",
};

const PORT_SIZE = 8;
const PORT_GAP = 14;

export default memo(function ProjectNode({ data }: { data: ProjectNodeData }) {
  const nodeHeight = Math.max(
    40,
    Math.max(data.exposed.length, data.consumed.length) * PORT_GAP + 20
  );

  const tooltip = [
    `${data.name} (${data.type})`,
    `Exposed: ${data.exposed.length}`,
    ...data.exposed.map(p => `  ${p.method} ${p.path} [${p.status}]`),
    `Consumed: ${data.consumed.length}`,
    ...data.consumed.map(p => `  ${p.method} ${p.path} → ${p.targetProject || "?"} [${p.status}]`),
  ].join("\n");

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
      title={tooltip}
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
      <div style={{ position: "absolute", left: -PORT_SIZE / 2, top: 10, display: "flex", flexDirection: "column", gap: PORT_GAP - PORT_SIZE }}>
        {data.exposed.map((p, i) => (
          <Handle
            key={`exp-${i}`}
            type="target"
            position={Position.Left}
            id={`exp-${i}`}
            style={{
              width: PORT_SIZE,
              height: PORT_SIZE,
              background: p.status === "unused"
                ? (METHOD_BG_VAR[p.method] || "rgba(107, 114, 128, 0.1)")
                : (METHOD_VAR[p.method] || "#6B7280"),
              border: `2px solid ${p.status === "unused" ? "var(--lunar-text-secondary)" : (METHOD_VAR[p.method] || "#6B7280")}`,
              borderRadius: "50%",
              position: "relative",
              left: 0,
              top: 0,
              transform: "none",
              pointerEvents: "none",
            }}
          />
        ))}
      </div>

      {/* Consumed ports (right) */}
      <div style={{ position: "absolute", right: -PORT_SIZE / 2, top: 10, display: "flex", flexDirection: "column", gap: PORT_GAP - PORT_SIZE }}>
        {data.consumed.map((p, i) => (
          <Handle
            key={`con-${i}`}
            type="source"
            position={Position.Right}
            id={`con-${i}`}
            style={{
              width: PORT_SIZE,
              height: PORT_SIZE,
              background: p.status === "orphaned"
                ? (METHOD_BG_VAR[p.method] || "rgba(245, 158, 11, 0.1)")
                : (METHOD_VAR[p.method] || "#6B7280"),
              border: `2px solid ${p.status === "orphaned" ? "#F59E0B" : (METHOD_VAR[p.method] || "#6B7280")}`,
              borderRadius: p.status === "orphaned" ? "30%" : "50%",
              position: "relative",
              right: 0,
              top: 0,
              transform: "none",
              pointerEvents: "none",
            }}
          />
        ))}
      </div>
    </div>
  );
});
