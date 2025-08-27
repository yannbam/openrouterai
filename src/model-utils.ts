import { ModelSuffix, ParsedModel } from './types.js';

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
 * Create standard success ToolResult
 */
export function createSuccessResult(text: string) {
  return {
    isError: false,
    content: [{ type: 'text' as const, text }],
  };
}

/**
 * Create standard error ToolResult
 */
export function createErrorResult(message: string) {
  return {
    isError: true,
    content: [{ type: 'text' as const, text: `Error: ${message}` }],
  };
}

/**
 * Estimate token count for text (rough approximation)
 */
export function estimateTokenCount(text: string): number {
  // Rough approximation: 4 characters per token
  return Math.ceil(text.length / 4);
}