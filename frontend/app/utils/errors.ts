/** Prefer the API's `{ error: message }` payload, then fall back to a friendly default. */
export function getApiErrorMessage(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (error && typeof error === 'object') {
    const data = (error as { data?: unknown }).data;
    if (data && typeof data === 'object' && 'error' in data) {
      const message = (data as { error?: unknown }).error;
      if (typeof message === 'string' && message.trim()) return message;
    }

    const statusMessage = (error as { statusMessage?: unknown }).statusMessage;
    if (typeof statusMessage === 'string' && statusMessage.trim()) return statusMessage;
  }

  if (error instanceof Error && error.message.trim() && !error.message.startsWith('[object')) {
    return error.message;
  }

  return fallback;
}
