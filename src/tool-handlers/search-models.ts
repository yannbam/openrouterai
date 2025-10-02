import { ModelCache } from '../model-cache.js';
import { OpenRouterAPIClient } from '../openrouter-api.js';

export interface SearchModelsToolRequest {
  query?: string;
  provider?: string;
  minContextLength?: number;
  maxContextLength?: number;
  maxPromptPrice?: number;
  maxCompletionPrice?: number;
  capabilities?: {
    functions?: boolean;
    tools?: boolean;
    vision?: boolean;
    json_mode?: boolean;
  };
  limit?: number;
}

export async function handleSearchModels(
  request: { params: { arguments: SearchModelsToolRequest } },
  apiClient: OpenRouterAPIClient,
  modelCache: ModelCache
) {
  const args = request.params.arguments;

  try {
    // Use cached models if available
    let models = modelCache.getCachedModels();
    if (!models) {
      models = await apiClient.fetchModels();
      if (models) {
        modelCache.setCachedModels({ ...models, timestamp: Date.now() });
      }
    }

    if (!models) {
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(
              {
                error: {
                  code: 'fetch_failed',
                  message: 'Failed to fetch models. Please try again.',
                  details: {
                    applied_filters: {
                      query: args.query,
                      provider: args.provider,
                      minContextLength: args.minContextLength,
                      maxContextLength: args.maxContextLength,
                      maxPromptPrice: args.maxPromptPrice,
                      maxCompletionPrice: args.maxCompletionPrice,
                      capabilities: args.capabilities,
                      limit: args.limit,
                    },
                  },
                },
              },
              null,
              2
            ),
          },
        ],
        isError: true,
      };
    }

    // Apply all filters
    const searchResults = models.data
      .filter(model => {
        // Text search
        if (args.query) {
          const searchTerm = args.query.toLowerCase();
          const matchesQuery =
            model.id.toLowerCase().includes(searchTerm) ||
            (model.name && model.name.toLowerCase().includes(searchTerm)) ||
            (model.description && model.description.toLowerCase().includes(searchTerm));
          if (!matchesQuery) return false;
        }

        // Provider filter
        if (args.provider) {
          const provider = model.id.split('/')[0];
          if (provider !== args.provider.toLowerCase()) return false;
        }

        // Context length filters
        if (args.minContextLength && model.context_length < args.minContextLength) return false;
        if (args.maxContextLength && model.context_length > args.maxContextLength) return false;

        // Price filters
        if (args.maxPromptPrice && parseFloat(model.pricing.prompt) > args.maxPromptPrice)
          return false;
        if (
          args.maxCompletionPrice &&
          parseFloat(model.pricing.completion) > args.maxCompletionPrice
        )
          return false;

        // Capabilities filters
        if (args.capabilities) {
          if (args.capabilities.functions && !model.capabilities?.functions) return false;
          if (args.capabilities.tools && !model.capabilities?.tools) return false;
          if (args.capabilities.vision && !model.capabilities?.vision) return false;
          if (args.capabilities.json_mode && !model.capabilities?.json_mode) return false;
        }

        return true;
      })
      // Apply limit
      .slice(0, args.limit || 10)
      .map(model => ({
        id: model.id,
        name: model.name,
        description: model.description || 'No description available',
        context_length: model.context_length,
        pricing: {
          prompt: `$${model.pricing.prompt}/1K tokens`,
          completion: `$${model.pricing.completion}/1K tokens`,
        },
        capabilities: {
          functions: model.capabilities?.functions || false,
          tools: model.capabilities?.tools || false,
          vision: model.capabilities?.vision || false,
          json_mode: model.capabilities?.json_mode || false,
        },
      }));

    const response = {
      id: `search-${Date.now()}`,
      object: 'list',
      data: searchResults,
      created: Math.floor(Date.now() / 1000),
      metadata: {
        total_models: models.data.length,
        filtered_count: searchResults.length,
        applied_filters: {
          query: args.query,
          provider: args.provider,
          minContextLength: args.minContextLength,
          maxContextLength: args.maxContextLength,
          maxPromptPrice: args.maxPromptPrice,
          maxCompletionPrice: args.maxCompletionPrice,
          capabilities: args.capabilities,
          limit: args.limit,
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
            text: `Failed to search models: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
    throw error;
  }
}
