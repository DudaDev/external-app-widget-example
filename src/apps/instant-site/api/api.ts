// Runtime-configurable API URL and embed token.
// Defaults come from build-time env vars; call configureApi() to override at runtime.
let _apiUrl: string = (import.meta.env.VITE_INSTANT_SITE_API_URL as string | undefined) ?? ''
let _embedToken: string = (import.meta.env.VITE_INSTANT_SITE_EMBED_TOKEN as string | undefined) ?? ''

export function configureApi(apiUrl?: string, embedToken?: string): void {
  if (apiUrl) {
    try {
      const { protocol } = new URL(apiUrl)
      if (protocol === 'http:' || protocol === 'https:') _apiUrl = apiUrl
    } catch {
      // invalid URL, keep the previous value
    }
  }
  if (embedToken) _embedToken = embedToken
}

export interface Template {
  template_id: number
  template_name: string
  template_alias: string
  desktop_thumbnail_url: string
  preview_url: string
  editor: 'ADVANCED' | 'ADVANCED-2.0'
  template_properties: {
    page_count: number
    has_blog: boolean
    has_store: boolean
    type?: 'duda' | 'custom'
  }
}

export interface AsyncTask {
  id: string
  status: 'STARTED' | 'PENDING' | 'COMPLETED' | 'FAILED'
  type: string
  created_at: string
  finished_at?: string
  result?: { site_name: string }
  // Present once status is COMPLETED and result.site_name is set — the AI
  // flow never calls createSite, so this is the only place it gets one.
  siteToken?: string
}

export interface ThemeColor {
  id: string
  label: string
  value: string
}

export interface GenerateSiteInput {
  method: 'ai' | 'populate'
  businessName: string
  businessDescription: string
  businessCategory: string
  logoUrl?: string
  serviceArea?: string
  toneOfVoice?: 'CONVERSATIONAL' | 'HUMOROUS' | 'ENTHUSIASTIC' | 'INFORMATIVE' | 'PROFESSIONAL' | 'WITTY' | 'AUTHORITATIVE'
  phoneNumber?: string
  email?: string
  street?: string
  city?: string
  state?: string
  country?: string
  zipCode?: string
  templateAlias?: string
  instructions?: string
  maxPages?: number
  lang?: string
  themeColors?: ThemeColor[]
}

// Site tokens prove to the worker that this session created a given site,
// so updateContent/deleteSite/grantUserAccess/getSSOLink can't be pointed
// at someone else's siteName. Keyed by siteName rather than threaded
// through every component prop. createSite mints one directly; the AI
// generation flow (which never calls createSite) gets one from pollTask
// instead, once the task completes and a site_name is known.
const siteTokens = new Map<string, string>()

function siteTokenHeader(siteName: string): Record<string, string> {
  const token = siteTokens.get(siteName)
  return token ? { 'X-Site-Token': token } : {}
}

// PATCH/DELETE, per-call headers (Authorization, X-Site-Token), and
// response-body error messages aren't things src/lib/api.ts's shared
// GET/POST client supports, so this stays its own request() rather than a
// forced fit — but it still gets the same request-timeout and ngrok-bypass
// protections that client gives every other app.
const REQUEST_TIMEOUT_MS = 8000

async function request<T>(method: string, path: string, body?: unknown, extraHeaders?: Record<string, string>): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${_embedToken}`,
    ...extraHeaders,
  }
  if (_apiUrl.includes('ngrok')) headers['ngrok-skip-browser-warning'] = '1'

  const controller = new AbortController()
  const timerId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  let response: Response
  try {
    response = await fetch(`${_apiUrl}${path}`, {
      method,
      headers,
      signal: controller.signal,
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    })
  } finally {
    clearTimeout(timerId)
  }

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    const message = (err as { message?: string; error?: string }).message
      ?? (err as { error?: string }).error
      ?? response.statusText
    const error = new Error(message) as Error & { status: number }
    error.status = response.status
    throw error
  }

  if (response.status === 204 || response.headers.get('content-length') === '0') {
    return undefined as T
  }

  return response.json() as Promise<T>
}

export const API = {
  getTemplates: () =>
    request<Template[]>('GET', '/api/templates?editor=ADVANCED-2.0'),

  createSite: (templateId: string) =>
    request<{ siteName: string; siteToken: string }>('POST', '/api/sites', { templateId }).then((result) => {
      siteTokens.set(result.siteName, result.siteToken)
      return { siteName: result.siteName }
    }),

  updateContent: (siteName: string, contentLibrary: unknown) =>
    request<{ status: string }>('PATCH', `/api/sites/${siteName}`, contentLibrary, siteTokenHeader(siteName)),

  deleteSite: (siteName: string) =>
    request<void>('DELETE', `/api/sites/${siteName}`, undefined, siteTokenHeader(siteName)),

  createUser: (email: string, firstName?: string, lastName?: string) =>
    request<{ userId: string }>('POST', '/api/users', { userId: email, email, firstName, lastName }),

  grantUserAccess: (userId: string, siteName: string) =>
    request<void>('POST', `/api/users/${encodeURIComponent(userId)}/accessFor/${siteName}`, undefined, siteTokenHeader(siteName)),

  getSSOLink: (userId: string, siteName: string) =>
    request<{ url: string }>('GET', `/api/users/${encodeURIComponent(userId)}/accessFor/${siteName}`, undefined, siteTokenHeader(siteName)),

  generateSite: (input: GenerateSiteInput) =>
    request<AsyncTask>('POST', '/api/generate', input),

  pollTask: (taskId: string) =>
    request<AsyncTask>('GET', `/api/generate/${taskId}`).then((task) => {
      if (task.result?.site_name && task.siteToken) {
        siteTokens.set(task.result.site_name, task.siteToken)
      }
      return task
    }),
}
