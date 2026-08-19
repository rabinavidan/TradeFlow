import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';
import { logger } from '../config/logger.js';
import type { GenerateDescriptionInput } from '../schemas/ai.schema.js';

const REQUEST_TIMEOUT_MS = 15_000;

function buildPrompt(input: GenerateDescriptionInput): string {
  const details = [
    `Title: ${input.title}`,
    input.requestType && `Request type: ${input.requestType}`,
    input.customerName && `Customer: ${input.customerName}`,
    input.amount && input.currency && `Amount: ${input.amount} ${input.currency}`,
    input.country && `Country: ${input.country}`,
  ]
    .filter(Boolean)
    .join('\n');

  return [
    'Write a concise, professional 2-3 sentence description for a trade-finance',
    'request, based on the details below. Plain prose only, no headings or',
    'bullet points.',
    '',
    details,
  ].join('\n');
}

interface OllamaGenerateResponse {
  response: string;
}

/**
 * Calls a local Ollama instance to draft a trade request description. This
 * is an optional, best-effort convenience feature: Ollama isn't a required
 * dependency of the app, so any failure to reach it (not installed, not
 * running, model not pulled, slow) is translated into a single, predictable
 * AppError rather than propagating a raw network/timeout error.
 */
export async function generateDescription(input: GenerateDescriptionInput): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(`${env.OLLAMA_BASE_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: env.OLLAMA_MODEL,
        prompt: buildPrompt(input),
        stream: false,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      throw new Error(`Ollama responded with status ${res.status}`);
    }

    const data = (await res.json()) as OllamaGenerateResponse;
    const description = data.response?.trim();
    if (!description) {
      throw new Error('Ollama returned an empty response');
    }
    return description;
  } catch (err) {
    logger.warn({ err }, 'AI description generation unavailable');
    throw AppError.serviceUnavailable(
      'AI_UNAVAILABLE',
      'AI description generation is currently unavailable. Make sure Ollama is running locally, or write the description manually.',
    );
  } finally {
    clearTimeout(timeout);
  }
}
