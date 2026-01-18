export interface Msg {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface StreamEvent {
  type: 'delta' | 'usage';
  content?: string;
  inputTokens?: number;
  outputTokens?: number;
}

export interface LLMProvider {
  stream(model: string, messages: Msg[]): AsyncIterable<StreamEvent>;
}
