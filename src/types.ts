/**
 * Represents a single content item in a tool response.
 * Currently, only text content is supported.
 */
export interface ResponseContentItem {
  type: 'text';
  text: string;
}

/**
 * Unified structure for all tool handler responses.
 * Follows the principles outlined in the refactoring plan.
 */
export interface ToolResult {
  /** Indicates whether the tool execution resulted in an error. */
  isError: boolean;
  /** An array of content items, typically containing a single text item with the result or error message. */
  content: ResponseContentItem[];
}

/**
 * Provider routing configuration for OpenRouter requests
 */
export interface ProviderConfig {
  // Phase 1 - Basic filtering
  /** List of quantization levels to filter by (e.g., ["fp16", "int8"]) */
  quantizations?: string[];
  /** List of provider names to exclude (e.g., ["openai", "anthropic"]) */
  ignore?: string[];
  
  // Phase 2 - Advanced routing
  /** Sort providers by the specified criteria */
  sort?: 'price' | 'throughput' | 'latency';
  /** A prioritized list of provider IDs */
  order?: string[];
  /** If true, only use providers that support all specified request parameters */
  require_parameters?: boolean;
  /** Specify whether providers are allowed to collect data from the request */
  data_collection?: 'allow' | 'deny';
  /** If true, allows falling back to other providers if preferred ones fail */
  allow_fallbacks?: boolean;
}

/**
 * Supported OpenRouter model suffixes for routing
 */
export type ModelSuffix = 'floor' | 'nitro';

/**
 * Parsed model information including suffix
 */
export interface ParsedModel {
  /** Base model name without suffix */
  baseModel: string;
  /** Detected suffix if present */
  suffix?: ModelSuffix;
  /** Full model string as provided */
  fullModel: string;
}