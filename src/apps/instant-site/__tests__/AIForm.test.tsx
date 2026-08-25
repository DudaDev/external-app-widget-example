import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ThemeProvider, createTheme } from '@mui/material'
import AIForm from '../components/AIForm'

vi.mock('../api/api', () => ({
  API: {
    generateSite: vi.fn(),
    pollTask: vi.fn(),
    createUser: vi.fn(),
    grantUserAccess: vi.fn(),
  },
}))

import { API } from '../api/api'

const theme = createTheme({ palette: { mode: 'dark' } })

function renderForm(onSuccess = vi.fn(), enablePresets = false, onError?: (err: unknown, context: unknown) => void) {
  const onBack = vi.fn()
  render(
    <ThemeProvider theme={theme}>
      <AIForm
        mode="scratch"
        onBack={onBack}
        onSuccess={onSuccess}
        enablePresets={enablePresets}
        onError={onError}
      />
    </ThemeProvider>
  )
  return { onBack, onSuccess }
}

async function fillRequiredFields(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/Email Address \*/), 'me@example.com')
  await user.type(screen.getByLabelText(/First Name \*/), 'Jane')
  await user.type(screen.getByLabelText(/Business Name \*/), 'Acme Co')
  await user.type(screen.getByLabelText(/Business Description \*/), 'We do things.')
  await user.type(screen.getByLabelText(/Business Category \*/), 'Retail')
}

afterEach(() => {
  vi.clearAllMocks()
  vi.useRealTimers()
})

describe('AIForm', () => {
  it('disables Generate Site until the required fields are filled', async () => {
    const user = userEvent.setup()
    renderForm()
    const button = screen.getByRole('button', { name: /generate site/i })
    expect(button).toBeDisabled()
    await fillRequiredFields(user)
    expect(button).toBeEnabled()
  })

  it('starts a task, polls until COMPLETED, then creates the user and grants access', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    vi.mocked(API.generateSite).mockResolvedValue({
      id: 'task-1', status: 'STARTED', type: 'generate-site-with-ai', created_at: '',
    })
    vi.mocked(API.pollTask).mockResolvedValue({
      id: 'task-1', status: 'COMPLETED', type: 'generate-site-with-ai', created_at: '',
      result: { site_name: 'ai-site' },
    })
    vi.mocked(API.createUser).mockResolvedValue({ userId: 'user-1' })
    vi.mocked(API.grantUserAccess).mockResolvedValue(undefined)
    const { onSuccess } = renderForm()

    await fillRequiredFields(user)
    await user.click(screen.getByRole('button', { name: /generate site/i }))
    await waitFor(() => expect(API.generateSite).toHaveBeenCalled())

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000)
    })

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledWith('ai-site', 'user-1')
    })
    // Snapshotted at Generate-click time, not read fresh at poll-completion time.
    expect(API.createUser).toHaveBeenCalledWith('me@example.com', 'Jane', '')
    expect(API.grantUserAccess).toHaveBeenCalledWith('user-1', 'ai-site')
  })

  it('stops polling and shows an error when the task reports FAILED', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    vi.mocked(API.generateSite).mockResolvedValue({
      id: 'task-1', status: 'STARTED', type: 'generate-site-with-ai', created_at: '',
    })
    vi.mocked(API.pollTask).mockResolvedValue({
      id: 'task-1', status: 'FAILED', type: 'generate-site-with-ai', created_at: '',
    })
    renderForm()

    await fillRequiredFields(user)
    await user.click(screen.getByRole('button', { name: /generate site/i }))
    await waitFor(() => expect(API.generateSite).toHaveBeenCalled())

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000)
    })

    await waitFor(() => {
      expect(screen.getByText(/site generation failed/i)).toBeInTheDocument()
    })

    const callsAfterFailure = vi.mocked(API.pollTask).mock.calls.length
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000)
    })
    expect(vi.mocked(API.pollTask).mock.calls.length).toBe(callsAfterFailure)
  })

  it('stops polling and shows the error message when a poll request itself rejects', async () => {
    // Distinct from the FAILED-status case above: this is pollTask() itself
    // throwing (a network error mid-poll), not the task reporting failure.
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    const onError = vi.fn()
    vi.mocked(API.generateSite).mockResolvedValue({
      id: 'task-1', status: 'STARTED', type: 'generate-site-with-ai', created_at: '',
    })
    const pollErr = new Error('network down')
    vi.mocked(API.pollTask).mockRejectedValue(pollErr)
    renderForm(vi.fn(), false, onError)

    await fillRequiredFields(user)
    await user.click(screen.getByRole('button', { name: /generate site/i }))
    await waitFor(() => expect(API.generateSite).toHaveBeenCalled())

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000)
    })

    await waitFor(() => {
      expect(screen.getByText('network down')).toBeInTheDocument()
    })
    expect(onError).toHaveBeenCalledWith(pollErr, { step: 'poll' })

    const callsAfterFailure = vi.mocked(API.pollTask).mock.calls.length
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000)
    })
    expect(vi.mocked(API.pollTask).mock.calls.length).toBe(callsAfterFailure)
  })

  it('shows an error message when starting generation fails, without polling', async () => {
    const user = userEvent.setup()
    const onError = vi.fn()
    const err = new Error('Could not start')
    vi.mocked(API.generateSite).mockRejectedValue(err)
    renderForm(vi.fn(), false, onError)

    await fillRequiredFields(user)
    await user.click(screen.getByRole('button', { name: /generate site/i }))

    await waitFor(() => {
      expect(screen.getByText('Could not start')).toBeInTheDocument()
    })
    expect(API.pollTask).not.toHaveBeenCalled()
    expect(onError).toHaveBeenCalledWith(err, { step: 'generate' })
  })
})

describe('AIForm presets (enablePresets)', () => {
  it('does not show the preset dropdown when enablePresets is false', () => {
    renderForm(vi.fn(), false)
    expect(screen.queryByText(/fill with example/i)).not.toBeInTheDocument()
  })

  it('autofills the form fields when a preset is selected', async () => {
    const user = userEvent.setup()
    renderForm(vi.fn(), true)

    // Tone of Voice/Color Palette selects are always present, so there are
    // 2 comboboxes before presets loads (async) and 3 after — wait for the
    // third. Presets renders before those two in DOM order, and none of the
    // three are wired with an accessible name, so it's picked out by
    // position once all three are present, not by role name.
    await waitFor(() => expect(screen.getAllByRole('combobox')).toHaveLength(3))
    const trigger = screen.getAllByRole('combobox')[0]!
    await user.click(trigger)
    await user.click(await screen.findByRole('option', { name: /artisan bakery/i }))

    expect(screen.getByLabelText(/Business Name \*/)).toHaveValue('Sunrise Bakery')
    expect(screen.getByLabelText(/Business Description \*/)).toHaveValue(
      'Artisan bakery open 7 days a week, specializing in sourdough and seasonal pastries.'
    )
    expect(screen.getByLabelText(/Business Category \*/)).toHaveValue('Food & Beverage')
    // accountEmail/firstName are not part of the preset — untouched.
    expect(screen.getByLabelText(/Email Address \*/)).toHaveValue('')
  })
})
