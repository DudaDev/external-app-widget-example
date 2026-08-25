import { describe, it, expect, vi } from 'vitest';
import { createDemoAdapter, DEMO_DELAY_MS } from '../../adapters/demoAdapter';

describe('DEMO_DELAY_MS', () => {
  it('is a positive number', () => {
    expect(typeof DEMO_DELAY_MS).toBe('number');
    expect(DEMO_DELAY_MS).toBeGreaterThan(0);
  });
});

describe('demoAdapter', () => {
  function makeAdapter(opts: { schedule?: any; cancel?: any; resultCount?: number } = {}) {
    const schedule = opts.schedule ?? vi.fn((fn: () => void) => { fn(); return 1; }) as any;
    const cancel   = opts.cancel   ?? vi.fn();
    return createDemoAdapter({ schedule, cancel, resultCount: opts.resultCount ?? 3 });
  }

  it('getSchema returns expected field names', async () => {
    const adapter = makeAdapter();
    const schema = await adapter.getSchema();
    expect(schema).toContain('title');
    expect(schema).toContain('description');
    expect(schema).toContain('link');
  });

  it('loadAll returns 12 items with required data fields', async () => {
    const adapter = makeAdapter();
    const items = await adapter.loadAll();
    expect(items).toHaveLength(12);
    expect(items[0]!.data).toMatchObject({ title: expect.any(String), description: expect.any(String) });
  });

  it('loadAll cycles through four categories', async () => {
    const adapter = makeAdapter();
    const items = await adapter.loadAll();
    const categories = new Set(items.map(i => (i.data as any)['category']));
    expect(categories.size).toBe(4);
  });

  it('search resolves with results containing the query in the title', async () => {
    const adapter = makeAdapter();
    const { results } = await adapter.search('hello');
    expect(results.length).toBeGreaterThan(0);
    expect((results[0]!.data as any)['title']).toMatch(/hello/i);
  });

  it('every search result item has .data populated', async () => {
    const adapter = makeAdapter({ resultCount: 4 });
    const { results } = await adapter.search('test');
    results.forEach((item) => {
      expect(item.data).toBeDefined();
      expect(typeof item.data).toBe('object');
    });
  });

  it('every loadAll item has .data populated', async () => {
    const adapter = makeAdapter();
    const items = await adapter.loadAll();
    items.forEach((item) => {
      expect(item.data).toBeDefined();
      expect(typeof item.data).toBe('object');
    });
  });

  it('search result count matches resultCount when provided', async () => {
    const adapter = makeAdapter({ resultCount: 5 });
    const { results } = await adapter.search('test');
    expect(results).toHaveLength(5);
  });

  it('search result count is between 2 and 7 when using the default random count', async () => {
    const adapter = createDemoAdapter({
      schedule: vi.fn((fn: () => void) => { fn(); return 1; }) as any,
      cancel:   vi.fn(),
    });
    const { results } = await adapter.search('test');
    expect(results.length).toBeGreaterThanOrEqual(2);
    expect(results.length).toBeLessThanOrEqual(7);
  });

  it('search cancels the pending timer when called again', () => {
    let timerId = 0;
    const schedule = vi.fn(() => ++timerId) as any;
    const cancel   = vi.fn();
    const adapter  = createDemoAdapter({ schedule, cancel, resultCount: 3 });

    adapter.search('first');
    const firstId = timerId;

    adapter.search('second');
    expect(cancel).toHaveBeenCalledWith(firstId);
    expect(schedule).toHaveBeenCalledTimes(2);
  });

  it('rejects immediately with AbortError when signal is already aborted', async () => {
    const adapter = makeAdapter();
    const controller = new AbortController();
    controller.abort();

    await expect(adapter.search('test', controller.signal)).rejects.toMatchObject({
      name: 'AbortError',
    });
  });

  it('rejects with AbortError when signal is aborted while the timer is pending', async () => {
    const controller = new AbortController();
    const schedule = vi.fn(() => 1) as any;
    const cancel   = vi.fn();
    const adapter  = createDemoAdapter({ schedule, cancel, resultCount: 3 });

    const promise = adapter.search('test', controller.signal);
    controller.abort();
    await expect(promise).rejects.toMatchObject({ name: 'AbortError' });
  });
});
