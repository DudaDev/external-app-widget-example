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
  TextField,
  Typography,
} from '@mui/material'
import { API, Template } from '../api/api'
import AccountFields from './AccountFields'
import BackButton from './BackButton'
import type { IndustryPreset } from '../testData'
import type { InstantSiteErrorContext } from '../types'

interface Props {
  template: Template
  onBack: () => void
  onSuccess: (siteName: string, userId: string) => void
  enablePresets?: boolean
  onError?: (err: unknown, context: InstantSiteErrorContext) => void
}

interface SiteForm {
  accountEmail: string
  firstName: string
  lastName: string
  phoneNumber: string
  emailAddress: string
  businessName: string
  streetAddress: string
  postalCode: string
  region: string
  city: string
  country: string
  logoUrl: string
  overview: string
  services: string
  aboutUs: string
  backgroundUrl: string
  businessDescription: string
}

const initialForm: SiteForm = {
  accountEmail: '',
  firstName: '',
  lastName: '',
  phoneNumber: '',
  emailAddress: '',
  businessName: '',
  streetAddress: '',
  postalCode: '',
  region: '',
  city: '',
  country: '',
  logoUrl: '',
  overview: '',
  services: '',
  aboutUs: '',
  backgroundUrl: '',
  businessDescription: '',
}

function checkFormCompletion(f: SiteForm): boolean {
  return !!(
    f.accountEmail &&
    f.firstName &&
    f.businessName &&
    f.streetAddress &&
    f.postalCode &&
    f.region &&
    f.city &&
    f.country &&
    f.logoUrl &&
    f.overview &&
    f.services &&
    f.aboutUs &&
    f.phoneNumber &&
    f.emailAddress
  )
}

export default function SimpleForm({ template, onBack, onSuccess, enablePresets = false, onError }: Props) {
  const [form, setForm] = useState<SiteForm>(initialForm)
  const [presetIndex, setPresetIndex] = useState('')
  const [presets, setPresets] = useState<IndustryPreset[]>([])
  useEffect(() => {
    if (!enablePresets) return
    import('../testData').then((m) => setPresets(m.INDUSTRY_PRESETS))
  }, [enablePresets])
  const [formCompleted, setFormCompleted] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState('')
  const [errored, setErrored] = useState(false)

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = e.target
    const updated = { ...form, [name]: value }
    setForm(updated)
    setFormCompleted(checkFormCompletion(updated))
  }

  function autofill(index: number) {
    const p = presets[index]
    if (!p) return
    const filled: SiteForm = {
      accountEmail: form.accountEmail,
      firstName: form.firstName,
      lastName: form.lastName,
      phoneNumber: p.phoneNumber,
      emailAddress: p.emailAddress,
      businessName: p.businessName,
      streetAddress: p.streetAddress,
      postalCode: p.postalCode,
      region: p.region,
      city: p.city,
      country: p.country,
      logoUrl: p.logoUrl,
      overview: p.overview,
      services: p.services,
      aboutUs: p.aboutUs,
      backgroundUrl: p.backgroundUrl,
      businessDescription: p.businessDescription,
    }
    setForm(filled)
    setFormCompleted(checkFormCompletion(filled))
  }

  async function handleSubmit() {
    setUpdating(true)
    setErrored(false)

    const contentLibrary = {
      label: form.businessName,
      location_data: {
        phones: [{ phoneNumber: form.phoneNumber, label: 'Business Phone' }],
        emails: [{ emailAddress: form.emailAddress, label: 'Business Email' }],
        label: form.businessName,
        address: {
          streetAddress: form.streetAddress,
          postalCode: form.postalCode,
          region: form.region,
          city: form.city,
          country: form.country,
        },
        logo_url: form.logoUrl,
      },
      business_data: {
        name: form.businessName,
        logo_url: form.logoUrl,
      },
      site_images: [
        { label: 'Background', url: form.backgroundUrl, alt: 'Site Background' },
      ],
      site_texts: {
        overview: form.overview,
        services: form.services,
        about_us: form.aboutUs,
        custom: [{ label: 'Business Description', text: form.businessDescription }],
      },
    }

    try {
      setStatus(`Creating a site using template: ${template.template_name}`)
      setProgress(10)

      const { siteName } = await API.createSite(template.template_alias)
      setStatus(`Site created: ${siteName}`)
      setProgress(30)

      await API.updateContent(siteName, contentLibrary)
      setStatus('Content updated.')
      setProgress(50)

      const { userId } = await API.createUser(form.accountEmail, form.firstName, form.lastName)
      setStatus(`Account ready: ${userId}`)
      setProgress(80)

      await API.grantUserAccess(userId, siteName)
      setProgress(100)
      onSuccess(siteName, userId)
    } catch (err: unknown) {
      setErrored(true)
      setStatus(err instanceof Error ? err.message : 'An error occurred.')
      onError?.(err, { step: 'submit' })
    } finally {
      setUpdating(false)
    }
  }

  return (
    <Box sx={{ mb: '30px', color: 'white', width: '100%' }}>
      <BackButton onClick={onBack} />
      <Grid container>

        {/* Row 1: Header | Status */}
        <Grid size={6}>
          <Typography variant="h4">Simple Instant Site</Typography>
          <Typography variant="body1">
            Template: <strong>{template.template_name}</strong>
          </Typography>
        </Grid>
        <Grid size={6} sx={{ pt: '20px' }}>
          {updating && (
            <>
              <Typography variant="body1">{status}</Typography>
              <LinearProgress variant="determinate" value={progress} sx={{ mt: '10px' }} />
            </>
          )}
          {errored && (
            <Typography variant="body1" sx={{ color: '#f44336' }}>{status}</Typography>
          )}
        </Grid>

        {/* Row 2: Autofill | Create Site */}
        <Grid size={4} sx={{ mt: '30px', display: 'flex', alignItems: 'center', gap: 2 }}>
          {presets.length > 0 && (
            <FormControl size="small" sx={{ minWidth: 180 }} disabled={updating}>
              <InputLabel>Fill with example…</InputLabel>
              <Select
                label="Fill with example…"
                value={presetIndex}
                onChange={(e) => { setPresetIndex(e.target.value); autofill(Number(e.target.value)) }}
              >
                {presets.map((p, i) => (
                  <MenuItem key={i} value={i}>{p.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
        </Grid>
        <Grid size={8} sx={{ mt: '30px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={!formCompleted || updating}
          >
            {updating ? <CircularProgress size="1em" color="inherit" /> : 'Create Site'}
          </Button>
        </Grid>

        <AccountFields
          accountEmail={form.accountEmail}
          firstName={form.firstName}
          lastName={form.lastName}
          onChange={handleChange}
          disabled={updating}
        />

        {/* Row 3: Business Details + Contact | Address */}
        <Grid size={6} sx={{ pr: '30px', mb: '10px' }}>
          <Typography variant="h6" sx={{ mt: '30px', mb: '10px' }}>Business Details</Typography>
          <TextField onChange={handleChange} variant="filled" value={form.businessName} disabled={updating} name="businessName" label="Business Name *" fullWidth />
          <TextField onChange={handleChange} variant="filled" value={form.overview} disabled={updating} multiline maxRows={4} rows={4} name="overview" label="Overview *" fullWidth />
          <TextField onChange={handleChange} variant="filled" value={form.aboutUs} disabled={updating} multiline maxRows={4} rows={4} name="aboutUs" label="About Us *" fullWidth />
          <TextField onChange={handleChange} variant="filled" value={form.services} disabled={updating} multiline maxRows={4} rows={4} name="services" label="Services *" fullWidth />
          <Typography variant="h6" sx={{ mt: '30px', mb: '10px' }}>Contact Information</Typography>
          <TextField onChange={handleChange} variant="filled" value={form.phoneNumber} disabled={updating} name="phoneNumber" label="Phone Number *" placeholder="8008675309" fullWidth />
          <TextField onChange={handleChange} variant="filled" value={form.emailAddress} disabled={updating} name="emailAddress" label="Business Email *" placeholder="sales@company.site" fullWidth />
        </Grid>

        <Grid size={6}>
          <Typography variant="h6" sx={{ mt: '30px', mb: '10px' }}>Address</Typography>
          <TextField onChange={handleChange} variant="filled" value={form.streetAddress} disabled={updating} name="streetAddress" label="Street *" fullWidth />
          <TextField onChange={handleChange} variant="filled" value={form.city} disabled={updating} name="city" label="City *" fullWidth />
          <TextField onChange={handleChange} variant="filled" value={form.region} disabled={updating} name="region" label="State / Region *" fullWidth />
          <TextField onChange={handleChange} variant="filled" value={form.country} disabled={updating} name="country" label="Country *" fullWidth />
          <TextField onChange={handleChange} variant="filled" value={form.postalCode} disabled={updating} name="postalCode" label="Postal Code *" fullWidth />
          <Typography variant="h6" sx={{ mt: '30px', mb: '10px' }}>Content</Typography>
          <TextField onChange={handleChange} variant="filled" value={form.backgroundUrl} disabled={updating} name="backgroundUrl" label="Background Image URL" placeholder="https://files.host/background.jpg" fullWidth />
          <TextField onChange={handleChange} variant="filled" value={form.logoUrl} disabled={updating} name="logoUrl" label="Logo Image URL *" placeholder="https://files.host/logo.png" fullWidth />
          <TextField onChange={handleChange} variant="filled" value={form.businessDescription} disabled={updating} multiline maxRows={4} rows={4} name="businessDescription" label="Description" fullWidth />
        </Grid>

      </Grid>
    </Box>
  )
}
