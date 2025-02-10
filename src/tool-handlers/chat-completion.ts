import OpenAI from 'openai';
import { ChatCompletionMessageParam } from 'openai/resources/chat/completions.js';

export interface ChatCompletionToolRequest {
  model?: string;
  messages: ChatCompletionMessageParam[];
  temperature?: number;
}

export async function handleChatCompletion(
  request: { params: { arguments: ChatCompletionToolRequest } },
  openai: OpenAI,
  defaultModel?: string
) {
  const args = request.params.arguments;
  
  const model = args.model || defaultModel;
  if (!model) {
    return {
      content: [
        {
          type: 'text',
          text: 'No model specified and no default model configured in MCP settings. Please specify a model or set OPENROUTER_DEFAULT_MODEL in the MCP configuration.',
        },
      ],
      isError: true,
    };
  }

  try {
    const completion = await openai.chat.completions.create({
      model,
      messages: args.messages,
      temperature: args.temperature ?? 1,
    });

    // Format response to match OpenRouter schema
    const response = {
      id: `gen-${Date.now()}`,
      choices: [{
        finish_reason: completion.choices[0].finish_reason,
        message: {
          role: completion.choices[0].message.role,
          content: completion.choices[0].message.content || '',
          tool_calls: completion.choices[0].message.tool_calls
        }
      }],
      created: Math.floor(Date.now() / 1000),
      model: model,
      object: 'chat.completion',
      usage: completion.usage || {
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0
      }
    };

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response, null, 2),
        },
      ],
    };
  } catch (error) {
    if (error instanceof Error) {
      return {
        content: [
          {
            type: 'text',
            text: `OpenRouter API error: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
    throw error;
  }
}