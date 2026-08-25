import { useEffect, useRef, useState } from 'react'
import { API, type GenerateSiteInput } from '../api/api'
import type { InstantSiteErrorContext } from '../types'

interface Account {
  email: string
  firstName: string
  lastName: string
}

interface UseSiteGenerationPollingResult {
  generating: boolean
  elapsed: number
  error: string
  generate: (input: GenerateSiteInput, account: Account) => void
}

const POLL_INTERVAL_MS = 5000

// Kicks off AI site generation, then polls the async task until it completes,
// creating the editor account and granting access once a site_name lands.
export function useSiteGenerationPolling(
  onSuccess: (siteName: string, userId: string) => void,
  onError?: (err: unknown, context: InstantSiteErrorContext) => void
): UseSiteGenerationPollingResult {
  const [generating, setGenerating] = useState(false)
  const [taskId, setTaskId] = useState('')
  const [elapsed, setElapsed] = useState(0)
  const [error, setError] = useState('')

  // Snapshot of account fields at generate-click time — prevents mid-generation edits leaking into createUser.
  const accountRef = useRef<Account>({ email: '', firstName: '', lastName: '' })

  // onSuccess/onError stored in refs so the polling effect skips them as
  // deps — as prop callbacks they'd restart the intervals on every parent render.
  const onSuccessRef = useRef(onSuccess)
  useEffect(() => { onSuccessRef.current = onSuccess }, [onSuccess])
  const onErrorRef = useRef(onError)
  useEffect(() => { onErrorRef.current = onError }, [onError])

  useEffect(() => {
    if (!taskId || !generating) return

    const elapsedInterval = setInterval(() => setElapsed((e) => e + 1), 1000)

    const pollInterval = setInterval(async () => {
      try {
        const task = await API.pollTask(taskId)
        if (task.status === 'COMPLETED' && task.result?.site_name) {
          clearInterval(elapsedInterval)
          clearInterval(pollInterval)
          const sName = task.result.site_name
          const { userId } = await API.createUser(
            accountRef.current.email,
            accountRef.current.firstName,
            accountRef.current.lastName,
          )
          await API.grantUserAccess(userId, sName)
          setGenerating(false)
          onSuccessRef.current(sName, userId)
        } else if (task.status === 'FAILED') {
          clearInterval(elapsedInterval)
          clearInterval(pollInterval)
          setError('Site generation failed. Please try again.')
          setGenerating(false)
        }
      } catch (err) {
        clearInterval(elapsedInterval)
        clearInterval(pollInterval)
        setError(err instanceof Error ? err.message : 'Polling error.')
        setGenerating(false)
        onErrorRef.current?.(err, { step: 'poll' })
      }
    }, POLL_INTERVAL_MS)

    return () => {
      clearInterval(elapsedInterval)
      clearInterval(pollInterval)
    }
  }, [taskId, generating])

  async function generate(input: GenerateSiteInput, account: Account) {
    setError('')
    setElapsed(0)
    setTaskId('')
    setGenerating(true)
    accountRef.current = account

    try {
      const task = await API.generateSite(input)
      setTaskId(task.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start generation.')
      setGenerating(false)
      onErrorRef.current?.(err, { step: 'generate' })
    }
  }

  return { generating, elapsed, error, generate }
}
