import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ThemeProvider, createTheme } from '@mui/material'
import SuccessScreen from '../components/SuccessScreen'

vi.mock('../api/api', () => ({
  API: {
    getSSOLink: vi.fn(),
    deleteSite: vi.fn(),
  },
}))

import { API } from '../api/api'

const theme = createTheme({ palette: { mode: 'dark' } })

function renderScreen(onError?: (err: unknown, context: unknown) => void) {
  return render(
    <ThemeProvider theme={theme}>
      <SuccessScreen siteName="test-site" userId="user@example.com" onError={onError} />
    </ThemeProvider>
  )
}

afterEach(() => {
  vi.clearAllMocks()
})

describe('SuccessScreen', () => {
  it('displays site name and userId', () => {
    renderScreen()
    expect(screen.getByText(/test-site/)).toBeInTheDocument()
    expect(screen.getByText(/user@example\.com/)).toBeInTheDocument()
  })

  it('calls getSSOLink and opens window on editor button click', async () => {
    const user = userEvent.setup()
    vi.mocked(API.getSSOLink).mockResolvedValue({ url: 'https://editor.duda.co/sso' })
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null)
    renderScreen()

    await user.click(screen.getByRole('button', { name: /open site editor/i }))

    await waitFor(() => {
      expect(API.getSSOLink).toHaveBeenCalledWith('user@example.com', 'test-site')
      expect(openSpy).toHaveBeenCalledWith('https://editor.duda.co/sso', '_blank', 'noopener,noreferrer')
    })
    openSpy.mockRestore()
  })

  it('shows error alert when getSSOLink fails', async () => {
    const user = userEvent.setup()
    const onError = vi.fn()
    const err = new Error('SSO unavailable')
    vi.mocked(API.getSSOLink).mockRejectedValue(err)
    renderScreen(onError)

    await user.click(screen.getByRole('button', { name: /open site editor/i }))

    await waitFor(() => {
      expect(screen.getByText('SSO unavailable')).toBeInTheDocument()
    })
    expect(onError).toHaveBeenCalledWith(err, { step: 'sso-link' })
  })

  it('opens confirm dialog instead of window.confirm on delete click', async () => {
    const user = userEvent.setup()
    renderScreen()

    await user.click(screen.getByRole('button', { name: /delete this site/i }))

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText(/permanently delete/i)).toBeInTheDocument()
    expect(API.deleteSite).not.toHaveBeenCalled()
  })

  it('cancels delete when Cancel is clicked in dialog', async () => {
    const user = userEvent.setup()
    renderScreen()

    await user.click(screen.getByRole('button', { name: /delete this site/i }))
    await user.click(screen.getByRole('button', { name: /^cancel$/i }))

    expect(API.deleteSite).not.toHaveBeenCalled()
    // waitFor: MUI Dialog portal unmounts after exit animation completes
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
  })

  it('calls deleteSite and shows deleted state on confirm', async () => {
    const user = userEvent.setup()
    vi.mocked(API.deleteSite).mockResolvedValue(undefined)
    renderScreen()

    await user.click(screen.getByRole('button', { name: /delete this site/i }))
    await user.click(screen.getByRole('button', { name: /^delete$/i }))

    await waitFor(() => {
      expect(API.deleteSite).toHaveBeenCalledWith('test-site')
      expect(screen.getByText(/site deleted/i)).toBeInTheDocument()
    })
  })

  it('shows error alert when deleteSite fails', async () => {
    const user = userEvent.setup()
    const onError = vi.fn()
    const err = new Error('Delete failed')
    vi.mocked(API.deleteSite).mockRejectedValue(err)
    renderScreen(onError)

    await user.click(screen.getByRole('button', { name: /delete this site/i }))
    await user.click(screen.getByRole('button', { name: /^delete$/i }))

    await waitFor(() => {
      expect(screen.getByText('Delete failed')).toBeInTheDocument()
    })
    expect(onError).toHaveBeenCalledWith(err, { step: 'delete-site' })
  })
})
