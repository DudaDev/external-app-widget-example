import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import ErrorBoundary from '../ErrorBoundary';

function Boom(): never {
  throw new Error('boom');
}

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('custom-form ErrorBoundary', () => {
  it('renders children when there is no error', () => {
    render(<ErrorBoundary><p>all good</p></ErrorBoundary>);
    expect(screen.getByText('all good')).toBeInTheDocument();
  });

  it('renders a fallback alert instead of crashing when a child throws', () => {
    render(<ErrorBoundary><Boom /></ErrorBoundary>);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('forwards the error to onError', () => {
    const onError = vi.fn();
    render(<ErrorBoundary onError={onError}><Boom /></ErrorBoundary>);
    expect(onError).toHaveBeenCalledWith(expect.any(Error), expect.anything());
  });
});
