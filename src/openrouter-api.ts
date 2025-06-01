import axios, { AxiosError, AxiosInstance } from 'axios';
import { setTimeout } from 'timers/promises';
import { OpenRouterModelResponse } from './model-cache.js';

export interface RateLimitState {
  remaining: number;
  reset: number;
  total: number;
}

export const RETRY_DELAYS = [1000, 2000, 4000]; // Exponential backoff delays in ms

export class OpenRouterAPIClient {
  private axiosInstance: AxiosInstance;
  private rateLimit: RateLimitState = {
    remaining: 50, // Default conservative value
    reset: Date.now() + 60000,
    total: 50
  };

  constructor(apiKey: string) {
    // Initialize axios instance for OpenRouter API
    this.axiosInstance = axios.create({
      baseURL: 'https://openrouter.ai/api/v1',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://github.com/heltonteixeira/openrouterai',
        'X-Title': 'MCP OpenRouter Server'
      }
    });

    // Add response interceptor for rate limit headers
    this.axiosInstance.interceptors.response.use(
      (response: any) => {
        const remaining = parseInt(response.headers['x-ratelimit-remaining'] || '50');
        const reset = parseInt(response.headers['x-ratelimit-reset'] || '60');
        const total = parseInt(response.headers['x-ratelimit-limit'] || '50');

        this.rateLimit = {
          remaining,
          reset: Date.now() + (reset * 1000),
          total
        };

        return response;
      },
      async (error: AxiosError) => {
        if (error.response?.status === 429) {
          console.error('Rate limit exceeded, waiting for reset...');
          const resetAfter = parseInt(error.response.headers['retry-after'] || '60');
          await setTimeout(resetAfter * 1000);
          return this.axiosInstance.request(error.config!);
        }
        throw error;
      }
    );
  }

  async fetchModels(): Promise<OpenRouterModelResponse & { timestamp: number }> {
    // Check rate limits before making request
    if (this.rateLimit.remaining <= 0 && Date.now() < this.rateLimit.reset) {
      const waitTime = this.rateLimit.reset - Date.now();
      await setTimeout(waitTime);
    }

    // Retry mechanism for fetching models
    for (let i = 0; i <= RETRY_DELAYS.length; i++) {
      try {
        const response = await this.axiosInstance.get<OpenRouterModelResponse>('/models');
        return {
          data: response.data.data,
          timestamp: Date.now()
        };
      } catch (error) {
        if (i === RETRY_DELAYS.length) throw error;
        await setTimeout(RETRY_DELAYS[i]);
      }
    }

    throw new Error('Failed to fetch models after multiple attempts');
  }

  async chatCompletion(params: {
    model: string, 
    messages: any[], 
    temperature?: number,
    max_tokens?: number,
    seed?: number,
    additionalParams?: Record<string, string | number | boolean>
  }) {
    const requestBody: any = {
      model: params.model,
      messages: params.messages,
    };

    // Only include optional parameters if they are provided
    if (params.temperature !== undefined) {
      requestBody.temperature = params.temperature;
    }
    if (params.max_tokens !== undefined) {
      requestBody.max_tokens = params.max_tokens;
    }
    if (params.seed !== undefined) {
      requestBody.seed = params.seed;
    }

    // Merge additional parameters
    if (params.additionalParams) {
      Object.assign(requestBody, params.additionalParams);
    }

    // Debug logging to show actual request body
    if (process.env.DEBUG === '1') {
      console.error('[DEBUG] Actual API Request Body (chatCompletion):', JSON.stringify(requestBody, null, 2));
    }

    const response = await this.axiosInstance.post('/chat/completions', requestBody);

    // Debug logging to show complete raw API response
    if (process.env.DEBUG === '1') {
      console.error('[DEBUG] Complete API Response (chatCompletion):');
      console.error('[DEBUG] Response Status:', response.status, response.statusText);
      console.error('[DEBUG] Response Headers:', JSON.stringify(response.headers, null, 2));
      console.error('[DEBUG] Response Data:', JSON.stringify(response.data, null, 2));
    }

    return response;
  }

  async textCompletion(params: {
    model: string,
    prompt: string,
    max_tokens?: number,
    temperature?: number,
    seed?: number,
    additionalParams?: Record<string, string | number | boolean>
  }) {
    const requestBody: any = {
      model: params.model,
      prompt: params.prompt,
    };

    if (params.max_tokens !== undefined) {
      requestBody.max_tokens = params.max_tokens;
    }
    if (params.temperature !== undefined) {
      requestBody.temperature = params.temperature;
    }
    if (params.seed !== undefined) {
      requestBody.seed = params.seed;
    }

    // Spread additional parameters at top level, not nested
    if (params.additionalParams) {
      Object.assign(requestBody, params.additionalParams);
    }

    // Debug logging to show actual request body
    if (process.env.DEBUG === '1') {
      console.error('[DEBUG] Actual API Request Body (textCompletion):', JSON.stringify(requestBody, null, 2));
    }

    const response = await this.axiosInstance.post('/completions', requestBody);

    // Debug logging to show complete raw API response
    if (process.env.DEBUG === '1') {
      console.error('[DEBUG] Complete API Response (textCompletion):');
      console.error('[DEBUG] Response Status:', response.status, response.statusText);
      console.error('[DEBUG] Response Headers:', JSON.stringify(response.headers, null, 2));
      console.error('[DEBUG] Response Data:', JSON.stringify(response.data, null, 2));
    }

    return response;
  }

  async fetchModelEndpoints(model: string) {
    // Check rate limits before making request
    if (this.rateLimit.remaining <= 0 && Date.now() < this.rateLimit.reset) {
      const waitTime = this.rateLimit.reset - Date.now();
      await setTimeout(waitTime);
    }

    // Parse model ID into author/slug format for the endpoint
    const [author, slug] = model.split('/', 2);
    if (!author || !slug) {
      throw new Error(`Invalid model format. Expected 'author/slug', got '${model}'`);
    }

    // Retry mechanism for fetching model endpoints
    for (let i = 0; i <= RETRY_DELAYS.length; i++) {
      try {
        const response = await this.axiosInstance.get(`/models/${author}/${slug}/endpoints`);
        return response.data;
      } catch (error) {
        if (i === RETRY_DELAYS.length) throw error;
        await setTimeout(RETRY_DELAYS[i]);
      }
    }

    throw new Error('Failed to fetch model endpoints after multiple attempts');
  }

  getRateLimit(): RateLimitState {
    return { ...this.rateLimit };
  }
}