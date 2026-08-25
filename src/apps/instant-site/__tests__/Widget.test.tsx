import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ThemeProvider, createTheme } from '@mui/material'
import Widget from '../Widget'

vi.mock('../api/api', () => ({
  API: {
    getTemplates: vi.fn().mockResolvedValue([]),
    generateSite: vi.fn(),
    pollTask: vi.fn(),
    createUser: vi.fn(),
    grantUserAccess: vi.fn(),
  },
}))

import { API } from '../api/api'

const MOCK_TEMPLATE = {
  template_id: 1,
  template_name: 'Bakery Template',
  template_alias: 'bakery',
  desktop_thumbnail_url: '',
  preview_url: '',
  editor: 'ADVANCED-2.0' as const,
  template_properties: { page_count: 1, has_blog: false, has_store: false },
}

const theme = createTheme({ palette: { mode: 'dark' } })

function renderWidget() {
  return render(
    <ThemeProvider theme={theme}>
      <Widget />
    </ThemeProvider>
  )
}

describe('Widget step machine', () => {
  it('starts at the start step (StepOne visible)', () => {
    renderWidget()
    expect(screen.getByText(/generate with ai/i)).toBeInTheDocument()
    expect(screen.getByText(/start from a template/i)).toBeInTheDocument()
  })

  it('navigates to ai-form when Generate with AI is clicked', async () => {
    const user = userEvent.setup()
    renderWidget()

    await user.click(screen.getByText(/generate with ai/i))

    expect(screen.getByText(/generate site with ai/i)).toBeInTheDocument()
  })

  it('navigates to template-picker when Start from a Template is clicked', async () => {
    const user = userEvent.setup()
    renderWidget()

    await user.click(screen.getByText(/start from a template/i))

    // Mock resolves immediately to [] so loading state is skipped — check heading
    expect(screen.getByRole('heading', { name: /choose a template/i })).toBeInTheDocument()
  })

  it('navigates back to start from ai-form', async () => {
    const user = userEvent.setup()
    renderWidget()

    await user.click(screen.getByText(/generate with ai/i))
    await user.click(screen.getByRole('button', { name: /back/i }))

    expect(screen.getByText(/generate with ai/i)).toBeInTheDocument()
  })
})

// The template-based path (template-picker → method-select → simple-form/
// ai-populate-form → success) was previously untested at this orchestration
// level, even though each step's own component has its own unit tests.
describe('Widget step machine — template-based path', () => {
  async function goToMethodSelect(user: ReturnType<typeof userEvent.setup>) {
    vi.mocked(API.getTemplates).mockResolvedValueOnce([MOCK_TEMPLATE])
    renderWidget()
    await user.click(screen.getByText(/start from a template/i))
    await waitFor(() => screen.getByText('Bakery Template'))
    await user.click(screen.getAllByRole('button', { name: /build/i })[0]!)
    await waitFor(() => screen.getByText(/how would you like to fill it/i))
  }

  it('navigates from template-picker to method-select with the chosen template', async () => {
    const user = userEvent.setup()
    await goToMethodSelect(user)
    expect(screen.getByText(/how would you like to fill it/i)).toBeInTheDocument()
    expect(screen.getByText('Bakery Template')).toBeInTheDocument()
  })

  it('navigates back from method-select to template-picker', async () => {
    const user = userEvent.setup()
    await goToMethodSelect(user)
    await user.click(screen.getByRole('button', { name: /back/i }))
    expect(screen.getByRole('heading', { name: /choose a template/i })).toBeInTheDocument()
  })

  it('navigates from method-select to simple-form on "Simple Instant Site"', async () => {
    const user = userEvent.setup()
    await goToMethodSelect(user)
    await user.click(screen.getByText(/simple instant site/i))
    expect(screen.getByText('Bakery Template')).toBeInTheDocument()
  })

  it('navigates back from simple-form to method-select, keeping the template', async () => {
    const user = userEvent.setup()
    await goToMethodSelect(user)
    await user.click(screen.getByText(/simple instant site/i))
    await user.click(screen.getByRole('button', { name: /back/i }))
    expect(screen.getByText(/how would you like to fill it/i)).toBeInTheDocument()
    expect(screen.getByText('Bakery Template')).toBeInTheDocument()
  })

  it('navigates from method-select to ai-populate-form on "AI Populate Template"', async () => {
    const user = userEvent.setup()
    await goToMethodSelect(user)
    await user.click(screen.getByText(/ai populate template/i))
    expect(screen.getByText('Bakery Template')).toBeInTheDocument()
  })

  it('navigates back from ai-populate-form to method-select, keeping the template', async () => {
    const user = userEvent.setup()
    await goToMethodSelect(user)
    await user.click(screen.getByText(/ai populate template/i))
    await user.click(screen.getByRole('button', { name: /back/i }))
    expect(screen.getByText(/how would you like to fill it/i)).toBeInTheDocument()
  })

  it('reaches the success step once a form flow calls onSuccess', async () => {
    // Driven through ai-populate-form since it has far fewer required
    // fields than simple-form — this test targets the step transition
    // itself, not form validation (already covered by AIForm's own tests).
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    vi.mocked(API.generateSite).mockResolvedValue({
      id: 'task-1', status: 'STARTED', type: 'generate-site-with-ai', created_at: '',
    })
    vi.mocked(API.pollTask).mockResolvedValue({
      id: 'task-1', status: 'COMPLETED', type: 'generate-site-with-ai', created_at: '',
      result: { site_name: 'bakery-site' },
    })
    vi.mocked(API.createUser).mockResolvedValue({ userId: 'user-1' })
    vi.mocked(API.grantUserAccess).mockResolvedValue(undefined)

    await goToMethodSelect(user)
    await user.click(screen.getByText(/ai populate template/i))

    await user.type(screen.getByLabelText(/Email Address \*/), 'me@example.com')
    await user.type(screen.getByLabelText(/First Name \*/), 'Jane')
    await user.type(screen.getByLabelText(/Business Name \*/), 'Acme Co')
    await user.type(screen.getByLabelText(/Business Description \*/), 'We do things.')
    await user.type(screen.getByLabelText(/Business Category \*/), 'Retail')
    await user.click(screen.getByRole('button', { name: /generate site/i }))

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000)
    })

    await waitFor(() => {
      expect(screen.getByText('bakery-site')).toBeInTheDocument()
    })
    expect(screen.getByText('user-1')).toBeInTheDocument()
  }, 15000)
})
