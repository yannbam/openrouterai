# Contributing to OpenRouter MCP Server

## Development Setup

1. Clone the repository:
```bash
git clone https://github.com/heltonteixeira/openrouterai.git
cd openrouterai
```

2. Install dependencies:
```bash
npm install
```

3. Build the project:
```bash
npm run build
```

## Features

- Chat completion support for all OpenRouter.ai models
- Advanced model search and filtering:
  - Search by name, description, or provider
  - Filter by context length range
  - Filter by maximum price per token
  - Filter by model capabilities
  - Configurable result limits
- Robust API handling:
  - Rate limiting with automatic retry
  - Exponential backoff for failed requests
  - Request caching with automatic expiration
- Performance optimizations:
  - Model information caching (1-hour expiry)
  - Efficient model capability tracking
- Error handling and reporting:
  - Detailed error messages with applied filters
  - Rate limit handling
  - API error recovery

## Model Information

The server provides comprehensive model information:

- **Pricing Data**: Accurate cost per token for both prompt and completion
- **Context Length**: Model-specific maximum context window
- **Capabilities**: Support for:
  - Function calling
  - Tool use
  - Vision/image processing
  - JSON mode
- **Provider Details**: Maximum completion tokens and context lengths

## Rate Limiting

The server implements intelligent rate limit handling:

- Tracks remaining requests through response headers
- Automatically waits when rate limits are reached
- Implements exponential backoff for failed requests
- Provides clear error messages for rate limit issues

## Caching

Model information is cached for optimal performance:

- 1-hour cache duration for model data
- Automatic cache invalidation
- Memory-efficient storage

## Error Handling

Robust error handling for all operations:

- Detailed error responses with applied filters
- Rate limit detection and recovery
- API error reporting with details
- Model validation failures
- Cache-related issues
- Network timeouts and retries

## Tool Implementation Examples

### chat_completion
```typescript
const response = await mcpClient.useTool("openrouterai", "chat_completion", {
  model: "anthropic/claude-3-opus-20240229", // Optional if default model is set in config
  messages: [
    { role: "user", content: "Hello!" }
  ],
  temperature: 0.7
});
```

### search_models
```typescript
const models = await mcpClient.useTool("openrouterai", "search_models", {
  query: "claude",                    // Optional: Search in name/description
  provider: "anthropic",              // Optional: Filter by provider
  minContextLength: 10000,            // Optional: Minimum context length
  maxContextLength: 100000,           // Optional: Maximum context length
  maxPromptPrice: 0.01,              // Optional: Max price per 1K tokens for prompts
  maxCompletionPrice: 0.02,          // Optional: Max price per 1K tokens for completions
  capabilities: {                     // Optional: Required capabilities
    functions: true,
    tools: true,
    vision: false,
    json_mode: true
  },
  limit: 10                          // Optional: Maximum results (default: 10, max: 50)
});
```

### get_model_info
```typescript
const info = await mcpClient.useTool("openrouterai", "get_model_info", {
  model: "anthropic/claude-3-opus-20240229"
});
```

### validate_model
```typescript
const validation = await mcpClient.useTool("openrouterai", "validate_model", {
  model: "anthropic/claude-3-opus-20240229"
});
```

## License

Apache License 2.0 - see LICENSE file for details.
