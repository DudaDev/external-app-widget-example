import { Component, ErrorInfo, ReactNode } from 'react'
import { Box, Typography } from '@mui/material'

interface Props {
  children: ReactNode
  onError?: (err: unknown, info: ErrorInfo) => void
}

interface State {
  hasError: boolean
  message: string
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[InstantSite] Uncaught render error:', error, info.componentStack)
    this.props.onError?.(error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <Box role="alert" sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="body1" color="error">
            Something went wrong. Please refresh and try again.
          </Typography>
          {import.meta.env.DEV && (
            <Typography variant="caption" sx={{ opacity: 0.6, display: 'block', mt: 1 }}>
              {this.state.message}
            </Typography>
          )}
        </Box>
      )
    }
    return this.props.children
  }
}
