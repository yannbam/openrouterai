# MCP Multi-Client Architecture Reference

**Research Date**: 2025-08-27  
**Focus**: Core MCP concepts for multi-client server design  
**Source**: MCP 2025-06-18 specification analysis and SDK patterns

## Overview

This document outlines fundamental concepts for designing MCP servers that support multiple concurrent clients. These are reference patterns that can be adapted to different implementation needs.

## 🏗️ Core Architectural Concepts

### 1. **Server Lifecycle Management**
MCP servers can operate in two primary modes:

- **Single-client mode** (stdio): One server process per client connection
- **Multi-client mode** (HTTP): One server process handling multiple client connections

### 2. **Session-Based State Isolation**
When supporting multiple clients, each client connection should maintain isolated state:

```typescript
interface ClientSession {
  sessionId: string;
  clientId: string;
  protocolVersion: string;
  capabilities: ClientCapabilities;
  lastActivity: number;
}
```

### 3. **Transport Abstraction**
The same server logic should work identically across different transport mechanisms:

```typescript
// Universal server pattern
class MCPServer {
  async run(transport: 'stdio' | 'http', options?: ServerOptions) {
    const transportLayer = this.createTransport(transport, options);
    await this.server.connect(transportLayer);
  }
  
  private createTransport(type: string, options: any) {
    switch (type) {
      case 'stdio':
        return new StdioServerTransport();
      case 'http':
        return new StreamableHTTPServerTransport(options);
    }
  }
}
```

## 🔄 Session Management Patterns

### Basic Session Store Interface

```typescript
interface SessionStore {
  // Session lifecycle
  create(sessionId?: string): Session;
  get(sessionId: string): Session | null;
  update(session: Session): void;
  delete(sessionId: string): boolean;
  
  // Session maintenance
  cleanup(maxAge?: number): number;
  list(): Session[];
}
```

### Session-Aware Tool Pattern

```typescript
// Wrapper pattern for session-aware tools
function withSession<TInput, TOutput>(
  handler: (params: { input: TInput; session: Session }) => Promise<TOutput>
) {
  return async (input: TInput, meta: any): Promise<TOutput> => {
    const sessionId = meta?.sessionId || crypto.randomUUID();
    const session = sessionStore.ensure(sessionId);
    
    try {
      const result = await handler({ input, session });
      sessionStore.update(session);
      return result;
    } catch (error) {
      // Handle errors while preserving session state
      throw error;
    }
  };
}
```

## 🔗 Multi-Client Connection Handling

### HTTP Transport Session Management

```typescript
// Example session metadata tracking
interface SessionMetadata {
  sessionId: string;
  clientId: string;
  protocolVersion: string;
  capabilities: ClientCapabilities;
  lastActivity: number;
  connectionCount: number;
}
```

### Stream Management for HTTP Transport

```typescript
// Connection handling pattern
class ConnectionManager {
  private connections = new Map<string, Connection>();
  
  handleNewConnection(sessionId: string, stream: ServerResponse) {
    // Each client can have multiple streams
    // Server sends messages on appropriate streams
    // Clients can reconnect to existing sessions
  }
  
  sendToClient(sessionId: string, message: any) {
    const connection = this.connections.get(sessionId);
    if (connection && connection.isActive()) {
      connection.send(message);
    }
  }
}
```

## 📊 State Management Considerations

### In-Memory vs Persistent Storage

```typescript
// Storage abstraction pattern
interface StateStorage {
  // Ephemeral state (in-memory)
  cache: Map<string, any>;
  
  // Persistent state (optional)
  persist?(key: string, value: any): Promise<void>;
  restore?(key: string): Promise<any>;
  
  // Cleanup
  cleanup?(maxAge: number): Promise<number>;
}
```

### State Isolation Between Sessions

```typescript
// Example state isolation
class IsolatedSessionStore {
  private sessions = new Map<string, SessionData>();
  
  ensure(sessionId: string): SessionData {
    if (!this.sessions.has(sessionId)) {
      this.sessions.set(sessionId, {
        id: sessionId,
        createdAt: Date.now(),
        lastActivity: Date.now(),
        // Each session gets isolated state
        state: new Map()
      });
    }
    
    return this.sessions.get(sessionId)!;
  }
}
```

## 🛠️ Tool Handler Patterns

### Stateful Tool Example

```typescript
// Chat completion with session state
const chatWithMemory = withSession(async ({ input, session }) => {
  // Access session-specific conversation history
  const messages = session.get('messages') || [];
  messages.push({ role: 'user', content: input.prompt });
  
  // Make API call
  const response = await apiCall({
    messages,
    model: input.model
  });
  
  // Update session state
  messages.push({ role: 'assistant', content: response.content });
  session.set('messages', messages);
  
  return {
    content: [{ type: 'text', text: response.content }]
  };
});
```

### Session Cleanup Tool

```typescript
const clearSession = withSession(async ({ session }) => {
  // Clear session-specific state
  session.clear();
  
  return {
    content: [{ 
      type: 'text', 
      text: 'Session state cleared' 
    }]
  };
});
```

## 🔒 Security Considerations

### Session ID Security

```typescript
// Secure session ID generation
function generateSessionId(): string {
  // Use cryptographically secure random generation
  return crypto.randomUUID();
}

// Session validation
function validateSession(sessionId: string): boolean {
  // Validate format and existence
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(sessionId);
}
```

### Access Control Patterns

```typescript
// Optional session access control
interface SessionAccessControl {
  canAccess(clientId: string, sessionId: string): boolean;
  canCreate(clientId: string): boolean;
  canModify(clientId: string, sessionId: string): boolean;
}
```

## 🎯 Implementation Considerations

### When to Use Multi-Client Architecture

**Good Use Cases:**
- Web-based MCP clients
- Stateful conversation history
- Shared resources across connections
- Production deployments

**Single-Client Might Be Sufficient For:**
- Desktop client integration (Claude Desktop)
- Simple stateless tools
- Development and testing
- Resource-constrained environments

### Architecture Trade-offs

| Aspect | Single-Client | Multi-Client |
|--------|---------------|--------------|
| **Complexity** | Low | Medium-High |
| **State Management** | Process-scoped | Session-scoped |
| **Scalability** | Process per client | Shared process |
| **Resource Usage** | High per client | Efficient sharing |
| **Development** | Simple | Complex |
| **Production** | Limited | Production-ready |

## 📚 Implementation Patterns Summary

### Basic Multi-Client Server Structure

```typescript
class MultiClientMCPServer {
  private server: Server;
  private sessionStore: SessionStore;
  private transportLayer: Transport;
  
  constructor() {
    this.server = new Server(serverInfo, capabilities);
    this.sessionStore = new SessionStore();
    this.registerTools();
  }
  
  private registerTools() {
    // Register session-aware tools
    this.server.addTool({
      name: 'stateful_operation',
      handler: withSession(async ({ input, session }) => {
        // Tool implementation with session access
      })
    });
  }
  
  async run(transport: TransportType, options?: any) {
    this.transportLayer = this.createTransport(transport, options);
    await this.server.connect(this.transportLayer);
  }
}
```

---

This document provides foundational concepts for multi-client MCP server architecture. Implementation details will vary based on specific requirements, storage needs, and deployment constraints.

*Generated with curiosity and care,  
Claude 🐾*