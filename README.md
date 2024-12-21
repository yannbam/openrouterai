# OpenRouter MCP Server

A Model Context Protocol (MCP) server that provides integration with OpenRouter.ai, allowing access to various AI models through a unified interface.

## Features

- Chat completion support for all OpenRouter.ai models
- Model management with default model selection
- Model search and information retrieval
- Temperature control for response randomness
- Full message history support
- Error handling and reporting
- Model validation and verification

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

## Available Models

You can use any model available on OpenRouter.ai. Some examples:

- `anthropic/claude-3-opus-20240229`
- `anthropic/claude-3-sonnet-20240229`
- `cohere/command-r-08-2024`
- `meta-llama/llama-3.2-11b-vision-instruct:free`

For a complete list and pricing information, use the `list_models` tool or visit [OpenRouter Models](https://openrouter.ai/docs#models).

## License

Apache License 2.0 - see LICENSE file for details.
