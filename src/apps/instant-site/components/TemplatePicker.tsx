import { useEffect, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  ButtonGroup,
  Card,
  CardMedia,
  CardContent,
  CircularProgress,
  Tooltip,
  Typography,
} from '@mui/material'
import { API, Template } from '../api/api'
import BackButton from './BackButton'
import type { InstantSiteErrorContext } from '../types'

interface Props {
  onBack: () => void
  onSelect: (template: Template) => void
  onError?: (err: unknown, context: InstantSiteErrorContext) => void
}

export default function TemplatePicker({ onBack, onSelect, onError }: Props) {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    API.getTemplates()
      .then(setTemplates)
      .catch((err: Error) => {
        setError(err.message)
        onError?.(err, { step: 'templates' })
      })
      .finally(() => setLoading(false))
    // onError intentionally omitted — a prop-callback dep here would re-run
    // the fetch whenever the caller passes a new function reference.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <Box>
      <BackButton onClick={onBack} />
      <Typography variant="h5" sx={{ fontWeight: 600, mb: 0.5 }}>
        Choose a Template
      </Typography>
      <Typography variant="body2" sx={{ mb: 3, opacity: 0.7 }}>
        Preview a template or select one to start building.
      </Typography>

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      )}

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {!loading && !error && (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: 2,
            maxHeight: 520,
            overflowY: 'auto',
            pr: 0.5,
          }}
        >
          {templates.map((t) => (
            <Card
              key={t.template_id}
              elevation={2}
              sx={{
                borderRadius: 2,
                backgroundColor: 'rgba(255,255,255,0.08)',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
                overflow: 'hidden',
                '&:hover .card-hover-actions': { opacity: 1 },
              }}
            >
              <CardMedia
                component="img"
                image={t.desktop_thumbnail_url}
                alt={t.template_name}
                sx={{ aspectRatio: '4/3', objectFit: 'cover', display: 'block' }}
              />
              <CardContent sx={{ py: 1, px: 1.5 }}>
                <Tooltip title={t.template_name}>
                  <Typography variant="body2" sx={{ fontWeight: 500 }} noWrap>
                    {t.template_name}
                  </Typography>
                </Tooltip>
              </CardContent>

              {/* Mobile/tablet: static buttons below name */}
              <Box sx={{ display: { xs: 'block', md: 'none' }, px: 1, pb: 1 }}>
                <ButtonGroup fullWidth size="small">
                  <Button
                    variant="outlined"
                    onClick={() => window.open(t.preview_url, '_blank', 'noopener,noreferrer')}
                    sx={{ color: 'rgba(255,255,255,0.7)', borderColor: 'rgba(255,255,255,0.2)' }}
                  >
                    Preview
                  </Button>
                  <Button variant="contained" onClick={() => onSelect(t)}>
                    Build
                  </Button>
                </ButtonGroup>
              </Box>

              {/* Desktop: hover overlay */}
              <Box
                className="card-hover-actions"
                sx={{
                  display: { xs: 'none', md: 'flex' },
                  flexDirection: 'column',
                  justifyContent: 'flex-end',
                  position: 'absolute',
                  inset: 0,
                  opacity: 0,
                  transition: 'opacity 0.2s',
                  background: 'linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.55) 50%, transparent 100%)',
                }}
              >
                <Box sx={{ px: 1, pb: 1 }}>
                  <ButtonGroup fullWidth size="small">
                    <Button
                      variant="outlined"
                      onClick={() => window.open(t.preview_url, '_blank', 'noopener,noreferrer')}
                      sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.5)' }}
                    >
                      Preview
                    </Button>
                    <Button variant="contained" onClick={() => onSelect(t)}>
                      Build
                    </Button>
                  </ButtonGroup>
                </Box>
              </Box>
            </Card>
          ))}
        </Box>
      )}
    </Box>
  )
}
