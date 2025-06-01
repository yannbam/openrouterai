import { OpenRouterAPIClient } from '../openrouter-api.js';

export interface GetModelProvidersToolRequest {
  model: string;
}

export async function handleGetModelProviders(
  request: { params: { arguments: GetModelProvidersToolRequest } },
  apiClient: OpenRouterAPIClient
) {
  const { model } = request.params.arguments;

  try {
    const endpointsResponse = await apiClient.fetchModelEndpoints(model);
    
    if (!endpointsResponse || !endpointsResponse.data || !endpointsResponse.data.endpoints) {
      return {
        content: [
          {
            type: 'text',
            text: `No provider endpoints found for model: ${model}`,
          },
        ],
        isError: true,
      };
    }

    const response = {
      id: `providers-${Date.now()}`,
      object: 'model.providers',
      created: Math.floor(Date.now() / 1000),
      model: model,
      data: {
        model_info: {
          id: endpointsResponse.data.id,
          name: endpointsResponse.data.name,
          description: endpointsResponse.data.description,
          created: endpointsResponse.data.created,
          architecture: endpointsResponse.data.architecture
        },
        providers: endpointsResponse.data.endpoints
      }
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
