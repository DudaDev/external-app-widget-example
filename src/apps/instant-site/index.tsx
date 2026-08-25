/**
  Instant Site App

  Creates Duda sites via AI generation or template + content library population.
  Wraps the Widget step machine in a MUI dark theme.

  Expected props (passed by DM via init()):
    apiUrl     {string} URL of your instant-site backend (e.g. 'https://my-server.railway.app')
               Falls back to VITE_INSTANT_SITE_API_URL at build time, then '' (relative URLs)
    embedToken {string} Shared secret for backend authentication
               Falls back to VITE_INSTANT_SITE_EMBED_TOKEN at build time
    enablePresets {boolean} Optional, default false. DEV ONLY — enables the
               "Fill with example…" autofill dropdown. Leave unset on live sites.
    onError    {function} Optional — called on any backend-call failure (matching
               collection-search/spotify's onError) or an uncaught render error
               (context.step === 'render' in that case)
 */
import { useEffect } from 'react'
import { createTheme, ThemeProvider, ScopedCssBaseline } from '@mui/material'
// latin-only subset, not the default (all 9 Unicode subsets × 4 weights =
// 36 @font-face rules, ~1.2MB of base64 font data — most of this bundle).
import '@fontsource/roboto/latin-300.css'
import '@fontsource/roboto/latin-400.css'
import '@fontsource/roboto/latin-500.css'
import '@fontsource/roboto/latin-700.css'
import { configureApi } from './api/api'
import ErrorBoundary from './components/ErrorBoundary'
import Widget from './Widget'
import type { InstantSiteErrorContext } from './types'

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#f56033' },
    secondary: { main: '#FF0000' },
    background: { default: '#3a3a3a', paper: '#3a3a3a' },
  },
})

export type { InstantSiteErrorContext }

interface Props {
  apiUrl?: string
  embedToken?: string
  enablePresets?: boolean
  onError?: (err: unknown, context: InstantSiteErrorContext) => void
}

export default function InstantSiteApp({ apiUrl, embedToken, enablePresets = false, onError }: Props) {
  useEffect(() => { configureApi(apiUrl, embedToken) }, [apiUrl, embedToken])

  return (
    <ThemeProvider theme={theme}>
      {/* ScopedCssBaseline resets CSS (headings, form elements, box-sizing, fonts) scoped to this
          widget root only, not Duda's page body. white-space: normal overrides the inherited
          white-space: nowrap from .dmWidget. */}
      <ScopedCssBaseline
        sx={(t) => ({
          whiteSpace: 'normal',
          width: '100%',
          // Duda's element-level CSS beats MUI's class-based rules; !important forces correct values in this scope.

          // Headings
          '& h1, & h2, & h3, & h4, & h5, & h6': {
            color: `${t.palette.text.primary} !important`,
          },

          // MUI Grid container uses CSS grid; Duda div styles can override display
          '& .MuiGrid-container': {
            display: 'grid !important',
          },

          // Floating label requires absolute positioning relative to InputBase
          '& .MuiInputBase-root': {
            position: 'relative !important',
          },
          '& .MuiInputLabel-root': {
            position: 'absolute !important',
            margin: '0 !important',
            lineHeight: '1.4375em !important',
            color: 'rgba(255, 255, 255, 0.7) !important',
          },

          // Duda's input CSS (borders, backgrounds, shadows) leaks in; solid colours avoid an alpha channel Duda's colour can bleed through.
          '& input:not([type=checkbox]):not([type=radio]), & textarea': {
            border: 'none !important',
            outline: 'none !important',
            boxShadow: 'none !important',
            backgroundColor: '#525252 !important',
            margin: '0 !important',
            color: 'rgba(255, 255, 255, 0.87) !important',
          },

          '& .MuiInputBase-input': {
            color: 'rgba(255, 255, 255, 0.87) !important',
            backgroundColor: 'transparent !important',
          },
          '& .MuiFormHelperText-root': {
            color: 'rgba(255, 255, 255, 0.5) !important',
          },

          // Filled input wrapper — solid colour beats any rgba Duda applies.
          '& .MuiFilledInput-root': {
            backgroundColor: '#525252 !important',
          },
          '& .MuiFilledInput-root:hover': {
            backgroundColor: '#5e5e5e !important',
          },
          '& .MuiFilledInput-root.Mui-focused': {
            backgroundColor: '#585858 !important',
          },
        })}
      >
        <ErrorBoundary onError={(err) => onError?.(err, { step: 'render' })}>
          <Widget enablePresets={enablePresets} onError={onError} />
        </ErrorBoundary>
      </ScopedCssBaseline>
    </ThemeProvider>
  )
}
