export type RouterErrorCode = 'auth' | 'rate_limited' | 'provider_unavailable' | 'invalid_request' | 'context_length' | 'content_filtered' | 'timeout';

export class RouterError extends Error {
  constructor(
    public code: RouterErrorCode,
    message: string,
    public status: number,
    public retryable: boolean
  ) {
    super(message);
    this.name = 'RouterError';
  }
}
