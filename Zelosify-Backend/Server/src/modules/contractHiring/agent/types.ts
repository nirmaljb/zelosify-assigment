/**
 * AI Agent Types
 * 
 * Type definitions for the recommendation agent system.
 * These types define the contracts between tools, orchestrator, and LLM.
 */

// ============================================================================
// Resume Parsing Types
// ============================================================================

/**
 * Output from Resume Parsing Tool
 */
export interface ParsedResume {
  experienceYears: number;
  skills: string[];
  normalizedSkills: string[];
  location: string;
  education: string[];
  keywords: string[];
  rawTextLength: number;
}

// ============================================================================
// Feature Extraction Types
// ============================================================================

/**
 * Opening requirements for matching
 */
export interface OpeningRequirements {
  requiredSkills: string[];
  experienceMin: number;
  experienceMax: number | null;
  location: string | null;
  locationType: string | null;
}

/**
 * Feature vector for candidate matching
 */
export interface FeatureVector {
  experienceYears: number;
  skills: string[];
  normalizedSkills: string[];
  location: string;
  skillMatchScore: number;
  experienceMatchScore: number;
  locationMatchScore: number;
}

// ============================================================================
// Scoring Types
// ============================================================================

/**
 * Output from Scoring Engine
 */
export interface ScoringResult {
  skillMatchScore: number;
  experienceMatchScore: number;
  locationMatchScore: number;
  finalScore: number;
}

/**
 * Decision based on score thresholds
 */
export type RecommendationDecision = "RECOMMENDED" | "BORDERLINE" | "NOT_RECOMMENDED";

// ============================================================================
// Agent Output Types
// ============================================================================

/**
 * Final recommendation output from agent
 */
export interface AgentRecommendation {
  recommended: boolean;
  score: number;
  confidence: number;
  reason: string;
  decision: RecommendationDecision;
}

/**
 * Complete agent result including metadata
 */
export interface AgentResult {
  recommendation: AgentRecommendation;
  metadata: AgentMetadata;
  reasoning: AgentReasoningState;
}

/**
 * Agent execution metadata
 */
export interface AgentMetadata {
  profileId: number;
  openingId: string;
  startTime: string;
  endTime: string;
  totalLatencyMs: number;
  parsingLatencyMs: number;
  matchingLatencyMs: number;
  tokenUsage: TokenUsage;
  toolsInvoked: string[];
  version: string;
}

/**
 * Token usage tracking
 */
export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

/**
 * Agent internal reasoning state
 */
export interface AgentReasoningState {
  steps: ReasoningStep[];
  parsedResume: ParsedResume | null;
  featureVector: FeatureVector | null;
  scoringResult: ScoringResult | null;
  retryCount: number;
  errors: string[];
}

/**
 * Individual reasoning step
 */
export interface ReasoningStep {
  step: number;
  action: string;
  toolName: string | null;
  input: Record<string, unknown>;
  output: Record<string, unknown> | null;
  durationMs: number;
  timestamp: string;
}

// ============================================================================
// Tool Definitions
// ============================================================================

/**
 * Tool definition for LLM function calling
 */
export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, {
      type: string;
      description: string;
      items?: { type: string };
      enum?: string[];
    }>;
    required: string[];
  };
}

/**
 * Tool call request from LLM
 */
export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

/**
 * Tool execution result
 */
export interface ToolResult {
  toolCallId: string;
  name: string;
  result: unknown;
  error?: string;
  durationMs: number;
}

// ============================================================================
// LLM Types
// ============================================================================

/**
 * Message in LLM conversation
 */
export interface LLMMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  toolCalls?: ToolCall[];
  toolCallId?: string;
}

/**
 * LLM response
 */
export interface LLMResponse {
  content: string | null;
  toolCalls: ToolCall[];
  finishReason: "stop" | "tool_calls" | "error";
  usage: TokenUsage;
}

// ============================================================================
// Validation Types
// ============================================================================

/**
 * Validation result
 */
export interface ValidationResult<T> {
  valid: boolean;
  data?: T;
  errors?: string[];
}
