export interface RouteSegment {
  type: "literal" | "parameter" | "wildcard";
  value?: string;
  name?: string;
  rawConstraint?: string | null;
}

export interface RouteEntry {
  method: string;
  segments: RouteSegment[];
  sourceFile: string;
  lineNumber: number;
  extractionMethod: string;
  targetProject?: string | null;
}

export interface InterfaceItem {
  path: string;
  method: string;
  targetProject?: string;
}

export interface ProjectInfo {
  name: string;
  type: "service" | "client" | "mixed";
  sha: string;
  scanStatus: "success" | "failed" | "stale";
  interfaces: {
    exposed: InterfaceItem[];
    consumed: InterfaceItem[];
  };
}

export interface AlignmentEntry {
  clientProject: string;
  serverProject: string;
  path: string;
  method: string;
  status: "Aligned" | "ParamNameMismatch" | "Orphaned" | "MethodMismatch" | "Unverified";
  warning?: string | null;
}

export interface PortConnection {
  path: string;
  method: string;
  status: string;
  sourcePortIndex: number;
  targetPortIndex: number;
}

export interface AggregatedEdge {
  clientProject: string;
  serverProject: string;
  callCount: number;
  status: string;
  paths: string[];
  ports: PortConnection[];
}

export interface AnomalyEndpoint {
  project: string;
  path: string;
  method: string;
}

export interface Anomalies {
  unusedEndpoints: AnomalyEndpoint[];
  orphanedConsumers: AnomalyEndpoint[];
  crossLayerViolations: Record<string, unknown>[];
}

export interface LunarMap {
  version: string;
  projects: ProjectInfo[];
  alignments: AlignmentEntry[];
  aggregatedEdges: AggregatedEdge[];
  anomalies: Anomalies;
}

export const METHOD_COLORS: Record<string, string> = {
  GET: "#22c55e",
  POST: "#3b82f6",
  PUT: "#f59e0b",
  DELETE: "#ef4444",
  PATCH: "#8b5cf6",
  HEAD: "#06b6d4",
  OPTIONS: "#64748b",
};
