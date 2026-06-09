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

const METHOD_COLORS: Record<string, string> = {
  GET: "#10B981",
  POST: "#3B82F6",
  PUT: "#F59E0B",
  DELETE: "#EF4444",
  PATCH: "#8B5CF6",
};

const PORT_SIZE = 10;
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

  // 将方法颜色的十六进制转换为 rgba 用于外圈光晕
  const toRgba = (hex: string, alpha: number) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  return (
    <div
      title={`${data.name} (${data.type})\nExposed: ${data.exposed.length}\nConsumed: ${data.consumed.length}`}
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
        {data.exposed.map((p, i) => {
          const color = METHOD_COLORS[p.method] || "#6B7280";
          const isUnused = p.status === "unused";
          return (
            <Handle
              key={`exp-${i}`}
              type="target"
              position={Position.Left}
              id={`exp-${i}`}
              style={{
                width: PORT_SIZE,
                height: PORT_SIZE,
                background: isUnused ? "var(--lunar-theme-bg)" : color,
                border: `3px solid ${color}`,
                borderRadius: "50%",
                position: "relative",
                left: 0,
                top: 0,
                transform: "none",
                pointerEvents: "none",
                // 空心端口：方法色外圈光晕，强化视觉存在感
                boxShadow: isUnused ? `0 0 0 3px ${toRgba(color, 0.35)}` : "none",
              }}
            />
          );
        })}
      </div>

      {/* Consumed ports (right) */}
      <div style={{ position: "absolute", right: -PORT_SIZE / 2, top: 10, display: "flex", flexDirection: "column", gap: PORT_GAP - PORT_SIZE }}>
        {data.consumed.map((p, i) => {
          const color = METHOD_COLORS[p.method] || "#6B7280";
          const isOrphaned = p.status === "orphaned";
          return (
            <Handle
              key={`con-${i}`}
              type="source"
              position={Position.Right}
              id={`con-${i}`}
              style={{
                width: PORT_SIZE,
                height: PORT_SIZE,
                background: isOrphaned ? "var(--lunar-theme-bg)" : color,
                border: `3px solid ${isOrphaned ? "#F59E0B" : color}`,
                borderRadius: isOrphaned ? "30%" : "50%",
                position: "relative",
                right: 0,
                top: 0,
                transform: "none",
                pointerEvents: "none",
                // 悬空端口：黄色外圈光晕
                boxShadow: isOrphaned ? "0 0 0 3px rgba(245, 158, 11, 0.35)" : "none",
              }}
            />
          );
        })}
      </div>
    </div>
  );
});
