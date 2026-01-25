import 'server-only';
import { z } from 'zod';

const envSchema = z.object({
  ANTHROPIC_API_KEY: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  ACCESS_CODE: z.string().default('admin123'),
  SESSION_SECRET: z.string().min(32).default('default_secure_session_secret_at_least_32_chars_long'),
  MOCK_PROVIDER: z.union([z.string(), z.boolean()]).optional().default('1').transform(v => v === '1' || v === 'true' || v === true)
});

export const env = envSchema.parse(process.env);
