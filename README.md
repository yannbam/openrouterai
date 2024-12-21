# OpenRouter MCP Server

A Model Context Protocol (MCP) server that provides integration with OpenRouter.ai, allowing access to various AI models through a unified interface.

## Features

- Chat completion support for all OpenRouter.ai models
- Temperature control for response randomness
- Full message history support
- Error handling and reporting

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

## Usage

The server provides a `chat_completion` tool that can be used with any OpenRouter-supported model:

```typescript
const response = await mcpClient.useTool("openrouterai", "chat_completion", {
  model: "meta-llama/llama-3.2-11b-vision-instruct:free",
  messages: [
    { role: "user", content: "Hello!" }
  ],
  temperature: 0.7
});
```

## Available Models

You can use any model available on OpenRouter.ai. Some examples:

- `eva-unit-01/eva-qwen-2.5-72b`
- `x-ai/grok-2-1212`
- `cohere/command-r-08-2024`
- `meta-llama/llama-3.2-11b-vision-instruct:free`

For a complete list, visit [OpenRouter Models](https://openrouter.ai/docs#models).

## License

Apache License 2.0 - see LICENSE file for details.
