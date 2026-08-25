import { Component, type ErrorInfo, type ReactNode } from 'react';
import FetchError from '../FetchError';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[Spotify] Uncaught render error:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return <FetchError message="Something went wrong. Please reload the page." />;
    }
    return this.props.children;
  }
}
