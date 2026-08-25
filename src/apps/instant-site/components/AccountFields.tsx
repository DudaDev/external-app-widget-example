import { Divider, Grid, TextField, Typography } from '@mui/material'

interface Props {
  accountEmail: string
  firstName: string
  lastName: string
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void
  disabled: boolean
}

// Identical in SimpleForm and AIForm — both collect the same editor-account
// fields before handing off to API.createUser.
export default function AccountFields({ accountEmail, firstName, lastName, onChange, disabled }: Props) {
  return (
    <Grid size={12} sx={{ mt: '20px' }}>
      <Divider sx={{ borderColor: 'rgba(255,255,255,0.2)', mb: '20px' }} />
      <Typography variant="h6" sx={{ mb: '10px' }}>Your Account</Typography>
      <Grid container spacing={2}>
        <Grid size={6}>
          <TextField
            onChange={onChange}
            variant="filled"
            value={accountEmail}
            disabled={disabled}
            name="accountEmail"
            label="Email Address *"
            type="email"
            placeholder="you@example.com"
            helperText="Used to create or log in to your site editor account."
            fullWidth
          />
        </Grid>
        <Grid size={3}>
          <TextField
            onChange={onChange}
            variant="filled"
            value={firstName}
            disabled={disabled}
            name="firstName"
            label="First Name *"
            fullWidth
          />
        </Grid>
        <Grid size={3}>
          <TextField
            onChange={onChange}
            variant="filled"
            value={lastName}
            disabled={disabled}
            name="lastName"
            label="Last Name"
            fullWidth
          />
        </Grid>
      </Grid>
      <Divider sx={{ borderColor: 'rgba(255,255,255,0.2)', mt: '20px' }} />
    </Grid>
  )
}
