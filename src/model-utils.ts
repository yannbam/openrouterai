import { ModelSuffix, ParsedModel } from './types.js';

/**
 * Debug logging utility - only logs when DEBUG environment variable is set
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function debugLog(message: string, ...args: any[]): void {
  if (process.env.DEBUG === '1') {
    // eslint-disable-next-line no-console
    console.error(`[DEBUG] ${message}`, ...args);
  }
}

/**
 * Parse a model string to extract base model and suffix
 * Supports :floor (cheapest) and :nitro (faster experimental) suffixes
 */
export function parseModel(modelString: string): ParsedModel {
  const suffixes: ModelSuffix[] = ['floor', 'nitro'];

  for (const suffix of suffixes) {
    const suffixPattern = `:${suffix}`;
    if (modelString.endsWith(suffixPattern)) {
      return {
        baseModel: modelString.slice(0, -suffixPattern.length),
        suffix,
        fullModel: modelString,
      };
    }
  }

  // No suffix found
  return {
    baseModel: modelString,
    fullModel: modelString,
  };
}

/**
 * Estimate token count for text (rough approximation)
 */
export function estimateTokenCount(text: string): number {
  // Rough approximation: 4 characters per token
  return Math.ceil(text.length / 4);
}
