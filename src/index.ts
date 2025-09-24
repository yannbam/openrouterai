#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import { ToolHandlers } from './tool-handlers.js';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const DEFAULT_MODEL = process.env.OPENROUTER_DEFAULT_MODEL;

if (!OPENROUTER_API_KEY) {
  throw new Error('OPENROUTER_API_KEY environment variable is required');
}

class OpenRouterServer {
  private server: McpServer;
  private toolHandlers: ToolHandlers;

  constructor() {
    this.server = new McpServer(
      {
        name: 'openrouter-server',
        version: '2.3.0',
      },
      {
        capabilities: {
          tools: { listChanged: true },
          resources: { listChanged: true }, // to prevent method not found error
          prompts: { listChanged: true }, // to prevent method not found error
        },
      }
    );

    // Initialize tool handlers
    this.toolHandlers = new ToolHandlers(
      this.server,
      OPENROUTER_API_KEY as string, // Already validated above
      DEFAULT_MODEL
    );

    // Process signal handling
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    // eslint-disable-next-line no-console
    console.error('OpenRouter MCP server running on stdio');
  }
}

const server = new OpenRouterServer();
// eslint-disable-next-line no-console
server.run().catch(console.error);
