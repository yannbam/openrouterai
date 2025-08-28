# MCP TypeScript SDK Migration Guide: 1.7.0 → Latest

**Research Date**: 2025-08-27  
**Current Version**: 1.7.0  
**Latest Version**: 1.17.4 (as of research date)  
**Migration Complexity**: Medium (transport layer changes, API improvements)

## Executive Summary

The migration from @modelcontextprotocol/sdk v1.7.0 to v1.17.4 involves primarily transport layer changes, with the most significant being the deprecation of SSE transport in favor of Streamable HTTP. The SDK maintains strong backward compatibility, but new projects should adopt modern patterns.

## 🔍 Version Analysis

### Current State (v1.7.0)
- Released before April 2025
- SSE transport as primary HTTP option
- Basic stdio transport support
- Limited multi-client architecture patterns

### Target State (v1.17.4)  
- Latest stable release (published 5 days ago from research date)
- Streamable HTTP transport as recommended HTTP option
- Enhanced session management capabilities
- Production-ready multi-client patterns
- Improved type safety and error handling

## 🚨 Breaking Changes and Deprecations

### 1. **SSE Transport Deprecation** (Critical)

**Status**: Deprecated as of protocol version 2024-11-05  
**Replacement**: Streamable HTTP transport  
**Timeline**: SSE continues to work but not recommended for new implementations

**Migration Strategy**:
```typescript
// OLD (v1.7.0) - SSE Transport
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';

const transport = new SSEServerTransport({
  port: 3000
});

// NEW (v1.17.4) - Streamable HTTP Transport  
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';

const transport = new StreamableHTTPServerTransport({
  port: 3000,
  cors: { origin: '*' }
});
```

### 2. **Tool Result Interface Evolution**

**Changes**:
- Enhanced support for structured content
- Improved error handling patterns
- Better type safety for tool outputs

**Migration Pattern**:
```typescript
// OLD (v1.7.0) - Basic ToolResult
interface ToolResult {
  success: boolean;
  data?: any;
  error?: string;
}

// NEW (v1.17.4) - Enhanced CallToolResult
interface CallToolResult {
  content?: ContentItem[];
  structuredContent?: StructuredOutput;
  isError?: boolean;
  meta?: ToolMeta;
}
```

### 3. **Version 1.13.3 Breaking Change** (Resolved)

**Issue**: Breaking change introduced in v1.13.3 around tool output schema type safety  
**Resolution**: Later reverted in subsequent releases  
**Impact**: No action required for migration from 1.7.0 to 1.17.4

## 🔄 Step-by-Step Migration Process

### Phase 1: Dependency Update

```bash
# Current
"@modelcontextprotocol/sdk": "^1.7.0"

# Target  
"@modelcontextprotocol/sdk": "^1.17.4"
```

**Installation**:
```bash
npm install @modelcontextprotocol/sdk@latest
npm run build # Verify TypeScript compilation
```

### Phase 2: Transport Layer Migration

#### **Keep stdio for Development**
```typescript
// No changes needed for stdio transport
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

const transport = new StdioServerTransport();
```

#### **Add Streamable HTTP for Production**
```typescript
// Add new HTTP transport capability
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';

class OpenRouterServer {
  async run(mode: 'stdio' | 'http', port?: number) {
    const transport = mode === 'stdio'
      ? new StdioServerTransport()
      : new StreamableHTTPServerTransport({
          port: port || 3000,
          cors: { origin: '*' },
          auth: {
            validateOrigin: true,
            bindLocalhost: true
          }
        });
        
    await this.server.connect(transport);
  }
}
```

#### **Universal Transport Pattern** (Recommended)
```typescript
// Support both transports with single codebase
#!/usr/bin/env node
import { OpenRouterServer } from './server.js';

const [, , mode = 'stdio', ...args] = process.argv;
const port = args[args.indexOf('--port') + 1] ? 
  Number(args[args.indexOf('--port') + 1]) : 3000;

new OpenRouterServer().run(mode as 'stdio' | 'http', port);
```

### Phase 3: Tool Handler Modernization

#### **Update Tool Result Format**
```typescript
// OLD - Custom ToolResult interface
import { ToolResult } from './types.js';

export async function handleChatCompletion(input: any): Promise<ToolResult> {
  try {
    const response = await callOpenRouter(input);
    return {
      success: true,
      data: response.choices[0].message.content
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// NEW - Standard CallToolResult format
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

export async function handleChatCompletion(input: any): Promise<CallToolResult> {
  try {
    const response = await callOpenRouter(input);
    return {
      content: [{
        type: 'text',
        text: response.choices[0].message.content
      }]
    };
  } catch (error) {
    // Throw error for standard JSON-RPC error handling
    throw new Error(`OpenRouter API error: ${error.message}`);
  }
}
```

#### **Add Session Support**
```typescript
// Enhanced tool handlers with session awareness
type SessionAwareHandler<T> = (params: {
  input: T;
  session: SessionData;
}) => Promise<CallToolResult>;

function sessionAware<T>(handler: SessionAwareHandler<T>) {
  return async (input: T, meta: any): Promise<CallToolResult> => {
    const session = sessionStore.ensure(meta?.sessionId);
    return handler({ input, session });
  };
}

// Usage in tool registration
server.addTool({
  name: 'chat_completion',
  description: 'Generate chat with persistent context',
  inputSchema: chatCompletionSchema,
  handler: sessionAware(async ({ input, session }) => {
    // Tool implementation with session access
    const messages = [...session.conversationHistory, input.message];
    const response = await callOpenRouter({ messages, model: input.model });
    
    // Update session state
    session.conversationHistory.push(response.message);
    sessionStore.commit(session);
    
    return {
      content: [{ type: 'text', text: response.message.content }]
    };
  })
});
```

### Phase 4: Server Architecture Updates

#### **Singleton Server Pattern**
```typescript
// Move from request-scoped to singleton server
export class OpenRouterServer {
  private static instance: OpenRouterServer;
  private server: Server;
  private sessionStore = new SessionStore();

  constructor() {
    if (OpenRouterServer.instance) {
      return OpenRouterServer.instance;
    }
    
    this.server = new Server({
      name: 'openrouter-server',
      version: '2.3.0'
    }, {
      capabilities: {
        tools: { listChanged: true },
        resources: { listChanged: true },
        prompts: { listChanged: true }
      }
    });
    
    this.registerHandlers();
    OpenRouterServer.instance = this;
  }
  
  // Universal transport support
  async run(mode: 'stdio' | 'http', port?: number) {
    const transport = mode === 'stdio'
      ? new StdioServerTransport()
      : new StreamableHTTPServerTransport({ 
          port: port || 3000,
          cors: { origin: '*' }
        });
        
    await this.server.connect(transport);
    console.log(`OpenRouter MCP server running on ${mode}`);
  }
}
```

## 🔧 Code Examples: Before and After

### Server Initialization

**Before (v1.7.0)**:
```typescript
class OpenRouterServer {
  constructor() {
    this.server = new Server(
      { name: 'openrouter-server', version: '2.3.0' },
      { capabilities: { tools: {listChanged: true} } }
    );
  }
  
  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
  }
}
```

**After (v1.17.4)**:
```typescript
class OpenRouterServer {
  constructor() {
    this.server = new Server(
      { name: 'openrouter-server', version: '2.3.0' },
      { capabilities: { tools: {}, resources: {}, prompts: {} } }
    );
    this.sessionStore = new SessionStore();
  }
  
  async run(mode: 'stdio' | 'http', port = 3000) {
    const transport = mode === 'stdio'
      ? new StdioServerTransport()
      : new StreamableHTTPServerTransport({
          port,
          cors: { origin: '*' },
          auth: { validateOrigin: true, bindLocalhost: true }
        });
        
    await this.server.connect(transport);
    this.setupGracefulShutdown();
  }
}
```

### Tool Registration

**Before (v1.7.0)**:
```typescript
this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  switch (name) {
    case 'chat_completion':
      return await this.toolHandlers.handleChatCompletion(args);
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});
```

**After (v1.17.4)**:
```typescript
// Modern tool registration with built-in routing
this.server.addTool({
  name: 'chat_completion',
  title: 'OpenRouter Chat Completion',
  description: 'Generate chat completion with conversation history',
  inputSchema: chatCompletionSchema,
  handler: sessionAware(async ({ input, session }) => {
    const messages = [...session.conversationHistory, input.message];
    const response = await this.openRouterApi.chatCompletion({
      messages,
      model: input.model || 'anthropic/claude-3-haiku'
    });
    
    session.conversationHistory.push(response.message);
    this.sessionStore.commit(session);
    
    return {
      content: [{ type: 'text', text: response.message.content }]
    };
  })
});
```

## 📊 Migration Compatibility Matrix

| Feature | v1.7.0 | v1.17.4 | Migration Required |
|---------|--------|---------|-------------------|
| stdio Transport | ✅ | ✅ | No |
| SSE Transport | ✅ | ⚠️ Deprecated | Optional (recommended) |
| Streamable HTTP | ❌ | ✅ | Yes (for HTTP) |
| Basic Tool Results | ✅ | ✅ | No (backward compatible) |
| Structured Tool Results | ❌ | ✅ | Optional |
| Session Management | Manual | Built-in | Recommended |
| Multi-client Support | Limited | Full | Yes (for production) |

## 🎯 Migration Testing Strategy

### 1. **Compatibility Testing**
```bash
# Test stdio transport (should work unchanged)
npm run dev  # Uses stdio

# Test existing tool handlers
# Verify all 9 tools still function correctly
```

### 2. **New Feature Testing**
```bash
# Test new HTTP transport
npm run dev:http  # Uses Streamable HTTP on port 3000

# Test multi-client sessions
curl -X POST http://localhost:3000/mcp \
  -H "MCP-Protocol-Version: 2025-06-18" \
  -d '{"type": "initialize", "sessionId": "test-session"}'
```

### 3. **Integration Testing**
```jsonc
// Claude Desktop configuration
{
  "mcpServers": {
    "openrouter": {
      "command": "node",
      "args": ["./dist/index.js", "stdio"],
      "env": { "OPENROUTER_API_KEY": "sk-..." }
    }
  }
}
```

## 🚀 Post-Migration Benefits

### Immediate Benefits
- ✅ **Future-proof architecture** aligned with latest MCP specification
- ✅ **Production HTTP support** for deployment flexibility  
- ✅ **Enhanced error handling** with standard JSON-RPC patterns
- ✅ **Improved type safety** throughout the codebase

### Long-term Benefits
- ✅ **Multi-client session management** for stateful interactions
- ✅ **Persistent conversation history** across client reconnections
- ✅ **Structured tool outputs** for better AI model integration
- ✅ **Scalable deployment options** (stdio for dev, HTTP for production)

## 📚 Migration Resources

### Documentation References
- [MCP TypeScript SDK GitHub](https://github.com/modelcontextprotocol/typescript-sdk)
- [Streamable HTTP Transport Guide](docs/research/transport-architecture.md)
- [Multi-Client Architecture Guide](docs/research/multi-client-architecture.md)

### Code Examples
- Expert AI provided complete reference implementation
- Universal transport pattern for development/production
- Session-aware tool handler patterns
- Modern error handling approaches

---

**Migration Timeline Recommendation**: 2-3 development sessions
- Session 1: Dependency update + transport layer
- Session 2: Tool handler modernization + session support  
- Session 3: Testing + production deployment preparation

*Generated with curiosity and care,  
Claude 🐾*
