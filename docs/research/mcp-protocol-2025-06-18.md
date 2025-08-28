# Model Context Protocol Specification 2025-06-18

**Research Date**: 2025-08-27  
**Current Project MCP SDK**: 1.7.0  
**Target Protocol Version**: 2025-06-18  
**Research Sources**: Official MCP specification, expert AI consultation, GitHub documentation

## Executive Summary

The Model Context Protocol (MCP) 2025-06-18 specification represents a significant evolution from earlier versions, with major changes to transport mechanisms, security enhancements, structured tool outputs, and user interaction capabilities. This document provides comprehensive technical details for modernizing OpenRouter MCP Server.

## 🚨 Critical Breaking Changes from Previous Versions

### 1. **JSON-RPC Batching Removal**
- **Change**: JSON-RPC batching support completely removed (PR #416)
- **Impact**: Servers using batched requests must be refactored
- **Migration**: Replace batched requests with individual JSON-RPC calls
- **Justification**: No compelling use case identified for batching

### 2. **SSE Transport Deprecation** 
- **Change**: Server-Sent Events (SSE) transport deprecated in favor of Streamable HTTP
- **Timeline**: Deprecated as of protocol version 2024-11-05
- **Impact**: New implementations should use Streamable HTTP; existing SSE should plan migration
- **Backward Compatibility**: SSE continues to work but is not recommended for new projects

### 3. **Protocol Version Header Requirement**
- **Change**: All HTTP requests must include `MCP-Protocol-Version` header
- **Requirement**: Negotiated protocol version must be specified in subsequent requests
- **Impact**: HTTP transport implementations need header handling

## 🔧 New Features and Capabilities

### 1. **Structured Tool Output Support**
```typescript
// New structured tool output format
interface StructuredToolOutput {
  structuredContent?: {
    type: string;
    data: object;
    schema?: JsonSchema;
  };
  content?: ContentItem[]; // Backward compatibility
}
```

**Benefits**:
- Predictable, structured JSON responses
- Type-safe tool outputs
- Better integration with AI model processing
- Improved error handling and validation

### 2. **Enhanced OAuth Security**
- **Resource Server Classification**: MCP servers now classified as OAuth Resource Servers
- **Authorization Discovery**: Protected resource metadata for discovering Authorization servers
- **Resource Indicators**: RFC 8707 compliance to prevent token misuse
- **Token Binding**: Access tokens explicitly bound to specific MCP servers

**Security Requirements**:
```typescript
// OAuth security implementation pattern
interface McpOAuthSecurity {
  resourceServer: {
    authorizationServer: string;
    resourceIndicators: string[];
    tokenBinding: "explicit";
  };
}
```

### 3. **User Elicitation Support**
- **Capability**: Servers can request additional user information during interactions
- **Implementation**: `elicitation/create` request with message and JSON schema
- **Use Cases**: Dynamic form collection, user consent flows, additional context gathering

```typescript
// Elicitation request example
interface ElicitationRequest {
  type: "elicitation/create";
  params: {
    message: string;
    schema: JsonSchema;
    timeout?: number;
  };
}
```

## 📡 Transport Architecture Changes

### Current Transport Support Matrix

| Transport Type | Status | Recommendation | Multi-Client Support |
|---------------|--------|---------------|---------------------|
| **stdio** | Stable | Local development only | No (single process) |
| **SSE** | Deprecated | Migrate to Streamable HTTP | Yes |
| **Streamable HTTP** | Recommended | Production deployments | Yes |

### Streamable HTTP Transport Details

**Key Features**:
- HTTP POST and GET request support
- Server-Sent Events for streaming responses
- Single endpoint path architecture
- Native multi-client connection support
- Session resumability via event IDs

**Implementation Requirements**:
```typescript
// Streamable HTTP server setup
const transport = new StreamableHTTPServerTransport({
  port: 3000,
  cors: { origin: '*' },
  auth: {
    validateOrigin: true,
    bindLocalhost: true
  }
});
```

**Security Considerations**:
- Validate Origin headers (prevent DNS rebinding attacks)
- Bind to localhost (127.0.0.1) for local servers
- Implement proper authentication for all connections
- Use HTTPS in production environments

### Multi-Client Architecture Patterns

**Session Management**:
```typescript
interface SessionMetadata {
  sessionId: string;
  clientId: string;
  protocolVersion: string;
  capabilities: ClientCapabilities;
  lastActivity: timestamp;
}
```

**Connection Handling**:
- Clients maintain multiple SSE streams for different sessions
- Servers send each message on only one stream to prevent duplication
- Stream resumability through event IDs for connection recovery
- Optional session ID assignment during initialization

## 🛠️ Tool Implementation Best Practices

### Current Tool Result Format (2025-06-18)

```typescript
// New standardized tool result interface
interface CallToolResult {
  content?: ContentItem[];           // Backward compatible
  structuredContent?: StructuredOutput; // New structured format
  isError?: boolean;                // Error indication
  meta?: {
    sessionId?: string;
    executionTime?: number;
    resourcesAccessed?: string[];
  };
}

interface ContentItem {
  type: 'text' | 'image' | 'audio' | 'resource' | 'embedded';
  text?: string;
  data?: string;
  mimeType?: string;
  uri?: string;
}
```

### Error Handling Evolution

**Protocol-Level Errors**: Standard JSON-RPC error responses
```typescript
interface McpError {
  code: number;
  message: string;
  data?: {
    type: string;
    details: object;
  };
}
```

**Tool Execution Errors**: Use `isError: true` in tool results
```typescript
// Error result pattern
return {
  content: [{ 
    type: 'text', 
    text: `Error: ${error.message}` 
  }],
  isError: true,
  meta: {
    errorCode: 'OPENROUTER_API_FAILURE',
    retryable: true
  }
};
```

### Input Schema Validation

**Enhanced Schema Support**:
```typescript
// Tool definition with comprehensive schema
{
  name: "chat_completion",
  title: "OpenRouter Chat Completion",
  description: "Generate chat completion with conversation history",
  inputSchema: {
    type: "object",
    properties: {
      messages: {
        type: "array",
        items: {
          type: "object",
          properties: {
            role: { type: "string", enum: ["user", "assistant", "system"] },
            content: { type: "string" }
          },
          required: ["role", "content"]
        }
      },
      model: { 
        type: "string",
        default: "anthropic/claude-3-haiku",
        description: "OpenRouter model identifier"
      },
      sessionId: {
        type: "string",
        description: "Session identifier for conversation history"
      }
    },
    required: ["messages"]
  },
  outputSchema: {
    type: "object",
    properties: {
      content: {
        type: "array",
        items: {
          type: "object",
          properties: {
            type: { type: "string" },
            text: { type: "string" }
          }
        }
      }
    }
  }
}
```

---

This document provides comprehensive technical reference for the MCP 2025-06-18 specification. All code examples and patterns are derived from official MCP documentation and SDK sources.

*Generated with curiosity and care,  
Claude 🐾*