import { ModelCache } from '../model-cache.js';
import { OpenRouterAPIClient } from '../openrouter-api.js';

export interface GetModelInfoToolRequest {
  model: string;
}

export async function handleGetModelInfo(
  request: { params: { arguments: GetModelInfoToolRequest } },
  modelCache: ModelCache,
  apiClient: OpenRouterAPIClient
) {
  const { model } = request.params.arguments;

  try {
    // Try to get from cache first, if not available fetch from API
    let modelInfo = await modelCache.getModelInfo(model);

    if (!modelInfo) {
      // Cache is empty or expired, fetch models from API
      const models = await apiClient.fetchModels();
      if (models) {
        modelCache.setCachedModels({ ...models, timestamp: Date.now() });
        // Try to get model info again from newly cached data
        modelInfo = await modelCache.getModelInfo(model);
      }
    }

    if (!modelInfo) {
      return {
        content: [
          {
            type: 'text' as const,
            text: `Model not found: ${model}`,
          },
        ],
        isError: true,
      };
    }

    const response = {
      id: `info-${Date.now()}`,
      object: 'model',
      created: Math.floor(Date.now() / 1000),
      owned_by: modelInfo.id.split('/')[0],
      permission: [],
      root: modelInfo.id,
      parent: null,
      data: {
        id: modelInfo.id,
        name: modelInfo.name,
        description: modelInfo.description || 'No description available',
        context_length: modelInfo.context_length,
        pricing: {
          prompt: `$${modelInfo.pricing.prompt}/1K tokens`,
          completion: `$${modelInfo.pricing.completion}/1K tokens`,
        },
        capabilities: {
          functions: modelInfo.capabilities?.functions || false,
          tools: modelInfo.capabilities?.tools || false,
          vision: modelInfo.capabilities?.vision || false,
          json_mode: modelInfo.capabilities?.json_mode || false,
        },
      },
    };

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(response, null, 2),
        },
      ],
    };
  } catch (error) {
    if (error instanceof Error) {
      return {
        content: [
          {
            type: 'text' as const,
            text: `Failed to get model info: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
    throw error;
  }
}
