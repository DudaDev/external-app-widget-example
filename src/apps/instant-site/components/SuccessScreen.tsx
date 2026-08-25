import { useState } from 'react'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Typography,
} from '@mui/material'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import { API } from '../api/api'
import type { InstantSiteErrorContext } from '../types'

interface Props {
  siteName: string
  userId: string
  onError?: (err: unknown, context: InstantSiteErrorContext) => void
}

export default function SuccessScreen({ siteName, userId, onError }: Props) {
  const [ssoLoading, setSsoLoading] = useState(false)
  const [ssoError, setSsoError] = useState('')
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [deleted, setDeleted] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  async function handleOpenEditor() {
    setSsoError('')
    setSsoLoading(true)
    try {
      const { url } = await API.getSSOLink(userId, siteName)
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch (err: unknown) {
      setSsoError(err instanceof Error ? err.message : 'Could not get editor link.')
      onError?.(err, { step: 'sso-link' })
    } finally {
      setSsoLoading(false)
    }
  }

  async function handleDelete() {
    setConfirmOpen(false)
    setDeleteError('')
    setDeleteLoading(true)
    try {
      await API.deleteSite(siteName)
      setDeleted(true)
    } catch (err: unknown) {
      setDeleteError(err instanceof Error ? err.message : 'Could not delete site.')
      onError?.(err, { step: 'delete-site' })
    } finally {
      setDeleteLoading(false)
    }
  }

  if (deleted) {
    return (
      <Box sx={{ textAlign: 'center', py: 6 }}>
        <Typography variant="h6" gutterBottom>Site deleted.</Typography>
      </Box>
    )
  }

  return (
    <Box sx={{ textAlign: 'center', py: 4 }}>
      <CheckCircleIcon sx={{ fontSize: 72, color: 'success.main', mb: 2 }} />
      <Typography variant="h5" sx={{ fontWeight: 600 }} gutterBottom>
        Your site is ready!
      </Typography>
      <Typography variant="body2" sx={{ opacity: 0.6, mb: 1 }}>
        Site: <strong>{siteName}</strong>
      </Typography>
      <Typography variant="body2" sx={{ opacity: 0.6, mb: 3 }}>
        Account: <strong>{userId}</strong>
      </Typography>

      {ssoError && <Alert severity="error" sx={{ mb: 2, maxWidth: 420, mx: 'auto' }}>{ssoError}</Alert>}
      {deleteError && <Alert severity="error" sx={{ mb: 2, maxWidth: 420, mx: 'auto' }}>{deleteError}</Alert>}

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, maxWidth: 320, mx: 'auto' }}>
        <Button
          variant="contained"
          size="large"
          endIcon={ssoLoading ? <CircularProgress size={18} color="inherit" /> : <OpenInNewIcon />}
          onClick={handleOpenEditor}
          disabled={ssoLoading}
        >
          {ssoLoading ? 'Opening…' : 'Open Site Editor'}
        </Button>
        <Button
          variant="text"
          color="error"
          onClick={() => setConfirmOpen(true)}
          disabled={deleteLoading}
        >
          {deleteLoading ? 'Deleting…' : 'Delete This Site'}
        </Button>
      </Box>

      <Dialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-description"
      >
        <DialogTitle id="delete-dialog-title">Delete this site?</DialogTitle>
        <DialogContent>
          <DialogContentText id="delete-dialog-description">
            This will permanently delete <strong>{siteName}</strong> and cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)}>Cancel</Button>
          <Button color="error" onClick={handleDelete}>Delete</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
