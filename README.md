# OpenRouter MCP Server

[![MCP Server](https://img.shields.io/badge/MCP-Server-green)](https://github.com/heltonteixeira/openrouterai)
[![Version](https://img.shields.io/badge/version-2.3.0-blue)](CHANGELOG.md)
[![TypeScript](https://img.shields.io/badge/language-TypeScript-blue)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/license-Apache%202.0-brightgreen)](LICENSE)

A Model Context Protocol (MCP) server providing seamless integration with OpenRouter.ai's diverse model ecosystem. Access various AI models through a unified, type-safe interface with built-in caching, rate limiting, and error handling.

<a href="https://glama.ai/mcp/servers/xdnmf8yei0"><img width="380" height="200" src="https://glama.ai/mcp/servers/xdnmf8yei0/badge" alt="OpenRouter Server MCP server" /></a>

## Features

- **Model Access**
  - Direct access to all OpenRouter.ai models
  - Automatic model validation and capability checking
  - Default model configuration support

- **Performance Optimization**
  - Smart model information caching (1-hour expiry)
  - Automatic rate limit management
  - Exponential backoff for failed requests

- **Robust Error Handling**
  - Detailed error messages with context
  - Rate limit detection and recovery
  - Network timeout handling with retries

- **Conversation Persistence**
  - Maintain history across multiple `chat_completion` calls.
  - Log arbitrary tool calls and their results to specific conversations.
  - Manage conversations with dedicated tools.

## Installation

```bash
npm install @mcpservers/openrouterai
```

## Configuration

### Prerequisites

1. Get your OpenRouter API key from [OpenRouter Keys](https://openrouter.ai/keys)
2. Choose a default model (optional)

### Setup

Add to your MCP settings configuration file (`cline_mcp_settings.json` or `claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "openrouterai": {
      "command": "npx",
      "args": ["@mcpservers/openrouterai"],
      "env": {
        "OPENROUTER_API_KEY": "your-api-key-here",
        "OPENROUTER_DEFAULT_MODEL": "optional-default-model"
      }
    }
  }
}
```

## Available Tools

### chat_completion
Send messages to OpenRouter.ai models and maintain conversation history.

**Input:**
```typescript
{
  conversationId?: string; // Optional: ID of an existing conversation to continue. If not provided, a new one is created.
  model?: string;          // Optional if default model is set
  messages: {
    role: "system" | "user" | "assistant";
    content: string;
  }[]; // New messages for the current turn.
  temperature?: number;    // Optional (0-2), defaults to 1.0
}
```

**Output:**
The tool returns a standard chat completion response from the OpenRouter API, along with the `conversationId`.
```typescript
{
  content: [
    {
      type: 'text',
      text: '/* JSON string of OpenRouter API response */'
    }
  ],
  conversationId: string; // ID of the conversation (either passed in or newly created)
  isError?: boolean;     // True if an error occurred
}
```
If `conversationId` is provided in the input, the conversation's existing history will be automatically prepended to the `messages` for the API call. The new user messages and the assistant's response will be appended to this conversation's history. If no `conversationId` is provided, a new conversation is created, and its ID is returned in the `conversationId` field of the output.

### ai-text_completion
Generate text completion from a prompt using OpenRouter.ai models.

**Input:**
```typescript
{
  conversationId?: string; // Optional: ID of an existing conversation to continue
  model: string;           // Required: Model identifier
  prompt: string;          // Required: The text prompt to complete
  max_tokens?: number;     // Optional: Maximum tokens to generate
  temperature?: number;    // Optional: Sampling temperature (0-2)
  seed?: number;          // Optional: Random seed for deterministic generation
}
```

**Output:**
Returns just the completion text with clean formatting.
```typescript
{
  content: [
    {
      type: 'text',
      text: 'conversationId: xyz\n\nThe completion text...'
    }
  ],
  isError?: boolean;     // True if an error occurred
}
```

**Conversation Continuation:** When a `conversationId` is provided, the new prompt will be appended to the last assistant response from that conversation, enabling seamless text continuation.

**Note on "Looming":** For generating alternative conversation branches, the typical workflow involves: 1) generating multiple completions of the same prompt and choosing which branch to continue, and 2) slightly editing or cropping the response before feeding it back as input.

### Logging Tool Calls to Conversations

For any tool call (including `search_models`, `get_model_info`, `validate_model`, and the conversation management tools themselves), you can optionally include a `conversationId` field at the top level of the `params` object in your `CallToolRequest`.

Example `CallToolRequest` params:
```json
{
  "name": "search_models",
  "conversationId": "your-active-conversation-id", // Optional
  "arguments": {
    "query": "gemini"
  }
}
```

If a valid `conversationId` is provided, two messages with `role: 'tool'` will be added to that conversation's history:
1.  A message before the tool executes, logging the tool name and its arguments.
2.  A message after the tool executes, logging the tool name and its result.

This allows you to keep a comprehensive record of all interactions, including informational tool calls, within the context of a specific conversation. This does *not* apply to `chat_completion` calls, as they have their own more detailed message logging.

### search_models
Search and filter available models:
```typescript
{
  query?: string;          // Search in name/description
  provider?: string;       // Filter by provider
  minContextLength?: number;
  maxContextLength?: number;
  maxPromptPrice?: number;
  maxCompletionPrice?: number;
  capabilities?: {
    functions?: boolean;   // Function calling support
    tools?: boolean;       // Tool use support
    vision?: boolean;      // Image processing support
    json_mode?: boolean;   // JSON mode support
  };
  limit?: number;          // Default: 10, max: 50
}
```

### get_model_info
Get detailed information about a specific model:
```typescript
{
  model: string;           // Model identifier
}
```

### validate_model
Check if a model ID is valid:
```typescript
{
  model: string;           // Model identifier to validate
}
```

### Conversation Management Tools

These tools help you manage conversation histories.

#### list_conversations
Lists summaries of all available conversations.

**Input:**
```typescript
{} // No arguments required
```
**Output:**
Returns a JSON string array of conversation summaries, including `id`, `createdAt`, `lastUpdatedAt`, and `messageCount`.

#### get_conversation_history
Gets the full message history for a specific conversation.

**Input:**
```typescript
{
  conversationId: string; // The ID of the conversation to retrieve.
}
```
**Output:**
Returns a JSON string array of all messages in the conversation. Includes `conversationId` in the response.

#### delete_conversation
Deletes a specific conversation and its history.

**Input:**
```typescript
{
  conversationId: string; // The ID of the conversation to delete.
}
```
**Output:**
Returns a success message if the conversation was found and deleted.

## Rate Limiting

The server implements intelligent rate limit handling:
- Tracks remaining requests through response headers
- Automatically waits when rate limits are reached
- Implements exponential backoff for failed requests
- Provides clear error messages for rate limit issues

## Error Handling

The server uses `McpError` for MCP-specific errors with clear messages:
- Invalid model errors
- API rate limiting
- Authentication issues
- Network errors
- Invalid parameter errors

## Development

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed information about:
- Development setup
- Project structure
- Feature implementation
- Error handling guidelines
- Tool usage examples

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for version history and migration guides.

## License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.