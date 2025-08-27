import { ModelCache } from '../model-cache.js';
import { OpenRouterAPIClient } from '../openrouter-api.js';

export interface GetModelProvidersToolRequest {
  model: string;
}

export async function handleGetModelProviders(
  request: { params: { arguments: GetModelProvidersToolRequest } },
  apiClient: OpenRouterAPIClient,
  modelCache: ModelCache
) {
  const { model } = request.params.arguments;

  try {
    // Try to validate model from cache first
    let isValidModel = await modelCache.validateModel(model);

    if (!isValidModel) {
      // Cache might be empty or expired, fetch models from API
      const models = await apiClient.fetchModels();
      if (models) {
        modelCache.setCachedModels({ ...models, timestamp: Date.now() });
        // Try validation again from newly cached data
        isValidModel = await modelCache.validateModel(model);
      }
    }

    if (!isValidModel) {
      return {
        content: [
          {
            type: 'text',
            text: `Model '${model}' not found in available models list. Use ai-chat_search_models to find available models.`,
          },
        ],
        isError: true,
      };
    }

    // Model is valid, fetch its provider endpoints
    const endpointsResponse = await apiClient.fetchModelEndpoints(model);

    if (!endpointsResponse || !endpointsResponse.data) {
      return {
        content: [
          {
            type: 'text',
            text: `Failed to fetch provider information for model: ${model}`,
          },
        ],
        isError: true,
      };
    }

    // Return only the providers/endpoints, not the full model info
    const response = {
      id: `providers-${Date.now()}`,
      object: 'model.providers',
      created: Math.floor(Date.now() / 1000),
      model: model,
      data: {
        providers: endpointsResponse.data.endpoints || [],
      },
    };

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response, null, 2),
        },
      ],
    };
  } catch (error) {
    if (error instanceof Error) {
      return {
        content: [
          {
            type: 'text',
            text: `Failed to get model providers: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
    throw error;
  }
}
