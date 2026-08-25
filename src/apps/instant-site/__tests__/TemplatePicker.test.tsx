import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ThemeProvider, createTheme } from '@mui/material'
import TemplatePicker from '../components/TemplatePicker'

vi.mock('../api/api', () => ({
  API: {
    getTemplates: vi.fn(),
  },
}))

import { API, type Template } from '../api/api'

const theme = createTheme({ palette: { mode: 'dark' } })

const MOCK_TEMPLATES: Template[] = [
  {
    template_id: 1,
    template_name: 'Bakery Template',
    template_alias: 'bakery',
    desktop_thumbnail_url: '',
    preview_url: 'https://preview.duda.co/bakery',
    editor: 'ADVANCED-2.0',
    template_properties: { page_count: 3, has_blog: false, has_store: false },
  },
  {
    template_id: 2,
    template_name: 'Law Firm Template',
    template_alias: 'law-firm',
    desktop_thumbnail_url: '',
    preview_url: 'https://preview.duda.co/law-firm',
    editor: 'ADVANCED-2.0',
    template_properties: { page_count: 5, has_blog: true, has_store: false },
  },
]

function renderPicker(onBack = vi.fn(), onSelect = vi.fn(), onError = vi.fn()) {
  return render(
    <ThemeProvider theme={theme}>
      <TemplatePicker onBack={onBack} onSelect={onSelect} onError={onError} />
    </ThemeProvider>
  )
}

afterEach(() => {
  vi.clearAllMocks()
})

describe('TemplatePicker', () => {
  it('shows loading state on mount', () => {
    vi.mocked(API.getTemplates).mockReturnValue(new Promise(() => {}))
    renderPicker()
    expect(screen.getByRole('progressbar')).toBeInTheDocument()
  })

  it('renders template names after fetch resolves', async () => {
    vi.mocked(API.getTemplates).mockResolvedValue(MOCK_TEMPLATES)
    renderPicker()

    await waitFor(() => {
      expect(screen.getByText('Bakery Template')).toBeInTheDocument()
      expect(screen.getByText('Law Firm Template')).toBeInTheDocument()
    })
  })

  it('shows error state when fetch rejects', async () => {
    vi.mocked(API.getTemplates).mockRejectedValue(new Error('Network error'))
    renderPicker()

    await waitFor(() => {
      expect(screen.getByText(/network error/i)).toBeInTheDocument()
    })
  })

  it('calls onSelect with the correct template when Build is clicked', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    vi.mocked(API.getTemplates).mockResolvedValue(MOCK_TEMPLATES)
    renderPicker(vi.fn(), onSelect)

    await waitFor(() => screen.getByText('Bakery Template'))

    await user.click(screen.getAllByRole('button', { name: /build/i })[0]!)

    expect(onSelect).toHaveBeenCalledWith(MOCK_TEMPLATES[0])
  })

  it('calls onBack when back button is clicked', async () => {
    const user = userEvent.setup()
    const onBack = vi.fn()
    vi.mocked(API.getTemplates).mockResolvedValue(MOCK_TEMPLATES)
    renderPicker(onBack)

    await user.click(screen.getByRole('button', { name: /back/i }))
    expect(onBack).toHaveBeenCalled()
  })

  it('reports a fetch failure via onError, matching the other apps\' onError convention', async () => {
    const onError = vi.fn()
    const err = new Error('Network error')
    vi.mocked(API.getTemplates).mockRejectedValue(err)
    renderPicker(vi.fn(), vi.fn(), onError)

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith(err, { step: 'templates' })
    })
  })
})
