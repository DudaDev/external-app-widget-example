import { useCallback, useState } from 'react'
import { Box, Container } from '@mui/material'
import { Template } from './api/api'
import StepOne from './components/StepOne'
import TemplatePicker from './components/TemplatePicker'
import CreationMethod from './components/CreationMethod'
import SimpleForm from './components/SimpleForm'
import AIForm from './components/AIForm'
import SuccessScreen from './components/SuccessScreen'
import type { InstantSiteErrorContext } from './types'

type Step =
  | { id: 'start' }
  | { id: 'ai-form' }
  | { id: 'template-picker' }
  | { id: 'method-select'; template: Template }
  | { id: 'simple-form'; template: Template }
  | { id: 'ai-populate-form'; template: Template }
  | { id: 'success'; siteName: string; userId: string }

const CENTERED_STEPS = ['start', 'method-select', 'success']

interface Props {
  enablePresets?: boolean
  onError?: (err: unknown, context: InstantSiteErrorContext) => void
}

export default function Widget({ enablePresets = false, onError }: Props) {
  const [step, setStep] = useState<Step>({ id: 'start' })

  const handleSuccess = useCallback((siteName: string, userId: string) => {
    setStep({ id: 'success', siteName, userId })
  }, [])

  const isCentered = CENTERED_STEPS.includes(step.id)

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: isCentered ? 'center' : 'flex-start',
      }}
    >
      <Container maxWidth="md" sx={{ py: 4 }}>
        {step.id === 'start' && (
          <StepOne
            onAI={() => setStep({ id: 'ai-form' })}
            onTemplate={() => setStep({ id: 'template-picker' })}
          />
        )}

        {step.id === 'ai-form' && (
          <AIForm
            mode="scratch"
            onBack={() => setStep({ id: 'start' })}
            onSuccess={handleSuccess}
            enablePresets={enablePresets}
            onError={onError}
          />
        )}

        {step.id === 'template-picker' && (
          <TemplatePicker
            onBack={() => setStep({ id: 'start' })}
            onSelect={(template) => setStep({ id: 'method-select', template })}
            onError={onError}
          />
        )}

        {step.id === 'method-select' && (
          <CreationMethod
            template={step.template}
            onBack={() => setStep({ id: 'template-picker' })}
            onSimple={(template) => setStep({ id: 'simple-form', template })}
            onAI={(template) => setStep({ id: 'ai-populate-form', template })}
          />
        )}

        {step.id === 'simple-form' && (
          <SimpleForm
            template={step.template}
            onBack={() => setStep({ id: 'method-select', template: step.template })}
            onSuccess={handleSuccess}
            enablePresets={enablePresets}
            onError={onError}
          />
        )}

        {step.id === 'ai-populate-form' && (
          <AIForm
            mode="populate"
            template={step.template}
            onBack={() => setStep({ id: 'method-select', template: step.template })}
            onSuccess={handleSuccess}
            enablePresets={enablePresets}
            onError={onError}
          />
        )}

        {step.id === 'success' && (
          <SuccessScreen
            siteName={step.siteName}
            userId={step.userId}
            onError={onError}
          />
        )}
      </Container>
    </Box>
  )
}
