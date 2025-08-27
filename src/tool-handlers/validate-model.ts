import { ModelCache } from '../model-cache.js';

export interface ValidateModelToolRequest {
  model: string;
}

export async function handleValidateModel(
  request: { params: { arguments: ValidateModelToolRequest } },
  modelCache: ModelCache
) {
  const { model } = request.params.arguments;
  const isValid = await modelCache.validateModel(model);

  const response = {
    id: `validate-${Date.now()}`,
    object: 'model.validation',
    created: Math.floor(Date.now() / 1000),
    data: {
      model: model,
      valid: isValid,
      error: isValid
        ? null
        : {
            code: 'model_not_found',
            message: 'The specified model was not found in the available models list',
          },
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
}
