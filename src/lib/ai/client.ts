import 'server-only';

import { AzureOpenAI } from 'openai';

/**
 * Azure OpenAI client.
 *
 * Every caller must handle the null case: the dashboard stays usable without
 * credentials, falling back to deterministic heuristics. AI is an upgrade here,
 * not a hard dependency.
 */
const globalForAI = globalThis as unknown as { azureSingleton?: AzureOpenAI | null };

/** Azure pins the REST contract by date; override if your resource needs another. */
const API_VERSION = process.env.AZURE_OPENAI_API_VERSION ?? '2024-10-21';

export function getAI(): AzureOpenAI | null {
  if (globalForAI.azureSingleton !== undefined) return globalForAI.azureSingleton;

  const apiKey = process.env.AZURE_OPENAI_API_KEY;
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
  const deployment = process.env.AZURE_OPENAI_DEPLOYMENT_NAME;

  globalForAI.azureSingleton =
    apiKey && endpoint && deployment
      ? new AzureOpenAI({ apiKey, endpoint, deployment, apiVersion: API_VERSION })
      : null;

  return globalForAI.azureSingleton;
}

export function isAIEnabled(): boolean {
  return Boolean(
    process.env.AZURE_OPENAI_API_KEY &&
    process.env.AZURE_OPENAI_ENDPOINT &&
    process.env.AZURE_OPENAI_DEPLOYMENT_NAME
  );
}

/** The deployment name doubles as the model id on Azure. */
export function getModel(): string {
  return process.env.AZURE_OPENAI_DEPLOYMENT_NAME ?? 'gpt-4o';
}

/** Raised when the content filter blocks a request rather than answering it. */
export class AIRefusalError extends Error {
  constructor(public readonly category: string | null) {
    super(`The model declined this request${category ? ` (${category})` : ''}.`);
    this.name = 'AIRefusalError';
  }
}

/**
 * Reads a chat completion's text, surfacing the two non-answer outcomes
 * explicitly rather than returning an empty string.
 */
export function readCompletion(completion: {
  choices: {
    message: { content: string | null; refusal?: string | null };
    finish_reason?: string;
  }[];
}): string {
  const choice = completion.choices[0];
  if (!choice) throw new Error('Model returned no choices.');

  if (choice.message.refusal) {
    throw new AIRefusalError(choice.message.refusal);
  }
  if (choice.finish_reason === 'content_filter') {
    throw new AIRefusalError('content_filter');
  }

  const content = choice.message.content;
  if (!content) throw new Error('Model returned empty content.');
  return content;
}
