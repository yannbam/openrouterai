# MCP Transport Architecture Guide

**Research Date**: 2025-08-27  
**Focus**: stdio vs SSE vs Streamable HTTP transport mechanisms  
**Audience**: OpenRouter MCP Server modernization  
**Sources**: MCP specification 2025-06-18, expert AI consultation, GitHub SDK examples

## Executive Summary

Model Context Protocol supports multiple transport mechanisms, each with distinct use cases, capabilities, and architectural implications. This guide provides comprehensive technical details for implementing robust transport layers that support both development and production deployment scenarios.

## 📡 Transport Mechanism Overview

| Transport | Status | Use Case | Multi-Client | Complexity | Recommendation |
|-----------|--------|----------|--------------|-------------|----------------|
| **stdio** | Stable | Local development | No | Low | Development only |
| **SSE** | Deprecated | Legacy HTTP | Yes | Medium | Migrate away |
| **Streamable HTTP** | Recommended | Production HTTP | Yes | Medium | Production ready |

## 🔌 stdio Transport

### Architecture
- **Communication**: JSON-RPC over stdin/stdout
- **Process Model**: Parent launches child subprocess
- **Message Format**: Newline-delimited JSON-RPC
- **Logging**: stderr for server logs (won't interfere with protocol)

### Implementation Details

```typescript
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

class OpenRouterServer {
  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    
    // Server logs go to stderr (safe)
    console.error('OpenRouter MCP server running on stdio');
  }
}
```

### Message Flow
```
Client Process                 Server Process
     |                              |
     |---(spawn subprocess)-------->|
     |                              |
     |---(JSON-RPC via stdin)------>|
     |                              |
     |<--(JSON-RPC via stdout)------|
     |                              |
     |<--(logs via stderr)----------|
```

### Use Cases
- **Claude Desktop integration**: Primary use case
- **Local development**: Simplified debugging
- **CI/CD testing**: Automated testing scenarios
- **Single-client applications**: No concurrent user requirements

### Limitations
- **No multi-client support**: One client per server process
- **Process overhead**: New process for each client connection
- **No network accessibility**: Local only
- **Limited scaling**: Not suitable for production web services

## 🌊 Streamable HTTP Transport (Recommended)

### Architecture
- **Communication**: HTTP POST/GET with optional Server-Sent Events
- **Process Model**: Long-running server process with multiple client connections
- **Message Format**: JSON-RPC over HTTP
- **Streaming**: Server-Sent Events for real-time communication

### Implementation Details

```typescript
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';

class OpenRouterServer {
  async run(port: number = 3000) {
    const transport = new StreamableHTTPServerTransport({
      port,
      cors: {
        origin: '*', // Configure appropriately for production
        credentials: true
      },
      auth: {
        validateOrigin: true,    // Prevent DNS rebinding attacks
        bindLocalhost: true,     // Bind to 127.0.0.1 for local servers
        requireAuth: false       // Set to true for production
      }
    });
    
    await this.server.connect(transport);
    console.log(`OpenRouter MCP server running on http://localhost:${port}`);
  }
}
```

### HTTP Endpoint Structure

```
POST /mcp
Content-Type: application/json
MCP-Protocol-Version: 2025-06-18

{
  "jsonrpc": "2.0",
  "id": "request-1",
  "method": "tools/call",
  "params": {
    "name": "chat_completion",
    "arguments": { "prompt": "Hello" }
  }
}
```

### Server-Sent Events for Streaming

```typescript
// Client establishes SSE connection
GET /mcp/stream?sessionId=abc123
Accept: text/event-stream
MCP-Protocol-Version: 2025-06-18

// Server streams responses
event: tool_result
data: {"id": "request-1", "result": {"content": [...]}}

event: conversation_update  
data: {"sessionId": "abc123", "messageCount": 5}
```

### Advanced Configuration

```typescript
const transport = new StreamableHTTPServerTransport({
  port: 3000,
  
  // CORS configuration
  cors: {
    origin: process.env.NODE_ENV === 'production' 
      ? ['https://trusted-client.com']
      : '*',
    credentials: true,
    optionsSuccessStatus: 200
  },
  
  // Security settings
  auth: {
    validateOrigin: true,
    bindLocalhost: process.env.NODE_ENV !== 'production',
    requireAuth: true,
    authValidator: async (request) => {
      const token = request.headers.authorization?.replace('Bearer ', '');
      return await validateJWTToken(token);
    }
  },
  
  // Session management
  session: {
    timeout: 30 * 60 * 1000, // 30 minutes
    cleanupInterval: 5 * 60 * 1000, // 5 minutes
    maxSessions: 1000
  },
  
  // Rate limiting
  rateLimiting: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // requests per window
    standardHeaders: true
  }
});
```

### Multi-Client Session Management

```typescript
interface SessionMetadata {
  sessionId: string;
  clientId: string;
  createdAt: number;
  lastActivity: number;
  protocolVersion: string;
  capabilities: ClientCapabilities;
  conversationHistory: ConversationMessage[];
}

class SessionManager {
  private sessions = new Map<string, SessionMetadata>();
  
  ensureSession(sessionId?: string): SessionMetadata {
    if (!sessionId) {
      sessionId = crypto.randomUUID();
    }
    
    if (!this.sessions.has(sessionId)) {
      this.sessions.set(sessionId, {
        sessionId,
        clientId: crypto.randomUUID(),
        createdAt: Date.now(),
        lastActivity: Date.now(),
        protocolVersion: '2025-06-18',
        capabilities: {},
        conversationHistory: []
      });
    }
    
    const session = this.sessions.get(sessionId)!;
    session.lastActivity = Date.now();
    return session;
  }
  
  cleanupExpiredSessions(timeoutMs: number = 30 * 60 * 1000) {
    const now = Date.now();
    for (const [id, session] of this.sessions) {
      if (now - session.lastActivity > timeoutMs) {
        this.sessions.delete(id);
      }
    }
  }
}
```

### Use Cases
- **Production web deployments**: Multi-client web applications
- **API-style integrations**: RESTful MCP access
- **Stateful applications**: Persistent conversation history
- **Scalable architectures**: Horizontal scaling support

## 🔀 Universal Transport Pattern (Recommended)

### Hybrid Implementation

```typescript
#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';

export class OpenRouterServer {
  private server: Server;
  private sessionManager = new SessionManager();

  constructor() {
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
    
    this.registerToolHandlers();
    this.setupErrorHandling();
  }

  async run(mode: 'stdio' | 'http', options: {
    port?: number;
    cors?: boolean;
    auth?: boolean;
  } = {}) {
    const transport = await this.createTransport(mode, options);
    await this.server.connect(transport);
    
    console.log(`OpenRouter MCP server running on ${mode}${
      mode === 'http' ? ` (port ${options.port || 3000})` : ''
    }`);
    
    this.setupGracefulShutdown();
  }

  private async createTransport(mode: string, options: any) {
    switch (mode) {
      case 'stdio':
        return new StdioServerTransport();
        
      case 'http':
        return new StreamableHTTPServerTransport({
          port: options.port || 3000,
          cors: options.cors ? { origin: '*' } : undefined,
          auth: options.auth ? {
            validateOrigin: true,
            bindLocalhost: true
          } : undefined
        });
        
      default:
        throw new Error(`Unsupported transport mode: ${mode}`);
    }
  }

  private setupGracefulShutdown() {
    const cleanup = async () => {
      console.log('Shutting down OpenRouter MCP server...');
      await this.sessionManager.persistSessions();
      await this.server.close();
      process.exit(0);
    };
    
    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
  }
}

// CLI interface
const [, , mode = 'stdio', ...args] = process.argv;
const options = {
  port: args.includes('--port') ? 
    Number(args[args.indexOf('--port') + 1]) : 3000,
  cors: args.includes('--cors'),
  auth: args.includes('--auth')
};

new OpenRouterServer().run(mode as 'stdio' | 'http', options);
```

### Package.json Scripts

```json
{
  "scripts": {
    "dev": "tsx src/index.ts stdio",
    "dev:http": "tsx src/index.ts http --port 3000 --cors",
    "start": "node dist/index.js stdio",
    "start:http": "node dist/index.js http --port 3000 --cors --auth",
    "build": "tsc && chmod +x dist/index.js"
  }
}
```

### Environment-based Configuration

```typescript
// config.ts
export const getTransportConfig = () => {
  const mode = process.env.MCP_TRANSPORT || 'stdio';
  
  switch (mode) {
    case 'stdio':
      return { mode: 'stdio' as const };
      
    case 'http':
      return {
        mode: 'http' as const,
        port: Number(process.env.MCP_HTTP_PORT) || 3000,
        cors: process.env.MCP_CORS === 'true',
        auth: process.env.MCP_AUTH === 'true'
      };
      
    default:
      throw new Error(`Invalid MCP_TRANSPORT: ${mode}`);
  }
};

// Usage
const config = getTransportConfig();
new OpenRouterServer().run(config.mode, config);
```

## 🔒 Security Considerations

### stdio Transport Security
- **Process isolation**: Each client gets separate process
- **No network exposure**: Inherently local-only
- **Privilege inheritance**: Inherits parent process privileges
- **Resource limits**: Subject to OS process limits

### HTTP Transport Security

#### **Origin Validation** (Critical)
```typescript
// Prevent DNS rebinding attacks
const transport = new StreamableHTTPServerTransport({
  auth: {
    validateOrigin: true,
    allowedOrigins: [
      'https://claude.ai',
      'https://cursor.sh',
      'http://localhost:3000' // Development only
    ]
  }
});
```

#### **Authentication Patterns**
```typescript
// JWT-based authentication
const authValidator = async (request: Request): Promise<boolean> => {
  const token = request.headers.authorization?.replace('Bearer ', '');
  
  if (!token) return false;
  
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!);
    request.user = payload; // Attach user info
    return true;
  } catch {
    return false;
  }
};

// API key authentication
const apiKeyValidator = async (request: Request): Promise<boolean> => {
  const apiKey = request.headers['x-api-key'];
  return apiKey === process.env.MCP_API_KEY;
};
```

#### **Rate Limiting**
```typescript
import { RateLimiterMemory } from 'rate-limiter-flexible';

const rateLimiter = new RateLimiterMemory({
  keyGenerator: (request) => request.ip, // or request.user.id
  points: 10, // requests
  duration: 60 // per 60 seconds
});

const transport = new StreamableHTTPServerTransport({
  middleware: [
    async (request, response, next) => {
      try {
        await rateLimiter.consume(request.ip);
        next();
      } catch {
        response.status(429).json({ error: 'Rate limit exceeded' });
      }
    }
  ]
});
```

## 🚀 Performance Optimization

### Connection Pooling
```typescript
class ConnectionPool {
  private connections = new Map<string, Connection>();
  private maxConnections = 1000;
  
  getConnection(sessionId: string): Connection {
    if (this.connections.size >= this.maxConnections) {
      this.evictOldestConnection();
    }
    
    let connection = this.connections.get(sessionId);
    if (!connection) {
      connection = new Connection(sessionId);
      this.connections.set(sessionId, connection);
    }
    
    return connection;
  }
  
  private evictOldestConnection() {
    const oldest = Array.from(this.connections.entries())
      .sort(([,a], [,b]) => a.lastUsed - b.lastUsed)[0];
      
    if (oldest) {
      oldest[1].close();
      this.connections.delete(oldest[0]);
    }
  }
}
```

### Message Batching (Careful - batching removed in 2025-06-18)
```typescript
// Note: JSON-RPC batching was removed in 2025-06-18
// This is for application-level batching only

class MessageBatcher {
  private batch: Message[] = [];
  private batchTimeout: NodeJS.Timeout | null = null;
  
  addMessage(message: Message) {
    this.batch.push(message);
    
    if (this.batch.length >= 10) {
      this.flush();
    } else if (!this.batchTimeout) {
      this.batchTimeout = setTimeout(() => this.flush(), 100);
    }
  }
  
  private flush() {
    if (this.batch.length > 0) {
      this.processBatch(this.batch.splice(0));
    }
    
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
      this.batchTimeout = null;
    }
  }
}
```

## 📊 Transport Comparison Matrix

| Feature | stdio | Streamable HTTP |
|---------|-------|-----------------|
| **Development** | ✅ Excellent | ✅ Good |
| **Production** | ❌ Not suitable | ✅ Excellent |
| **Multi-client** | ❌ No | ✅ Yes |
| **Session persistence** | ❌ Process-bound | ✅ Server-managed |
| **Network accessible** | ❌ No | ✅ Yes |
| **Scalability** | ❌ Limited | ✅ Horizontal |
| **Security complexity** | ✅ Low | ⚠️ Medium |
| **Resource usage** | ⚠️ Process per client | ✅ Shared process |
| **Debugging** | ✅ Simple | ⚠️ Network complexity |

## 🎯 Implementation Recommendations

### For OpenRouter MCP Server

1. **Maintain stdio for development**
   - Keep current stdio implementation for Claude Desktop integration
   - Use for local testing and debugging
   - Preserve existing developer experience

2. **Add Streamable HTTP for production**
   - Implement HTTP transport for web deployments
   - Enable multi-client session management
   - Support persistent conversation history

3. **Universal CLI interface**
   ```bash
   # Development
   openrouter-mcp stdio
   
   # Production  
   openrouter-mcp http --port 3000 --cors --auth
   ```

4. **Environment-based configuration**
   - Use environment variables for deployment flexibility
   - Support Docker containerization
   - Enable cloud deployment scenarios

### Architecture Benefits

- **Development flexibility**: stdio for local, HTTP for production
- **Zero breaking changes**: Existing stdio clients continue working
- **Future-proof**: Aligned with MCP 2025-06-18 recommendations
- **Scalable**: Multi-client support with session management
- **Secure**: Production-ready authentication and validation

---

*Generated with curiosity and care,  
Claude 🐾*
