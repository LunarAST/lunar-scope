# LunarScope — Ecosystem Visualization Canvas

**Static, offline-capable topology renderer for the LunarAST protocol family.**

## 1. Purpose and Physical Boundaries

`lunar-scope` is the visualization layer of the LunarAST ecosystem. It consumes a standard `lunar-map.json` file and renders an interactive topological graph of microservice interfaces, their alignments, and ecosystem anomalies.

### 1.1 What It Does
- Renders project nodes and alignment edges from `lunar-map.json`
- Supports composite edge aggregation (multiple calls between same projects collapsed into one edge)
- Displays ecosystem anomaly reports (unused endpoints, orphaned consumers, cross-layer violations)
- Provides zero-privilege guided sync: generates YAML patches for broken contracts, copied to clipboard for local CLI execution
- Ships as a single, offline-capable HTML file with zero runtime dependencies

### 1.2 What It Does Not Do
- Does not write any files to disk (no privileged access)
- Does not require a backend server
- Does not perform alignment computations (that is `lunar`'s job)
- Does not handle authentication or authorization (that is `lunar-gateway`'s job)

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
- Deterministic layered layout via `elkjs` (Eclipse Layout Kernel)
- Services arranged left-to-right (clients → services)
- No physics-based jitter; positions are 100% reproducible

### 3.2 Node Rendering
- Dark charcoal background (`#0B0B0C`) with subtle grid lines
- Project nodes as rectangular cards with exposed ports (left) and consumed ports (right)
- Node color reflects project `type`: service, client, or mixed

### 3.3 Edge Rendering by Contract Status

| Status | Visual | Interaction |
|:---|:---|:---|
| `Aligned` | Thin green solid line (`#10B981`) | No interaction; represents healthy contract |
| `ParamNameMismatch` | Blue dashed line (`#3B82F6`) | Hover shows parameter name difference only; non-actionable diagnostic |
| `Orphaned` | Warning yellow dashed line (`#F59E0B`) | **Actionable**: drag consumer port near provider to snap-align; generates YAML patch; copy CLI command to apply |
| `MethodMismatch` | Bold red flowing solid line (`#EF4444`) | Click opens side drawer with method conflict details and recovery suggestions |
| `Unverified` | Dim gray dashed line (`#6B7280`) | Hover shows "data source unavailable due to CI scan failure" |

### 3.4 Composite Edge Aggregation
- Multiple alignments between the same client-server pair are rendered as a single composite edge
- Edge label shows call count (e.g., `12 Calls`)
- Clicking the composite edge opens a Vercel-style side drawer listing all individual paths, methods, and statuses

### 3.5 Ecosystem Anomalies Panel
- A dedicated panel accessible from the toolbar
- Lists `unusedEndpoints`, `orphanedConsumers`, and `crossLayerViolations` from the `anomalies` field
- Clicking an anomaly highlights the relevant node/edge on the canvas

### 3.6 Zero-Privilege Guided Sync
1. User drags an orphaned consumer port toward a provider port
2. System detects magnetic snap and calculates the required `interfaces.yml` patch
3. A bottom control bar appears showing the YAML diff and two copy buttons:
   - **Copy Patch**: copies the YAML snippet
   - **Copy CLI Command**: copies `lunar sync --apply` command
4. User pastes and executes locally; `lunar` handles backup and write

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

## 5. Deployment

### 5.1 Offline Mode (Single HTML)
- Build command: `npm run build:offline`
- Output: a single `route-scope.html` file in `.lunar/` directory
- Zero network requests; safe for air-gapped environments

### 5.2 Online Mode (CDN / Edge)
- Deploy built assets to Cloudflare Pages or similar
- Served by `lunar-gateway` as static files
- Fetches `lunar-map.json` from gateway API

### 5.3 IDE Integration (VS Code Webview)
- The built static assets can be loaded directly into a VS Code Webview extension
- No code changes required; 100% reuse of browser rendering logic

---

## 6. Relationship with Other Components

| Component | Relationship |
|:---|:---|
| `lunar` CLI | Produces `lunar-map.json` consumed by lunar-scope |
| `lunar-gateway` | Serves `lunar-map.json` and static scope assets in online mode |
| RouteAST Sub-Protocol | Defines the alignment statuses rendered by lunar-scope |
| Ecosystem Mother Spec | Defines the four-layer architecture and generation sync mechanism |

`lunar-scope` is purely a consumer of data. It never writes to the filesystem or modifies configuration files.

---

## 7. Future Roadmap

- Natural language query: "show me all broken contracts"
- Time-travel: view topology at different generation IDs
- AI Agent integration: expose structured API for LLM consumption
- Custom theme designer for enterprise branding

---

*"Contract supremacy, not a fraction off. See your entire ecosystem at a glance."*
