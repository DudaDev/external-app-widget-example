import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useEffect } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ErrorBoundary from '../../components/ErrorBoundary';

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

function Boom(): never {
  throw new Error('test render error');
}

describe('ErrorBoundary', () => {
  it('renders children when there is no error', () => {
    render(<ErrorBoundary><p>all good</p></ErrorBoundary>);
    expect(screen.getByText('all good')).toBeInTheDocument();
  });

  it('renders the fallback UI when a child throws', () => {
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    );
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
  });

  it('does not render children after a throw', () => {
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    );
    expect(screen.queryByText('all good')).not.toBeInTheDocument();
  });

  it('wraps the error message in role="alert"', () => {
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    );
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(/something went wrong/i);
  });

  it('shows a retry button in the fallback UI', () => {
    render(<ErrorBoundary><Boom /></ErrorBoundary>);
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  it('re-mounts children when the retry button is clicked', async () => {
    const user = userEvent.setup();
    let shouldThrow = true;
    function MaybeThrow() {
      if (shouldThrow) throw new Error('test error');
      return <p>recovered</p>;
    }

    render(<ErrorBoundary><MaybeThrow /></ErrorBoundary>);
    expect(screen.getByRole('alert')).toBeInTheDocument();

    shouldThrow = false;
    await user.click(screen.getByRole('button', { name: /try again/i }));

    expect(screen.getByText('recovered')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('remounts the subtree on a second retry cycle, not just the first', async () => {
    // The first recovery after a throw is always a fresh mount (the boundary
    // rendered the fallback UI in between, a structurally different tree).
    // The bug this test targets only shows up on a SECOND throw+retry cycle:
    // without resetKey applied, React may reuse the same fiber position and
    // its accumulated state across cycles instead of starting clean.
    const user = userEvent.setup();
    let mountCount = 0;
    let shouldThrow = true;
    function Tracker() {
      useEffect(() => {
        mountCount += 1;
      }, []);
      return <p>tracked</p>;
    }
    function MaybeThrow() {
      if (shouldThrow) throw new Error('test error');
      return <Tracker />;
    }

    const { rerender } = render(<ErrorBoundary><MaybeThrow /></ErrorBoundary>);
    shouldThrow = false;
    await user.click(screen.getByRole('button', { name: /try again/i }));
    expect(screen.getByText('tracked')).toBeInTheDocument();
    expect(mountCount).toBe(1);

    // Forces MaybeThrow to re-render and throw again, without going through
    // a click (nothing in the successfully-recovered tree still has a button).
    shouldThrow = true;
    rerender(<ErrorBoundary><MaybeThrow /></ErrorBoundary>);
    expect(screen.getByRole('alert')).toBeInTheDocument();

    shouldThrow = false;
    await user.click(screen.getByRole('button', { name: /try again/i }));
    expect(screen.getByText('tracked')).toBeInTheDocument();
    expect(mountCount).toBe(2);
  });
});
