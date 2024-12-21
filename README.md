# OpenRouter MCP Server

A Model Context Protocol (MCP) server that provides integration with OpenRouter.ai, allowing access to various AI models through a unified interface.

## Features

- Chat completion support for all OpenRouter.ai models
- Advanced model management:
  - Default model selection
  - Model search and validation
  - Accurate pricing and context length information
  - Model capability detection (functions, tools, vision, json_mode)
- Robust API handling:
  - Rate limiting with automatic retry
  - Exponential backoff for failed requests
  - Request caching with automatic expiration
- Performance optimizations:
  - Model information caching (1-hour expiry)
  - State management with validation
  - Efficient model capability tracking
- Error handling and reporting:
  - Detailed error messages
  - Rate limit handling
  - API error recovery

## Installation

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

## Configuration

Add the server to your MCP settings configuration file:

```json
{
  "mcpServers": {
    "openrouterai": {
      "command": "node",
      "args": ["path/to/openrouterai/build/index.js"],
      "env": {
        "OPENROUTER_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

## Available Tools

### chat_completion
Send messages to OpenRouter.ai models:
```typescript
const response = await mcpClient.useTool("openrouterai", "chat_completion", {
  model: "anthropic/claude-3-opus-20240229", // Optional if default model is set
  messages: [
    { role: "user", content: "Hello!" }
  ],
  temperature: 0.7
});
```

### list_models
List all available models with pricing and context length:
```typescript
const models = await mcpClient.useTool("openrouterai", "list_models", {});
```

### search_models
Search for specific models by name or provider:
```typescript
const models = await mcpClient.useTool("openrouterai", "search_models", {
  query: "claude" // Searches for models containing "claude"
});
```

### set_default_model
Set a default model for subsequent chat completions:
```typescript
await mcpClient.useTool("openrouterai", "set_default_model", {
  model: "anthropic/claude-3-opus-20240229"
});
```

### clear_default_model
Clear the currently set default model:
```typescript
await mcpClient.useTool("openrouterai", "clear_default_model", {});
```

### get_model_info
Get detailed information about a specific model:
```typescript
const info = await mcpClient.useTool("openrouterai", "get_model_info", {
  model: "anthropic/claude-3-opus-20240229"
});
```

### validate_model
Check if a model ID is valid:
```typescript
const isValid = await mcpClient.useTool("openrouterai", "validate_model", {
  model: "anthropic/claude-3-opus-20240229"
});
```

## Model Information

The server now provides accurate model information directly from OpenRouter.ai:

- **Pricing Data**: Accurate cost per token for both prompt and completion
- **Context Length**: Model-specific maximum context window
- **Capabilities**: Support for:
  - Function calling
  - Tool use
  - Vision/image processing
  - JSON mode
- **Provider Details**: Maximum completion tokens and context lengths

Use the `list_models` tool to get up-to-date information about available models and their capabilities.

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
- Cache bypass for force-refresh
- Memory-efficient storage

## Error Handling

Robust error handling for all operations:

- Rate limit detection and recovery
- API error reporting with details
- Model validation failures
- Cache-related issues
- Network timeouts and retries

## License

Apache License 2.0 - see LICENSE file for details.
