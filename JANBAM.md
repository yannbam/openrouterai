think for each tool:
  what makes most sense?
    only return text string via contentblock
    only return json object via structuredContent (important: look out for or reply json => text pre conversion)
    return both (with differing information!)




---

 Great! Now I have information from all three sources. Let me analyze what they're saying:

  DeepWiki (SDK Implementation):
  - structuredContent MUST be validated against outputSchema if the tool defines one
  - Validation happens on both client and server side
  - If outputSchema exists but structuredContent is missing (and not an error), throws McpError
  - If structuredContent doesn't match schema, throws McpError
  - If no outputSchema is defined, it can be arbitrary JSON (passthrough enabled)

  Web Search (Official Spec):
  - 2025-06-18 specification 
  - "Tools may provide an output schema for validation of structured results"
  - "If an output schema is provided: Servers MUST provide structured results that conform to this schema, and Clients SHOULD 
  validate structured results against this schema"
  - Emphasizes validation for data integrity and security

  Grok (Protocol Search):
  - Says structuredContent must conform to predefined schema if one is specified
  - "Servers MUST ensure that any structuredContent adheres to the declared schema"
  - If no schema defined, can be flexible JSON object but still must follow basic MCP constraints
  - Must be valid JSON object (not arrays or primitives directly)

  All three sources are consistent! The answer is clear:

  IF a tool defines an outputSchema, then structuredContent MUST conform to that schema.
  IF no outputSchema is defined, then structuredContent can be any valid JSON object.

  This is a conditional validation system, not always-validate or never-validate.

● Definitive Answer from Multiple Sources:

  The structuredContent field in MCP has conditional validation requirements:

  ✅ Schema Required IF Tool Defines outputSchema

  All 3 sources confirm:

  | Source            | Key Finding
     |
  |-------------------|-----------------------------------------------------------------------------------------------------
  ---|
  | DeepWiki (SDK)    | "structuredContent requires schema validation if the tool defines an outputSchema"
     |
  | Web Search (Spec) | "If an output schema is provided: Servers MUST provide structured results that conform to this
  schema" |
  | Grok (Protocol)   | "Servers MUST ensure that any structuredContent adheres to the declared schema"
     |

  ✅ ANY JSON Object IF No outputSchema Defined

  DeepWiki: z.object({}).passthrough() - "can contain arbitrary properties if no specific schema is applied"

  Grok: "If no schema defined, can be flexible JSON object"

  The Rule:

  // Tool WITH outputSchema
  Tool {
    outputSchema: JsonSchema  // ← Schema defined
  }
  // → structuredContent MUST conform to schema

  // Tool WITHOUT outputSchema  
  Tool {
    outputSchema: undefined   // ← No schema
  }
  // → structuredContent can be ANY JSON object

  Validation Enforcement:

  - Server-side: Validates before sending response
  - Client-side: Validates after receiving response
  - Failure: Throws McpError with InvalidParams

  Bottom Line: MCP uses opt-in schema validation - tools choose whether to enforce structure via outputSchema declaration.

  --------------


  Great! I have responses from all three sources. Let me analyze the key findings:

  Source 1 - DeepWiki (SDK Implementation)

  - YES: "a single CallToolResult can contain both content (a ContentBlock array) and structuredContent. These fields are not 
  mutually exclusive and can coexist"
  - Provides concrete example from mcp.test.ts showing both fields together
  - The example shows structuredContent with structured data AND content with text blocks
  - Notes that content is automatically generated from structuredContent for backward compatibility

  Source 2 - Web Search (Official Specification)

  - YES: "For backwards compatibility, a tool that returns structured content SHOULD also return the serialized JSON in a 
  TextContent block"
  - Shows example JSON with both content array containing TextContent AND structuredContent object
  - Explains this is for better token efficiency and backwards compatibility
  - Confirms this is part of the 2025-06-18 specification update

  Source 3 - Grok (Protocol Search)

  - YES: "These fields are not mutually exclusive and are designed to coexist"
  - Provides multiple detailed examples showing both fields together
  - Explains the backwards compatibility rationale 
  - States: "servers SHOULD provide both when using structuredContent for compatibility"
  - Shows examples for success cases, error cases, and edge cases

  All three sources are completely aligned on this answer - they can definitely coexist and it's actually recommended for 
  backwards compatibility.

● Definitive Answer from All 3 Sources:

  ✅ YES - ContentBlock (text) and schema-less structuredContent CAN be used together in a single MCP response

  All Sources Confirm Coexistence:

  | Source            | Key Finding                                                                                 |
  |-------------------|---------------------------------------------------------------------------------------------|
  | DeepWiki (SDK)    | "Fields are not mutually exclusive and can coexist" + concrete test example                 |
  | Web Search (Spec) | "For backwards compatibility, tool SHOULD also return serialized JSON in TextContent block" |
  | Grok (Protocol)   | "Designed to coexist" + "servers SHOULD provide both when using structuredContent"          |

  Official MCP 2025-06-18 Pattern:

  {
    "jsonrpc": "2.0",
    "result": {
      "content": [
        {
          "type": "text",
          "text": "Query found 3 records. Sales up 15%."
        }
      ],
      "structuredContent": {
        "summary": "Sales increased by 15%",
        "rows": [...]
      }
    }
  }

  Real Implementation Example (from DeepWiki test):

  async ({ input }) => ({
    structuredContent: {
      processedInput: input,
      resultType: "structured",
      timestamp: "2023-01-01T00:00:00Z"
    },
    content: [
      {
        type: "text",
        text: JSON.stringify({...}) // Text representation
      }
    ]
  })

  Why This Design:

  1. Backwards Compatibility: Older clients can read content
  2. Efficiency: LLMs get structured data via structuredContent
  3. Flexibility: Human-readable + machine-readable in one response
  4. Token Optimization: Structured data reduces context window usage

  Bottom Line: MCP 2025-06-18 explicitly encourages using both fields together for maximum compatibility and efficiency.