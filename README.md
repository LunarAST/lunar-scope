# Lunar Scope – Ecosystem Visualizer

Interactive graph visualization for LunarAST ecosystem topology.  
Built with React Flow.

## Features

- **Project node layout** with exposed (left) and consumed (right) ports
- **Edge aggregation** – shows call counts, status (Aligned, Orphaned, ParamNameMismatch, etc.)
- **Spotlight mode** – click on an edge or node to dim unrelated elements
- **Anomalies panel** – lists unused endpoints and orphaned consumers
- **🔍 Search & filter bar** (new)

## Search & Filter

Located at the top center of the canvas. Supports:

| Input                      | Effect                                                                 |
|----------------------------|------------------------------------------------------------------------|
| `text`                     | Highlights projects or paths containing the text (case‑insensitive).   |
| `status:orphaned`          | Shows only edges with status **Orphaned**.                             |
| `status:unused`            | Highlights nodes that have **unused** exposed endpoints.               |
| `method:GET` (or POST,etc.)| Highlights nodes/edges that contain a specific HTTP method.            |

- Unmatched elements are dimmed (opacity reduced).
- Press `Escape` or click the `×` button to clear the search.

## Development

```bash
npm install
npm run dev        # starts dev server on http://localhost:5173
npm run build      # production build
npm run preview    # preview build locally
```

## Data Source

Fetches `/lunar-map.json` from the same origin. In production, you can serve it via `lunar-serve` or a static server.

## Related

- [LunarAST CLI](https://github.com/LunarAST/lunar) – generate `lunar-map.json`
- [Ecosystem Whitepaper](https://github.com/LunarAST/.github/blob/main/docs/ecosystem-whitepaper-v1.0.md)
