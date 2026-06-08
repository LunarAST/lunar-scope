import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';

describe('App', () => {
  it('renders loading state when no data', () => {
    render(<App />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });
});
