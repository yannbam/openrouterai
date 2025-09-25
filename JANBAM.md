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