import { Component, Fragment, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  resetKey: number;
}

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, resetKey: 0 };
    this.handleReset = this.handleReset.bind(this);
  }

  static getDerivedStateFromError(): Partial<ErrorBoundaryState> {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[CollectionSearch] Uncaught render error:', error, info.componentStack);
  }

  handleReset() {
    this.setState((s) => ({ hasError: false, resetKey: s.resetKey + 1 }));
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          style={{ textAlign: 'center', color: 'var(--search-text-muted, #6B7280)', padding: '32px 0' }}
        >
          <p>Something went wrong displaying results. Please try again.</p>
          <button onClick={this.handleReset} style={{ marginTop: '12px' }}>
            Try again
          </button>
        </div>
      );
    }
    // resetKey as the Fragment's key forces React to unmount and remount the
    // subtree on retry, instead of leaving the same (possibly broken) fiber in place.
    return <Fragment key={this.state.resetKey}>{this.props.children}</Fragment>;
  }
}
