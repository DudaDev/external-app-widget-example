import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ThemeProvider, createTheme } from '@mui/material'
import SimpleForm from '../components/SimpleForm'
import type { Template } from '../api/api'

vi.mock('../api/api', () => ({
  API: {
    createSite: vi.fn(),
    updateContent: vi.fn(),
    createUser: vi.fn(),
    grantUserAccess: vi.fn(),
  },
}))

import { API } from '../api/api'

const theme = createTheme({ palette: { mode: 'dark' } })

const TEMPLATE: Template = {
  template_id: 1,
  template_name: 'Test Template',
  template_alias: 'test-template',
  desktop_thumbnail_url: '',
  preview_url: '',
  editor: 'ADVANCED-2.0',
  template_properties: { page_count: 1, has_blog: false, has_store: false },
}

function renderForm(onSuccess = vi.fn(), enablePresets = false, onError?: (err: unknown, context: unknown) => void) {
  const onBack = vi.fn()
  render(
    <ThemeProvider theme={theme}>
      <SimpleForm
        template={TEMPLATE}
        onBack={onBack}
        onSuccess={onSuccess}
        enablePresets={enablePresets}
        onError={onError}
      />
    </ThemeProvider>
  )
  return { onBack, onSuccess }
}

const REQUIRED_FIELDS: Array<[RegExp, string]> = [
  [/Email Address \*/, 'me@example.com'],
  [/First Name \*/, 'Jane'],
  [/Business Name \*/, 'Acme Co'],
  [/Street \*/, '123 Main St'],
  [/Postal Code \*/, '90210'],
  [/State \/ Region \*/, 'CA'],
  [/City \*/, 'Beverly Hills'],
  [/Country \*/, 'US'],
  [/Logo Image URL \*/, 'https://files.host/logo.png'],
  [/Overview \*/, 'We do things.'],
  [/Services \*/, 'Things'],
  [/About Us \*/, 'About us.'],
  [/Phone Number \*/, '8008675309'],
  [/Business Email \*/, 'sales@acme.com'],
]

async function fillRequiredFields(user: ReturnType<typeof userEvent.setup>) {
  for (const [label, value] of REQUIRED_FIELDS) {
    await user.type(screen.getByLabelText(label), value)
  }
}

afterEach(() => {
  vi.clearAllMocks()
})

describe('SimpleForm', () => {
  it('disables Create Site until all required fields are filled', async () => {
    const user = userEvent.setup()
    renderForm()
    const button = screen.getByRole('button', { name: /create site/i })
    expect(button).toBeDisabled()
    await fillRequiredFields(user)
    expect(button).toBeEnabled()
  }, 15000) // 14 fields typed keystroke-by-keystroke is slow under full-suite load

  it('runs create site → update content → create user → grant access in order, then calls onSuccess', async () => {
    const user = userEvent.setup()
    vi.mocked(API.createSite).mockResolvedValue({ siteName: 'new-site' })
    vi.mocked(API.updateContent).mockResolvedValue({ status: 'ok' })
    vi.mocked(API.createUser).mockResolvedValue({ userId: 'user-1' })
    vi.mocked(API.grantUserAccess).mockResolvedValue(undefined)
    const { onSuccess } = renderForm()

    await fillRequiredFields(user)
    await user.click(screen.getByRole('button', { name: /create site/i }))

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledWith('new-site', 'user-1')
    })

    // Regression test: Duda's create-site endpoint takes template_alias, not
    // the numeric template_id — sending the numeric id there 400s live
    // ("'template_alias' does not exist"), confirmed directly against the
    // real API.
    expect(API.createSite).toHaveBeenCalledWith('test-template')
    expect(API.updateContent).toHaveBeenCalledWith('new-site', expect.objectContaining({ label: 'Acme Co' }))
    expect(API.createUser).toHaveBeenCalledWith('me@example.com', 'Jane', '')
    expect(API.grantUserAccess).toHaveBeenCalledWith('user-1', 'new-site')
  }, 15000)

  it('shows an error and does not call onSuccess when a step fails', async () => {
    const user = userEvent.setup()
    vi.mocked(API.createSite).mockRejectedValue(new Error('Duda API down'))
    const { onSuccess } = renderForm()

    await fillRequiredFields(user)
    await user.click(screen.getByRole('button', { name: /create site/i }))

    await waitFor(() => {
      expect(screen.getByText('Duda API down')).toBeInTheDocument()
    })
    expect(onSuccess).not.toHaveBeenCalled()
    expect(API.updateContent).not.toHaveBeenCalled()
  }, 15000)

  it('reports a step failure via onError, matching the other apps\' onError convention', async () => {
    const user = userEvent.setup()
    const err = new Error('Duda API down')
    vi.mocked(API.createSite).mockRejectedValue(err)
    const onError = vi.fn()
    renderForm(vi.fn(), false, onError)

    await fillRequiredFields(user)
    await user.click(screen.getByRole('button', { name: /create site/i }))

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith(err, { step: 'submit' })
    })
  }, 15000)
})

describe('SimpleForm presets (enablePresets)', () => {
  it('does not show the preset dropdown when enablePresets is false', () => {
    renderForm(vi.fn(), false)
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
  })

  it('autofills the form fields when a preset is selected', async () => {
    const user = userEvent.setup()
    renderForm(vi.fn(), true)

    // The preset Select isn't wired with labelId/aria-labelledby, so it has
    // no accessible name to query by — it's the only combobox on this form.
    const trigger = await screen.findByRole('combobox')
    await user.click(trigger)
    await user.click(await screen.findByRole('option', { name: /artisan bakery/i }))

    expect(screen.getByLabelText(/Business Name \*/)).toHaveValue('Sunrise Bakery')
    expect(screen.getByLabelText(/Street \*/)).toHaveValue('42 Maple Avenue')
    expect(screen.getByLabelText(/City \*/)).toHaveValue('Portland')
    // accountEmail/firstName/lastName are not part of the preset — they stay
    // whatever the person already typed in the Account section.
    expect(screen.getByLabelText(/Email Address \*/)).toHaveValue('')
  })
})
