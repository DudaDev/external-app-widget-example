import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import PlaceholderApp from '../index';
import api from 'src/lib/api';

vi.mock('src/lib/api', () => ({
  default: { get: vi.fn() },
}));

afterEach(() => {
  vi.mocked(api.get).mockReset();
});

describe('PlaceholderApp', () => {
  it('prompts for configuration when resourceId is not set', () => {
    render(<PlaceholderApp />);
    expect(screen.getByText(/configure this widget/i)).toBeInTheDocument();
    expect(api.get).not.toHaveBeenCalled();
  });

  it('shows loading, then renders the fetched data', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { hello: 'world' } });

    render(<PlaceholderApp resourceId="abc123" />);

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith('/placeholder/abc123', expect.objectContaining({ signal: expect.anything() }));

    await waitFor(() => {
      expect(screen.getByText(/"hello": "world"/)).toBeInTheDocument();
    });
  });

  it('shows an error message when the fetch fails', async () => {
    vi.mocked(api.get).mockRejectedValue(new Error('network down'));

    render(<PlaceholderApp resourceId="abc123" />);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/failed to load/i);
    });
  });
});
