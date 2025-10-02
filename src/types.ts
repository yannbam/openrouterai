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
