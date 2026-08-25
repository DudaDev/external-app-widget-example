import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CustomFormApp from '../index';
import api from 'src/lib/api';

vi.mock('src/lib/api', () => ({
  default: { post: vi.fn() },
  setBaseURL: vi.fn(),
}));

function fillValidForm() {
  fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Jane Doe' } });
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'jane@example.com' } });
  fireEvent.change(screen.getByLabelText('Message'), { target: { value: 'Hello, this is a real message.' } });
}

// Real (short) delay rather than mocking Date.now — mocking it globally
// interferes with React's internal scheduler across sequential tests in the
// same file (confirmed: works when run in isolation, breaks in the full
// suite), so this sidesteps that entirely at the cost of ~1.6s of real time.
const MIN_ELAPSED_MS = 1500;
function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe('CustomFormApp', () => {
  afterEach(() => {
    // api.post is a vi.fn() defined inside the vi.mock() factory above, not
    // a vi.spyOn — restoreAllMocks() doesn't reliably clear its call history
    // between tests, so a previous test's mockResolvedValue/call count can
    // leak into the next one. Reset it explicitly.
    vi.mocked(api.post).mockReset();
    vi.restoreAllMocks();
  });

  it('shows a validation error and does not submit when required fields are missing', () => {
    render(<CustomFormApp />);
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Please enter your name.');
    expect(api.post).not.toHaveBeenCalled();
  });

  it('submits and shows the success state on the happy path', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { id: '1' } });
    render(<CustomFormApp />);
    fillValidForm();
    await wait(MIN_ELAPSED_MS + 100);
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));
    await waitFor(() => expect(screen.getByRole('status')).toBeInTheDocument());
    expect(api.post).toHaveBeenCalledWith(
      '/custom-form/submit',
      { name: 'Jane Doe', email: 'jane@example.com', message: 'Hello, this is a real message.' },
      expect.anything()
    );
  });

  it('shows success without ever calling api.post when the honeypot field is filled', async () => {
    render(<CustomFormApp />);
    fillValidForm();
    fireEvent.change(document.getElementById('cf-company') as HTMLInputElement, {
      target: { value: 'a bot filled this in' },
    });
    await wait(MIN_ELAPSED_MS + 100); // isolate the honeypot check from the timing check below
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));
    await waitFor(() => expect(screen.getByRole('status')).toBeInTheDocument());
    expect(api.post).not.toHaveBeenCalled();
  });

  it('shows success without ever calling api.post when submitted before MIN_ELAPSED_MS', async () => {
    render(<CustomFormApp />);
    fillValidForm();
    // No wait — submits immediately, well under the threshold.
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));
    await waitFor(() => expect(screen.getByRole('status')).toBeInTheDocument());
    expect(api.post).not.toHaveBeenCalled();
  });

  it('shows an error state when the backend call fails', async () => {
    vi.mocked(api.post).mockRejectedValue(new Error('HTTP 500'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<CustomFormApp />);
    fillValidForm();
    await wait(MIN_ELAPSED_MS + 100);
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));
    await waitFor(() =>
      expect(screen.getByText('Something went wrong. Please try again.')).toBeInTheDocument()
    );
  });
});
