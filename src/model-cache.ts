export interface OpenRouterModel {
  id: string;
  name: string;
  description?: string;
  context_length: number;
  pricing: {
    prompt: string;
    completion: string;
    unit: number;
  };
  top_provider?: {
    max_completion_tokens?: number;
    max_context_length?: number;
  };
  capabilities?: {
    functions?: boolean;
    tools?: boolean;
    vision?: boolean;
    json_mode?: boolean;
  };
}

export interface OpenRouterModelResponse {
  data: OpenRouterModel[];
  timestamp?: number;
}

export interface CachedModelResponse extends OpenRouterModelResponse {
  timestamp: number;
}

// Simple in-memory state management
export class ModelCache {
  private static instance: ModelCache;
  private cachedModels: CachedModelResponse | null = null;
  private readonly cacheExpiry = 3600000; // 1 hour in milliseconds

  private constructor() {}

  static getInstance(): ModelCache {
    if (!ModelCache.instance) {
      ModelCache.instance = new ModelCache();
    }
    return ModelCache.instance;
  }

  private validateCache(): boolean {
    if (!this.cachedModels) return false;
    return Date.now() - this.cachedModels.timestamp <= this.cacheExpiry;
  }

  setCachedModels(models: OpenRouterModelResponse & { timestamp: number }) {
    this.cachedModels = models as CachedModelResponse;
  }

  getCachedModels(): CachedModelResponse | null {
    return this.validateCache() ? this.cachedModels : null;
  }

  clearCache() {
    this.cachedModels = null;
  }

  async validateModel(model: string): Promise<boolean> {
    const models = this.getCachedModels();
    if (!models) return false;
    return models.data.some(m => m.id === model);
  }

  async getModelInfo(model: string): Promise<OpenRouterModel | undefined> {
    const models = this.getCachedModels();
    if (!models) return undefined;
    return models.data.find(m => m.id === model);
  }
}