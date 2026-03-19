/**
 * Groq LLM Client
 * 
 * Integration with Groq API for tool-calling LLM functionality.
 * Uses llama-3.3-70b-versatile model for function calling support.
 */

import type { ToolDefinition, LLMMessage, LLMResponse, ToolCall, TokenUsage } from "./types.js";

// ============================================================================
// Configuration
// ============================================================================

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "llama-3.3-70b-versatile";
const MAX_TOKENS = 2048;
const TEMPERATURE = 0.1; // Low temperature for deterministic outputs

// ============================================================================
// Types
// ============================================================================

interface GroqMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: GroqToolCall[];
  tool_call_id?: string;
}

interface GroqToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
}

interface GroqTool {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

interface GroqResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    index: number;
    message: {
      role: "assistant";
      content: string | null;
      tool_calls?: GroqToolCall[];
    };
    finish_reason: "stop" | "tool_calls" | "length" | "content_filter";
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// ============================================================================
// Client Class
// ============================================================================

export class GroqLLMClient {
  private apiKey: string;
  private totalTokensUsed: TokenUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };

  constructor() {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      throw new Error("GROQ_API_KEY environment variable is not set");
    }
    this.apiKey = apiKey;
  }

  /**
   * Get cumulative token usage for this client instance
   */
  getTokenUsage(): TokenUsage {
    return { ...this.totalTokensUsed };
  }

  /**
   * Reset token counter
   */
  resetTokenUsage(): void {
    this.totalTokensUsed = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
  }

  /**
   * Convert internal message format to Groq format
   */
  private toGroqMessages(messages: LLMMessage[]): GroqMessage[] {
    return messages.map((msg) => {
      const groqMsg: GroqMessage = {
        role: msg.role,
        content: msg.content,
      };

      if (msg.toolCalls && msg.toolCalls.length > 0) {
        groqMsg.tool_calls = msg.toolCalls.map((tc) => ({
          id: tc.id,
          type: "function" as const,
          function: {
            name: tc.name,
            arguments: JSON.stringify(tc.arguments),
          },
        }));
      }

      if (msg.toolCallId) {
        groqMsg.tool_call_id = msg.toolCallId;
      }

      return groqMsg;
    });
  }

  /**
   * Convert tool definitions to Groq format
   */
  private toGroqTools(tools: ToolDefinition[]): GroqTool[] {
    return tools.map((tool) => ({
      type: "function" as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      },
    }));
  }

  /**
   * Parse Groq response to internal format
   */
  private parseGroqResponse(response: GroqResponse): LLMResponse {
    const choice = response.choices[0];
    if (!choice) {
      throw new Error("No response choice from Groq");
    }

    const toolCalls: ToolCall[] = [];
    if (choice.message.tool_calls) {
      for (const tc of choice.message.tool_calls) {
        try {
          toolCalls.push({
            id: tc.id,
            name: tc.function.name,
            arguments: JSON.parse(tc.function.arguments),
          });
        } catch (e) {
          // Log parsing error but continue
          console.error(`Failed to parse tool call arguments: ${tc.function.arguments}`);
          toolCalls.push({
            id: tc.id,
            name: tc.function.name,
            arguments: {},
          });
        }
      }
    }

    // Map finish reason
    let finishReason: "stop" | "tool_calls" | "error" = "stop";
    if (choice.finish_reason === "tool_calls") {
      finishReason = "tool_calls";
    } else if (choice.finish_reason === "content_filter") {
      finishReason = "error";
    }

    return {
      content: choice.message.content,
      toolCalls,
      finishReason,
      usage: {
        promptTokens: response.usage.prompt_tokens,
        completionTokens: response.usage.completion_tokens,
        totalTokens: response.usage.total_tokens,
      },
    };
  }

  /**
   * Send a chat completion request to Groq
   */
  async chat(
    messages: LLMMessage[],
    tools?: ToolDefinition[],
    toolChoice: "auto" | "none" | "required" = "auto"
  ): Promise<LLMResponse> {
    const groqMessages = this.toGroqMessages(messages);

    const body: Record<string, unknown> = {
      model: MODEL,
      messages: groqMessages,
      max_tokens: MAX_TOKENS,
      temperature: TEMPERATURE,
    };

    if (tools && tools.length > 0) {
      body.tools = this.toGroqTools(tools);
      body.tool_choice = toolChoice;
    }

    const response = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Groq API error (${response.status}): ${errorText}`);
    }

    const data = (await response.json()) as GroqResponse;
    const result = this.parseGroqResponse(data);

    // Track token usage
    this.totalTokensUsed.promptTokens += result.usage.promptTokens;
    this.totalTokensUsed.completionTokens += result.usage.completionTokens;
    this.totalTokensUsed.totalTokens += result.usage.totalTokens;

    return result;
  }

  /**
   * Create a system message with agent instructions
   */
  static createSystemPrompt(openingContext: string): string {
    return `You are an AI recruitment assistant that evaluates candidate profiles against job openings.

Your task is to analyze a candidate's resume and determine if they are a good match for the position.

## Available Tools
You have access to the following tools:
1. parse_resume - Parse a candidate's resume file and extract structured information
2. normalize_skills - Normalize skill names to standard forms for accurate matching
3. calculate_score - Calculate the final recommendation score using deterministic scoring
4. extract_features - Extract a feature vector for matching

## Process
1. First, call parse_resume to extract information from the candidate's resume
2. Then, call normalize_skills to standardize the extracted skills
3. Finally, call calculate_score to get the deterministic recommendation score

## Important Rules
- You MUST use the calculate_score tool to get the final score - do not calculate scores yourself
- The scoring is deterministic and based on a fixed formula
- Provide clear reasoning for your recommendation
- Be objective and base your assessment on the extracted data

## Opening Context
${openingContext}

After calling all necessary tools, provide a final recommendation with:
- Whether the candidate is recommended (true/false)
- The score from calculate_score
- Your confidence level (0-1)
- A brief explanation of your reasoning`;
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

let clientInstance: GroqLLMClient | null = null;

export function getGroqClient(): GroqLLMClient {
  if (!clientInstance) {
    clientInstance = new GroqLLMClient();
  }
  return clientInstance;
}

/**
 * Create a fresh client (useful for testing or isolation)
 */
export function createGroqClient(): GroqLLMClient {
  return new GroqLLMClient();
}
