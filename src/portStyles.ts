/**
 * 端口指示器渲染工具
 * ProjectNode 和卡片共用，确保样式一致，彻底解耦
 */

export interface PortStyle {
  /** 中心填充颜色 */
  background: string;
  /** 边框颜色（方法色） */
  border: string;
  /** 外圈光晕（状态色） */
  boxShadow: string;
  /** 圆角（圆形 or 菱形） */
  borderRadius: string;
  /** 端口尺寸 */
  size: number;
  /** 边框宽度 */
  borderWidth: number;
}

/** HTTP 方法 → 纯色 */
const METHOD_COLORS: Record<string, string> = {
  GET: "#10B981",
  POST: "#3B82F6",
  PUT: "#F59E0B",
  DELETE: "#EF4444",
  PATCH: "#8B5CF6",
};

/** 状态 → 外圈光晕色 */
const STATUS_OUTER: Record<string, string> = {
  unused: "#EF4444",   // 红色外圈：无人消费
  orphaned: "#F59E0B", // 黄色外圈：悬空
  aligned: "transparent",
  mismatch: "#EF4444",
};

/** 根据接口信息计算端口样式 */
export function getPortStyle(
  method: string,
  status: string,
  isOrphaned: boolean = false
): PortStyle {
  const color = METHOD_COLORS[method] || "#6B7280";
  const outerColor = STATUS_OUTER[status] || "transparent";
  const isHollow = status === "unused" || status === "orphaned";

  return {
    background: isHollow ? "var(--lunar-theme-bg)" : color,
    border: `3px solid ${color}`,
    boxShadow: outerColor !== "transparent"
      ? `0 0 0 3px ${outerColor}66`
      : "none",
    borderRadius: isOrphaned ? "30%" : "50%",
    size: 10,
    borderWidth: 3,
  };
}

/** React Flow Handle 专用样式适配 */
export function getHandleStyle(method: string, status: string, isOrphaned: boolean = false): React.CSSProperties {
  const style = getPortStyle(method, status, isOrphaned);
  return {
    width: style.size,
    height: style.size,
    background: style.background,
    border: style.border,
    borderRadius: style.borderRadius,
    boxShadow: style.boxShadow,
    position: "relative",
    left: 0,
    top: 0,
    transform: "none",
    pointerEvents: "none",
  };
}

/** 卡片中的指示器样式（与 Handle 完全一致） */
export function getIndicatorStyle(method: string, status: string, isOrphaned: boolean = false): React.CSSProperties {
  const style = getPortStyle(method, status, isOrphaned);
  return {
    display: "inline-block",
    width: style.size,
    height: style.size,
    background: style.background,
    border: style.border,
    borderRadius: style.borderRadius,
    boxShadow: style.boxShadow,
    flexShrink: 0,
  };
}
