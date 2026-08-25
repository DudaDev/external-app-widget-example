import { useEffect, useState } from 'react'
import {
  Box,
  Button,
  CircularProgress,
  FormControl,
  Grid,
  InputLabel,
  LinearProgress,
  MenuItem,
  Select,
  SelectChangeEvent,
  TextField,
  Typography,
} from '@mui/material'
import { GenerateSiteInput, Template } from '../api/api'
import AccountFields from './AccountFields'
import BackButton from './BackButton'
import { useSiteGenerationPolling } from '../hooks/useSiteGenerationPolling'
import type { IndustryPreset } from '../testData'
import type { InstantSiteErrorContext } from '../types'

const TONE_OPTIONS = [
  'CONVERSATIONAL',
  'HUMOROUS',
  'ENTHUSIASTIC',
  'INFORMATIVE',
  'PROFESSIONAL',
  'WITTY',
  'AUTHORITATIVE',
] as const

type ToneOfVoice = (typeof TONE_OPTIONS)[number]

const PALETTES: { label: string; colors: { id: string; label: string; value: string }[] }[] = [
  { label: 'Default (no override)', colors: [] },
  {
    label: 'Ocean Blue',
    colors: [
      { id: 'color_1', label: 'Primary', value: '#1a5276' },
      { id: 'color_2', label: 'Secondary', value: '#2980b9' },
      { id: 'color_3', label: 'Accent', value: '#85c1e9' },
    ],
  },
  {
    label: 'Forest Green',
    colors: [
      { id: 'color_1', label: 'Primary', value: '#1e8449' },
      { id: 'color_2', label: 'Secondary', value: '#27ae60' },
      { id: 'color_3', label: 'Accent', value: '#a9dfbf' },
    ],
  },
  {
    label: 'Warm Terracotta',
    colors: [
      { id: 'color_1', label: 'Primary', value: '#c0392b' },
      { id: 'color_2', label: 'Secondary', value: '#e74c3c' },
      { id: 'color_3', label: 'Accent', value: '#f1948a' },
    ],
  },
  {
    label: 'Deep Purple',
    colors: [
      { id: 'color_1', label: 'Primary', value: '#6c3483' },
      { id: 'color_2', label: 'Secondary', value: '#9b59b6' },
      { id: 'color_3', label: 'Accent', value: '#d2b4de' },
    ],
  },
  {
    label: 'Golden Sunrise',
    colors: [
      { id: 'color_1', label: 'Primary', value: '#d4ac0d' },
      { id: 'color_2', label: 'Secondary', value: '#f39c12' },
      { id: 'color_3', label: 'Accent', value: '#fad7a0' },
    ],
  },
]

interface FormState {
  accountEmail: string
  firstName: string
  lastName: string
  businessName: string
  businessDescription: string
  businessCategory: string
  phoneNumber: string
  email: string
  street: string
  city: string
  state: string
  country: string
  zipCode: string
  logoUrl: string
  serviceArea: string
  toneOfVoice: ToneOfVoice | ''
  instructions: string
  maxPages: string
  paletteIndex: number
}

const initialForm: FormState = {
  accountEmail: '',
  firstName: '',
  lastName: '',
  businessName: '',
  businessDescription: '',
  businessCategory: '',
  phoneNumber: '',
  email: '',
  street: '',
  city: '',
  state: '',
  country: '',
  zipCode: '',
  logoUrl: '',
  serviceArea: '',
  toneOfVoice: '',
  instructions: '',
  maxPages: '',
  paletteIndex: 0,
}

function isFormValid(form: FormState): boolean {
  return !!(form.businessName && form.businessDescription && form.businessCategory && form.accountEmail && form.firstName)
}

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

interface Props {
  mode: 'scratch' | 'populate'
  template?: Template
  onBack: () => void
  onSuccess: (siteName: string, userId: string) => void
  enablePresets?: boolean
  onError?: (err: unknown, context: InstantSiteErrorContext) => void
}

export default function AIForm({ mode, template, onBack, onSuccess, enablePresets = false, onError }: Props) {
  const method = mode === 'scratch' ? 'ai' : 'populate'

  const [form, setForm] = useState<FormState>(initialForm)
  const [presetIndex, setPresetIndex] = useState('')
  const { generating, elapsed, error, generate } = useSiteGenerationPolling(onSuccess, onError)

  const [presets, setPresets] = useState<IndustryPreset[]>([])
  useEffect(() => {
    if (!enablePresets) return
    import('../testData').then((m) => setPresets(m.INDUSTRY_PRESETS))
  }, [enablePresets])

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  function autofill(index: number) {
    const p = presets[index]
    if (!p) return
    setForm({
      accountEmail: form.accountEmail,
      firstName: form.firstName,
      lastName: form.lastName,
      businessName: p.businessName,
      businessDescription: p.businessDescription,
      businessCategory: p.businessCategory,
      phoneNumber: p.phoneNumber,
      email: p.emailAddress,
      street: p.streetAddress,
      city: p.city,
      state: p.region,
      country: p.country,
      zipCode: p.postalCode,
      logoUrl: p.logoUrl,
      serviceArea: p.serviceArea,
      toneOfVoice: p.toneOfVoice as ToneOfVoice,
      instructions: p.instructions,
      maxPages: p.maxPages,
      paletteIndex: p.paletteIndex,
    })
  }

  function handleGenerate() {
    const themeColors = PALETTES[form.paletteIndex]?.colors ?? []
    const input: GenerateSiteInput = {
      method,
      businessName: form.businessName,
      businessDescription: form.businessDescription,
      businessCategory: form.businessCategory,
      ...(form.phoneNumber && { phoneNumber: form.phoneNumber }),
      ...(form.email && { email: form.email }),
      ...(form.street && { street: form.street }),
      ...(form.city && { city: form.city }),
      ...(form.state && { state: form.state }),
      ...(form.country && { country: form.country }),
      ...(form.zipCode && { zipCode: form.zipCode }),
      ...(form.logoUrl && { logoUrl: form.logoUrl }),
      ...(form.serviceArea && { serviceArea: form.serviceArea }),
      ...(form.toneOfVoice && { toneOfVoice: form.toneOfVoice }),
      ...(method === 'populate' && template && { templateAlias: template.template_alias }),
      ...(form.instructions && { instructions: form.instructions }),
      ...(method === 'ai' && form.maxPages && { maxPages: Number(form.maxPages) }),
      ...(themeColors.length > 0 && { themeColors }),
    }
    generate(input, { email: form.accountEmail, firstName: form.firstName, lastName: form.lastName })
  }

  const formValid = isFormValid(form)

  return (
    <Box sx={{ mb: '30px', color: 'white', width: '100%' }}>
      <BackButton onClick={onBack} />
      <Grid container>

        {/* Row 1: Header | Status */}
        <Grid size={6}>
          <Typography variant="h4">
            {mode === 'scratch' ? 'Generate Site with AI' : 'AI Populate Template'}
          </Typography>
          <Typography variant="body1">
            {mode === 'scratch'
              ? 'Provide your business details and let AI build a site for you.'
              : <><span>Template: </span><strong>{template?.template_name}</strong></>}
          </Typography>
        </Grid>
        <Grid size={6} sx={{ pt: '20px' }}>
          {generating && (
            <>
              <Typography variant="body1">
                Generating your site… ({formatElapsed(elapsed)})
              </Typography>
              <LinearProgress sx={{ mt: '10px' }} />
              <Typography variant="body2" sx={{ mt: '8px', opacity: 0.7 }}>
                This can take up to 5 minutes.
              </Typography>
            </>
          )}
          {error && (
            <Typography variant="body1" sx={{ color: '#f44336' }}>{error}</Typography>
          )}
        </Grid>

        {/* Row 2: Autofill | Generate */}
        <Grid size={6} sx={{ mt: '30px', display: 'flex', alignItems: 'center', gap: 2 }}>
          {presets.length > 0 && (
            <FormControl size="small" sx={{ minWidth: 180 }} disabled={generating}>
              <InputLabel>Fill with example…</InputLabel>
              <Select
                label="Fill with example…"
                value={presetIndex}
                onChange={(e: SelectChangeEvent) => { setPresetIndex(e.target.value); autofill(Number(e.target.value)) }}
              >
                {presets.map((p, i) => (
                  <MenuItem key={i} value={i}>{p.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
        </Grid>
        <Grid size={6} sx={{ mt: '30px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
          <Button
            onClick={handleGenerate}
            variant="contained"
            disabled={!formValid || generating}
          >
            {generating ? <CircularProgress size="1em" color="inherit" /> : 'Generate Site'}
          </Button>
        </Grid>

        <AccountFields
          accountEmail={form.accountEmail}
          firstName={form.firstName}
          lastName={form.lastName}
          onChange={handleChange}
          disabled={generating}
        />

        {/* Row 3: Business Details + Contact | Address */}
        <Grid size={6} sx={{ pr: '30px', mb: '10px' }}>
          <Typography variant="h6" sx={{ mt: '30px', mb: '10px' }}>Business Details</Typography>
          <TextField onChange={handleChange} variant="filled" name="businessName" label="Business Name *" value={form.businessName} disabled={generating} fullWidth />
          <TextField onChange={handleChange} variant="filled" name="businessDescription" label="Business Description *" value={form.businessDescription} disabled={generating} multiline rows={4} fullWidth />
          <TextField onChange={handleChange} variant="filled" name="businessCategory" label="Business Category *" value={form.businessCategory} disabled={generating} placeholder="e.g. Restaurant, Retail, Healthcare" fullWidth />
          {mode === 'scratch' && (
            <TextField onChange={handleChange} variant="filled" name="maxPages" label="Max Pages (1–10)" type="number" value={form.maxPages} disabled={generating} slotProps={{ htmlInput: { min: 1, max: 10 } }} fullWidth />
          )}
          <Typography variant="h6" sx={{ mt: '30px', mb: '10px' }}>Contact Information</Typography>
          <TextField onChange={handleChange} variant="filled" name="phoneNumber" label="Phone Number" value={form.phoneNumber} disabled={generating} fullWidth />
          <TextField onChange={handleChange} variant="filled" name="email" label="Business Email" value={form.email} disabled={generating} fullWidth />
        </Grid>

        <Grid size={6}>
          <Typography variant="h6" sx={{ mt: '30px', mb: '10px' }}>Address</Typography>
          <TextField onChange={handleChange} variant="filled" name="street" label="Street" value={form.street} disabled={generating} fullWidth />
          <TextField onChange={handleChange} variant="filled" name="city" label="City" value={form.city} disabled={generating} fullWidth />
          <TextField onChange={handleChange} variant="filled" name="state" label="State / Region" value={form.state} disabled={generating} fullWidth />
          <TextField onChange={handleChange} variant="filled" name="country" label="Country" value={form.country} disabled={generating} fullWidth />
          <TextField onChange={handleChange} variant="filled" name="zipCode" label="Postal Code" value={form.zipCode} disabled={generating} fullWidth />
        </Grid>

        {/* Row 4: AI Options | Additional Instructions (populate only) */}
        <Grid size={6} sx={{ pr: '30px', mb: '10px' }}>
          <Typography variant="h6" sx={{ mt: '30px', mb: '10px' }}>AI Options</Typography>
          <TextField onChange={handleChange} variant="filled" name="logoUrl" label="Logo Image URL" value={form.logoUrl} disabled={generating} placeholder="https://files.host/logo.png" fullWidth />
          <TextField onChange={handleChange} variant="filled" name="serviceArea" label="Service Area" value={form.serviceArea} disabled={generating} placeholder="e.g. Greater New York metro area" fullWidth />
          <FormControl variant="filled" fullWidth sx={{ mt: 1 }}>
            <InputLabel>Tone of Voice</InputLabel>
            <Select
              value={form.toneOfVoice}
              onChange={(e: SelectChangeEvent) =>
                setForm((prev) => ({ ...prev, toneOfVoice: e.target.value as ToneOfVoice | '' }))
              }
              disabled={generating}
              sx={{ color: 'white', '& .MuiSelect-icon': { color: 'white' } }}
            >
              <MenuItem value=""><em>No preference</em></MenuItem>
              {TONE_OPTIONS.map((tone) => (
                <MenuItem key={tone} value={tone}>
                  {tone.charAt(0) + tone.slice(1).toLowerCase()}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl variant="filled" fullWidth sx={{ mt: 1 }}>
            <InputLabel>Color Palette</InputLabel>
            <Select
              value={String(form.paletteIndex)}
              onChange={(e: SelectChangeEvent) =>
                setForm((prev) => ({ ...prev, paletteIndex: Number(e.target.value) }))
              }
              disabled={generating}
              sx={{ color: 'white', '& .MuiSelect-icon': { color: 'white' } }}
            >
              {PALETTES.map((p, i) => (
                <MenuItem key={i} value={String(i)}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {p.colors.map((c) => (
                      <Box
                        key={c.id}
                        sx={{ width: 16, height: 16, borderRadius: '50%', backgroundColor: c.value, border: '1px solid rgba(255,255,255,0.3)' }}
                      />
                    ))}
                    {p.label}
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        {mode === 'populate' && (
          <Grid size={6}>
            <Typography variant="h6" sx={{ mt: '30px', mb: '10px' }}>Additional Instructions</Typography>
            <TextField
              onChange={handleChange}
              variant="filled"
              name="instructions"
              label="Instructions for AI"
              value={form.instructions}
              disabled={generating}
              multiline
              rows={8}
              fullWidth
              placeholder="e.g. Include a gallery section, use a dark color scheme, focus on mobile customers…"
            />
          </Grid>
        )}

      </Grid>
    </Box>
  )
}
