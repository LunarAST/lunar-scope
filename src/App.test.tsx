import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';

// Mock fetch to prevent network requests in test environment
globalThis.fetch = vi.fn(() =>
  Promise.resolve({
    json: () => Promise.resolve({
      version: "0.5.0",
      projects: [],
      alignments: [],
      aggregatedEdges: [],
      anomalies: { unusedEndpoints: [], orphanedConsumers: [], crossLayerViolations: [] },
    }),
  })
) as unknown as typeof fetch;

describe('App', () => {
  it('renders loading state initially', () => {
    render(<App />);
    // Initially shows loading text
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });
});
