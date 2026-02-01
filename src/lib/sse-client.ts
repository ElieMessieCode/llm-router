export interface SSECallbacks {
  onMeta?: (data: { model: string; provider: string }) => void;
  onDelta?: (text: string) => void;
  onUsage?: (data: { input: number; output: number; price: number }) => void;
  onDone?: () => void;
  onError?: (err: { message: string; code?: string; retryable?: boolean }) => void;
}

export async function consumeSSEStream(
  response: Response,
  callbacks: SSECallbacks
): Promise<void> {
  if (!response.body) {
    callbacks.onError?.({ message: 'No response body' });
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const blocks = buffer.split('\n\n');
      buffer = blocks.pop() || '';

      for (const block of blocks) {
        if (!block.trim()) continue;
        const lines = block.split('\n');
        let event = 'message';
        let dataStr = '';

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            event = line.substring(7).trim();
          } else if (line.startsWith('data: ')) {
            dataStr = line.substring(6).trim();
          }
        }

        if (!dataStr) continue;

        let parsed: any;
        try {
          parsed = JSON.parse(dataStr);
        } catch {
          parsed = dataStr;
        }

        if (event === 'meta') {
          callbacks.onMeta?.(parsed);
        } else if (event === 'delta') {
          const deltaText = typeof parsed === 'string' ? parsed : (parsed.text || parsed.content || '');
          callbacks.onDelta?.(deltaText);
        } else if (event === 'usage') {
          callbacks.onUsage?.(parsed);
        } else if (event === 'done') {
          callbacks.onDone?.();
        } else if (event === 'error') {
          callbacks.onError?.(typeof parsed === 'object' ? parsed : { message: String(parsed) });
        }
      }
    }
  } catch (error: any) {
    if (error.name !== 'AbortError') {
      callbacks.onError?.({ message: error.message });
    }
  }
}
