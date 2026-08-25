import { Button } from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'

interface Props {
  onClick: () => void
}

export default function BackButton({ onClick }: Props) {
  return (
    <Button
      startIcon={<ArrowBackIcon />}
      onClick={onClick}
      size="small"
      sx={{ mb: 2, color: 'rgba(255,255,255,0.7)' }}
    >
      Back
    </Button>
  )
}
