import { Box, Card, CardActionArea, CardContent, CardMedia, Typography } from '@mui/material'
import EditNoteIcon from '@mui/icons-material/EditNote'
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'
import { Template } from '../api/api'
import BackButton from './BackButton'

interface Props {
  template: Template
  onBack: () => void
  onSimple: (template: Template) => void
  onAI: (template: Template) => void
}

export default function CreationMethod({ template, onBack, onSimple, onAI }: Props) {
  return (
    <Box>
      <BackButton onClick={onBack} />
      <Typography variant="h5" sx={{ fontWeight: 600, mb: 2 }}>How would you like to fill it?</Typography>
      <Box sx={{ display: 'flex', gap: 2, mb: 3, alignItems: 'flex-start' }}>
        <CardMedia
          component="img"
          image={template.desktop_thumbnail_url}
          alt={template.template_name}
          sx={{ width: 140, borderRadius: 1, flexShrink: 0 }}
        />
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>{template.template_name}</Typography>
          <Typography variant="body2" sx={{ opacity: 0.6, mt: 0.5 }}>
            Choose how to populate this template.
          </Typography>
        </Box>
      </Box>
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
        <Card elevation={2} sx={{ borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.08)' }}>
          <CardActionArea onClick={() => onSimple(template)} sx={{ height: '100%' }}>
            <CardContent sx={{ textAlign: 'center', py: 4 }}>
              <EditNoteIcon sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>Simple Instant Site</Typography>
              <Typography variant="body2" sx={{ mt: 1, opacity: 0.7 }}>
                Fill in your business details and we&apos;ll populate the template for you.
              </Typography>
            </CardContent>
          </CardActionArea>
        </Card>
        <Card elevation={2} sx={{ borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.08)' }}>
          <CardActionArea onClick={() => onAI(template)} sx={{ height: '100%' }}>
            <CardContent sx={{ textAlign: 'center', py: 4 }}>
              <AutoAwesomeIcon sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>AI Populate Template</Typography>
              <Typography variant="body2" sx={{ mt: 1, opacity: 0.7 }}>
                AI writes and populates the template content from your business details.
              </Typography>
            </CardContent>
          </CardActionArea>
        </Card>
      </Box>
    </Box>
  )
}
