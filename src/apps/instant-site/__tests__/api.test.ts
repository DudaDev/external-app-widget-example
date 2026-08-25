import { describe, it, expect, vi, beforeEach } from 'vitest'
import { configureApi, API } from '../api/api'

function mockFetch(status: number, body: unknown, headers: Record<string, string> = {}) {
  const h = new Headers({ 'content-type': 'application/json', ...headers })
  global.fetch = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    headers: h,
    json: () => Promise.resolve(body),
    statusText: `HTTP ${status}`,
  }) as typeof fetch
}

function fetchCalls(): Array<[string, RequestInit]> {
  return vi.mocked(global.fetch).mock.calls as unknown as Array<[string, RequestInit]>
}

beforeEach(() => {
  configureApi('https://test.example.com', 'test-token')
})

describe('configureApi', () => {
  it('sets apiUrl used in subsequent requests', async () => {
    configureApi('https://custom.example.com', undefined)
    mockFetch(200, [])
    await API.getTemplates()
    expect(global.fetch).toHaveBeenCalledWith(
      'https://custom.example.com/api/templates?editor=ADVANCED-2.0',
      expect.any(Object),
    )
  })

  it('sets embedToken sent as Bearer header', async () => {
    configureApi('https://test.example.com', 'my-secret')
    mockFetch(200, [])
    await API.getTemplates()
    expect(global.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer my-secret' }),
      }),
    )
  })

  it('does not override existing value when arg is undefined', async () => {
    configureApi('https://set.example.com', 'set-token')
    configureApi(undefined, undefined)
    mockFetch(200, [])
    await API.getTemplates()
    expect(global.fetch).toHaveBeenCalledWith(
      'https://set.example.com/api/templates?editor=ADVANCED-2.0',
      expect.any(Object),
    )
  })

  it('keeps the previous apiUrl when given a malformed one', async () => {
    configureApi('https://good.example.com', undefined)
    configureApi('not a url', undefined)
    mockFetch(200, [])
    await API.getTemplates()
    expect(global.fetch).toHaveBeenCalledWith(
      'https://good.example.com/api/templates?editor=ADVANCED-2.0',
      expect.any(Object),
    )
  })

  it('keeps the previous apiUrl when given a non-http(s) protocol', async () => {
    configureApi('https://good.example.com', undefined)
    configureApi('javascript:alert(1)', undefined)
    mockFetch(200, [])
    await API.getTemplates()
    expect(global.fetch).toHaveBeenCalledWith(
      'https://good.example.com/api/templates?editor=ADVANCED-2.0',
      expect.any(Object),
    )
  })
})

describe('API error handling', () => {
  it('throws with message from response body', async () => {
    mockFetch(400, { message: 'Bad request body' })
    await expect(API.getTemplates()).rejects.toThrow('Bad request body')
  })

  it('falls back to error field when message is absent', async () => {
    mockFetch(401, { error: 'Unauthorized' })
    await expect(API.getTemplates()).rejects.toThrow('Unauthorized')
  })

  it('falls back to statusText when body has neither field', async () => {
    mockFetch(500, {})
    await expect(API.getTemplates()).rejects.toThrow('HTTP 500')
  })

  it('attaches status to the thrown error', async () => {
    mockFetch(422, { message: 'Unprocessable' })
    const err = (await API.getTemplates().catch((e: unknown) => e)) as Error & { status: number }
    expect(err.status).toBe(422)
  })
})

describe('API.getTemplates', () => {
  it('GET /api/templates?editor=ADVANCED-2.0', async () => {
    mockFetch(200, [])
    await API.getTemplates()
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/templates?editor=ADVANCED-2.0'),
      expect.objectContaining({ method: 'GET' }),
    )
  })
})

describe('API.createSite', () => {
  it('POST /api/sites with templateId body', async () => {
    mockFetch(200, { siteName: 'my-site' })
    await API.createSite('42')
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/sites'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ templateId: '42' }),
      }),
    )
  })
})

describe('API.deleteSite', () => {
  it('DELETE /api/sites/:name and returns undefined on 204', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 204,
      headers: new Headers({ 'content-length': '0' }),
      json: () => Promise.resolve(null),
    }) as typeof fetch
    const result = await API.deleteSite('my-site')
    expect(result).toBeUndefined()
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/sites/my-site'),
      expect.objectContaining({ method: 'DELETE' }),
    )
  })
})

describe('API.createUser', () => {
  it('POST /api/users with email/firstName/lastName', async () => {
    mockFetch(200, { userId: 'user@example.com' })
    await API.createUser('user@example.com', 'Jane', 'Doe')
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/users'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ userId: 'user@example.com', email: 'user@example.com', firstName: 'Jane', lastName: 'Doe' }),
      }),
    )
  })
})

describe('API.getSSOLink', () => {
  it('GET /api/users/:userId/accessFor/:siteName', async () => {
    mockFetch(200, { url: 'https://editor.duda.co/sso' })
    await API.getSSOLink('user@example.com', 'my-site')
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/users/user%40example.com/accessFor/my-site'),
      expect.objectContaining({ method: 'GET' }),
    )
  })
})

describe('API.generateSite', () => {
  it('POST /api/generate with input body', async () => {
    mockFetch(200, { id: 'task-123', status: 'STARTED', type: 'generate', created_at: '' })
    const input = {
      method: 'ai' as const,
      businessName: 'Acme',
      businessDescription: 'desc',
      businessCategory: 'Retail',
    }
    await API.generateSite(input)
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/generate'),
      expect.objectContaining({ method: 'POST', body: JSON.stringify(input) }),
    )
  })
})

describe('API.pollTask', () => {
  it('GET /api/generate/:taskId', async () => {
    mockFetch(200, { id: 'task-123', status: 'COMPLETED', type: 'generate', created_at: '' })
    await API.pollTask('task-123')
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/generate/task-123'),
      expect.objectContaining({ method: 'GET' }),
    )
  })

  it('registers the siteToken from a completed task, so a later call for that site sends it', async () => {
    // Regression test: the AI-generation flow never calls createSite, so
    // without pollTask registering a token, grantUserAccess/deleteSite/
    // updateContent for an AI-generated site would 403 in production.
    mockFetch(200, {
      id: 'task-123',
      status: 'COMPLETED',
      type: 'generate',
      created_at: '',
      result: { site_name: 'ai-generated-site' },
      siteToken: 'signed-token-for-ai-site',
    })
    await API.pollTask('task-123')

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 204,
      headers: new Headers({ 'content-length': '0' }),
      json: () => Promise.resolve(null),
    }) as typeof fetch
    await API.deleteSite('ai-generated-site')
    expect(global.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({ 'X-Site-Token': 'signed-token-for-ai-site' }),
      }),
    )
  })

  it('does not register a token when the task has no site_name yet', async () => {
    mockFetch(200, { id: 'task-123', status: 'STARTED', type: 'generate', created_at: '' })
    await API.pollTask('task-123')

    mockFetch(200, {})
    await API.updateContent('some-other-site', {})
    const [, init] = fetchCalls()[0]!
    expect(init.headers).not.toHaveProperty('X-Site-Token')
  })
})

describe('request protections', () => {
  it('adds the ngrok bypass header when apiUrl contains ngrok', async () => {
    configureApi('https://widget-1234.ngrok-free.app', 'test-token')
    mockFetch(200, [])
    await API.getTemplates()
    expect(global.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({ 'ngrok-skip-browser-warning': '1' }),
      }),
    )
  })

  it('does not add the ngrok bypass header for a normal URL', async () => {
    mockFetch(200, [])
    await API.getTemplates()
    const [, init] = fetchCalls()[0]!
    expect(init.headers).not.toHaveProperty('ngrok-skip-browser-warning')
  })

  it('passes an AbortSignal so a hung request can be cancelled', async () => {
    mockFetch(200, [])
    await API.getTemplates()
    expect(global.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    )
  })
})
