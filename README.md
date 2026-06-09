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
- Node border color reflects project `type`: service (green), client (blue), mixed (amber).
- Interface ports are rendered as colored dots: solid for aligned, hollow (with method color fill) for unused/orphaned.

### 3.3 Edge and Port Rendering by Contract Status

| Status | Visual Representation | Interaction Model |
|:---|:---|:---|
| `Aligned` | Thin green solid line (`#10B981`) | No interaction; represents healthy contract. |
| `ParamNameMismatch` | Blue dashed line (`#3B82F6`) | Non-actionable diagnostic warning. Hover shows parameter name difference. |
| `Orphaned` | **Dangling Cable Metaphor** (`#F59E0B`) | **Actionable**. Renders as a dangling yellow cable with a question-mark connector from the consumer port. Drag toward a provider port to snap-align; generates YAML patch. |
| `MethodMismatch` | Bold red flowing solid line (`#EF4444`) | Click opens side drawer with method conflict details. |
| `Unverified` | Dim gray dashed line (`#6B7280`) | Hover shows "Data source unavailable due to CI scan failure". |
| `Unused` (Port-level) | Slate Gray Exposed Port (`#4B5563`) | Renders directly on the Exposed Port as an unused badge. No edge connection. |

### 3.3.1 Port Indicator Design Language

Every interface port (endpoint) in `lunar-scope` follows a three-layer visual encoding, fully decoupled via CSS custom properties.

| Status | Fill | Border | Outer Glow | Shape (Exposed) | Shape (Consumed) |
|:---|:---|:---|:---|:---|:---|
| `aligned` | Solid method color | Method color | None | Circle | Circle |
| `unused` | Hollow (theme background) | Method color | Red (`#EF4444`) | Circle | N/A |
| `orphaned` | Hollow (theme background) | Method color | Yellow (`#F59E0B`) | N/A | Diamond |
| `mismatch` | Solid method color | Method color | Red (`#EF4444`) | Circle | Circle |

**Layer definitions:**

- **Fill (background)**: Solid method color if aligned; theme canvas color if unused or orphaned, creating a hollow appearance.
- **Border**: Always the method color, preserving HTTP verb identity (GET green, POST blue, DELETE red, etc.).
- **Outer Glow (boxShadow)**: None if aligned; red glow if unused; yellow glow if orphaned. Provides an instant status signal without obscuring the method color.
- **Shape**: Circle for all exposed ports and aligned consumed ports; diamond (30% border-radius) for orphaned consumed ports, reinforcing the "broken connection" metaphor.

**Implementation**: All color values reference CSS custom properties (e.g., `var(--lunar-method-get-text)`) and are centralized in `src/portStyles.ts`, ensuring `ProjectNode` handles and card indicators render identically from a single source of truth.

### 3.4 Composite Edge Aggregation
- Multiple alignments between the same client-server pair are rendered as a single composite edge.
- Edge label shows call count (e.g., `12 Calls`).
- Clicking the composite edge opens a Vercel-style side drawer listing all individual paths, methods, and statuses.

### 3.5 Port-level Edge Routing (v0.7.0 target)

When `aggregatedEdges` entries carry a `ports` array, each port-level connection is rendered as an individual edge from a specific source Handle to a specific target Handle.

- **Source Handle**: `consumed` port at index `sourcePortIndex` on the client node.
- **Target Handle**: `exposed` port at index `targetPortIndex` on the server node.
- **Edge style** is determined by the individual port `status`, not the aggregated status.
- If `ports` is absent or empty, fallback to aggregated edge rendering (backward compatible).

This enables:
- True visual binding between specific interfaces.
- Per-port status indication (Aligned solid, Orphaned dangling, Unused no edge).
- Future magnetic drag-and-drop alignment on orphaned ports.

### 3.6 Ecosystem Anomalies Panel
- A dedicated panel accessible from the toolbar.
- Lists `unusedEndpoints`, `orphanedConsumers`, and `crossLayerViolations` from the `anomalies` field.
- Clicking an anomaly highlights the relevant node/edge on the canvas.

### 3.7 Zero-Privilege Guided Sync (Dangling Cable Patching)
1. User drags a dangling yellow `Orphaned` consumer cable toward a green provider port.
2. System detects magnetic snap and calculates the required `.lunar/interfaces.yml` patch.
3. A bottom control bar appears showing the YAML diff and two copy buttons:
   - **Copy Patch**: copies the YAML snippet.
   - **Copy CLI Command**: copies `lunar sync --apply` command.
4. User pastes and executes locally; `lunar` CLI handles backup and write.

### 3.8 AI-Assisted Contract Maintenance

AI agents (local or web-based) can assist in maintaining ecosystem contracts without privileged access to the developer's machine.

1. **AI Context Acquisition**: The AI consumes `lunar-map.md` (via `lunar-serve` or a shared link) and identifies missing, broken, or incomplete contract declarations.
2. **Suggestion Generation**: The AI outputs a standard YAML patch file conforming to the `interfaces.yml` schema. The developer saves this file to `.lunar/suggestions/<descriptive-name>.yaml`.
3. **Review and Merge**: The developer runs `lunar sync --apply`. The CLI:
   - Lists all pending suggestions with a diff preview.
   - Prompts for confirmation.
   - Backs up the current `interfaces.yml` to `.lunar/.backup/`.
   - Merges the suggestions via field-level partial override (⊕).
   - Moves processed suggestions to `.lunar/suggestions/merged/`.
4. **Commit and Share**: The developer commits the updated `interfaces.yml` and archived suggestions to Git. The next `lunar map` run incorporates the new intent, benefiting all future AI and human consumers.

This workflow ensures zero privilege escalation, full auditability, and a continuously improving ecosystem contract.

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

- **v0.7.0**: Port-level edge routing — individual edges bound to specific Handles, per-port status colors and animations.
- Natural language query: "show me all broken contracts"
- Time-travel: view topology at different generation IDs
- AI Agent integration: expose structured API for LLM consumption
- Custom theme designer for enterprise branding

---

*"Contract supremacy, not a fraction off. See your entire ecosystem at a glance."*
