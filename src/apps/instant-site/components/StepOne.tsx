import { Box, Card, CardActionArea, CardContent, Typography } from '@mui/material'
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'
import GridViewIcon from '@mui/icons-material/GridView'

interface Props {
  onAI: () => void
  onTemplate: () => void
}

export default function StepOne({ onAI, onTemplate }: Props) {
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Create Your Site
      </Typography>
      <Typography variant="body1" sx={{ mb: 4, opacity: 0.7 }}>
        Choose how you&apos;d like to get started.
      </Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3 }}>
        <Card sx={{ borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}>
          <CardActionArea onClick={onAI} sx={{ height: '100%' }}>
            <CardContent sx={{ textAlign: 'center', py: 6 }}>
              <AutoAwesomeIcon sx={{ fontSize: 56, color: 'primary.main', mb: 2, display: 'block', mx: 'auto' }} />
              <Typography variant="h5" sx={{ mb: 1 }}>Generate with AI</Typography>
              <Typography variant="body2" sx={{ opacity: 0.7 }}>
                AI builds and populates your site from your business details.
              </Typography>
            </CardContent>
          </CardActionArea>
        </Card>
        <Card sx={{ borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}>
          <CardActionArea onClick={onTemplate} sx={{ height: '100%' }}>
            <CardContent sx={{ textAlign: 'center', py: 6 }}>
              <GridViewIcon sx={{ fontSize: 56, color: 'primary.main', mb: 2, display: 'block', mx: 'auto' }} />
              <Typography variant="h5" sx={{ mb: 1 }}>Start from a Template</Typography>
              <Typography variant="body2" sx={{ opacity: 0.7 }}>
                Pick a template, then choose how to populate it.
              </Typography>
            </CardContent>
          </CardActionArea>
        </Card>
      </Box>
    </Box>
  )
}
