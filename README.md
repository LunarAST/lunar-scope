# lunar-scope — Ecosystem Visualization Canvas

**Static, offline-capable topology renderer for the LunarAST protocol family.**

## 1. Purpose and Physical Boundaries

`lunar-scope` is the visualization layer of the LunarAST ecosystem. It consumes a standard `lunar-map.json` file and renders an interactive, multi-layer topological graph of microservice interfaces, their alignments, and ecosystem anomalies.

### 1.1 What It Does
- Renders project nodes and alignment edges from `lunar-map.json`.
- Supports composite edge aggregation (multiple calls between same projects collapsed into one single edge).
- Displays ecosystem anomaly reports (unused endpoints, orphaned consumers, cross-layer violations).
- Provides zero-privilege guided sync: generates YAML patches for broken contracts, copied to clipboard for local CLI execution.
- Ships as a single, offline-capable HTML file with zero runtime dependencies.

### 1.2 What It Does Not Do
- Does not write any files to disk (no privileged access).
- Does not require a backend server.
- Does not perform alignment computations (that is `lunar`'s job).
- Does not handle authentication or authorization (that is `lunar-gateway`'s job).

---

## 2. Data Contract

`lunar-scope` consumes a `lunar-map.json` file conforming to the schema defined in `schemas/lunar-map.schema.json`.

### 2.1 Required Fields
- `version`: schema version string (e.g. `"0.5.0"`)
- `projects`: array of project nodes with `name`, `type`, `sha`, `scanStatus`, `interfaces`
- `alignments`: array of individual alignment entries
- `aggregatedEdges`: array of composite edges (grouped by client-server pair)
- `anomalies`: object containing `unusedEndpoints`, `orphanedConsumers`, `crossLayerViolations`

### 2.2 Path Serialization
All paths use the standard format: `/{segment}` for literals, `/{paramName}` for parameters, `/*` for wildcards.

---

## 3. Visual and Interaction Specification

### 3.1 Layout
- Deterministic layered layout via `elkjs` (Eclipse Layout Kernel).
- Services arranged left-to-right (clients → services).
- No physics-based jitter; positions are 100% reproducible.

### 3.2 Node Rendering
- Dark charcoal background (`#0B0B0C`) with subtle grid lines.
- Project nodes as rectangular cards with exposed ports (left) and consumed ports (right).
- Node border color reflects project `type`: service, client, or mixed.

### 3.3 Edge and Port Rendering by Contract Status

| Status | Visual Representation | Interaction Model |
|:---|:---|:---|
| `Aligned` | Thin green solid line (`#10B981`) | No interaction; represents healthy contract. |
| `ParamNameMismatch` | Blue dashed line (`#3B82F6`) | Non-actionable diagnostic warning. Hover shows parameter name difference (e.g., `:userId` vs `{id}`), does not prompt snapping. |
| `Orphaned` | **Dangling Cable Metaphor** (`#F59E0B`) | **Actionable**. Renders as a dangling yellow cable with a question-mark connector drooping from the consumer port. User drags the connector toward a provider port to snap-align; generates YAML patch. |
| `MethodMismatch` | Bold red flowing solid line (`#EF4444`) | Click opens side drawer with HTTP method conflict details (e.g. GET vs POST) and recovery suggestions. |
| `Unverified` | Dim gray dashed line (`#6B7280`) | Hover shows "Data source unavailable due to CI scan failure". |
| `Unused` (Port-level) | Slate Gray Exposed Port (`#4B5563`) | Renders directly on the Exposed Port node on the left of the card. Displays an "Unused" badge on hover, indicating a dead-end endpoint that can be safely refactored or deleted. |

### 3.4 Composite Edge Aggregation
- Multiple alignments between the same client-server pair are rendered as a single composite edge.
- Edge label shows call count (e.g., `12 Calls`).
- Clicking the composite edge opens a Vercel-style side drawer listing all individual paths, methods, and statuses.

### 3.5 Ecosystem Anomalies Panel
- A dedicated panel accessible from the toolbar.
- Lists `unusedEndpoints`, `orphanedConsumers`, and `crossLayerViolations` from the `anomalies` field.
- Clicking an anomaly highlights the relevant node/edge on the canvas.

### 3.6 Zero-Privilege Guided Sync (Dangling Cable Patching)
1. User drags a dangling yellow `Orphaned` consumer cable toward a green provider port.
2. System detects magnetic snap and calculates the required `.lunar/interfaces.yml` patch.
3. A bottom control bar appears showing the YAML diff and two copy buttons:
   - **Copy Patch**: copies the YAML snippet.
   - **Copy CLI Command**: copies `lunar sync --apply` command.
4. User pastes and executes locally; `lunar` CLI handles backup and write.

---

## 4. Technology Stack

| Layer | Choice | Rationale |
|:---|:---|:---|
| Framework | React + Vite | Mature ecosystem, fast HMR, TypeScript |
| Graph Library | xyflow (React Flow) | Node-based UI with native Ports; viewport virtualization |
| Layout Engine | elkjs | Deterministic layered layout; no jitter |
| Bundling | vite-plugin-singlefile | Produces single offline HTML with all assets inlined |
| Language | TypeScript | Type safety for complex data structures |

---

## 5. Deployment and Data Injection Contract

### 5.1 Offline Mode (Data Injection Placeholder)
- **Vite Compiler**: Builds the React app using `vite-plugin-singlefile` to produce a template file containing a standardized data placeholder:
  `<script>window.lunarMapPayload = /* LUNAR_MAP_DATA_PLACEHOLDER */ null;</script>`
- **Orchestrator Injection**: During S3/R2 upload or local CLI compilation, `lunar` injects the JSON payload into this placeholder via rapid text substitution, producing a completely self-contained, single-file `route-scope.html`.
- **Zero Privileges**: Safe for air-gapped, zero-network environments.

---

## 6. Relationship with Other Components

| Component | Relationship |
|:---|:---|
| `lunar` CLI | Produces `lunar-map.json` consumed by lunar-scope. |
| `lunar-gateway` | Serves `lunar-map.json` and static scope assets in online mode. |
| RouteAST Sub-Protocol | Defines the alignment statuses rendered by lunar-scope. |
| Ecosystem Mother Spec | Defines the four-layer architecture and generation sync mechanism. |

`lunar-scope` is purely a consumer of data. It never writes to the filesystem or modifies configuration files.

---

## 7. Future Roadmap

- Natural language query: "show me all broken contracts"
- Time-travel: view topology at different generation IDs
- AI Agent integration: expose structured API for LLM consumption
- Custom theme designer for enterprise branding

---

*"Contract supremacy, not a fraction off. See your entire ecosystem at a glance."*
