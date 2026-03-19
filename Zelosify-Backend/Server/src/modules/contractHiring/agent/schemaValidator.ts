/**
 * Schema Validator
 * 
 * Validates agent outputs before persistence.
 * Per spec: "Validate every tool output before it crosses into persistence."
 */

import type {
  ParsedResume,
  ScoringResult,
  AgentRecommendation,
  AgentResult,
  ValidationResult,
  RecommendationDecision,
} from "../types.js";

// ============================================================================
// Validation Helpers
// ============================================================================

function isNumber(value: unknown): value is number {
  return typeof value === "number" && !isNaN(value) && isFinite(value);
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === "boolean";
}

function isArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return isArray(value) && value.every(isString);
}

function isInRange(value: number, min: number, max: number): boolean {
  return value >= min && value <= max;
}

function isValidDecision(value: unknown): value is RecommendationDecision {
  return value === "RECOMMENDED" || value === "BORDERLINE" || value === "NOT_RECOMMENDED";
}

// ============================================================================
// Parsed Resume Validation
// ============================================================================

export function validateParsedResume(data: unknown): ValidationResult<ParsedResume> {
  const errors: string[] = [];

  if (!data || typeof data !== "object") {
    return { valid: false, errors: ["ParsedResume must be an object"] };
  }

  const obj = data as Record<string, unknown>;

  // experienceYears
  if (!isNumber(obj.experienceYears)) {
    errors.push("experienceYears must be a number");
  } else if (obj.experienceYears < 0 || obj.experienceYears > 50) {
    errors.push("experienceYears must be between 0 and 50");
  }

  // skills
  if (!isStringArray(obj.skills)) {
    errors.push("skills must be an array of strings");
  }

  // normalizedSkills
  if (!isStringArray(obj.normalizedSkills)) {
    errors.push("normalizedSkills must be an array of strings");
  }

  // location
  if (!isString(obj.location)) {
    errors.push("location must be a string");
  }

  // education
  if (!isStringArray(obj.education)) {
    errors.push("education must be an array of strings");
  }

  // keywords
  if (!isStringArray(obj.keywords)) {
    errors.push("keywords must be an array of strings");
  }

  // rawTextLength
  if (!isNumber(obj.rawTextLength)) {
    errors.push("rawTextLength must be a number");
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    data: {
      experienceYears: obj.experienceYears as number,
      skills: obj.skills as string[],
      normalizedSkills: obj.normalizedSkills as string[],
      location: obj.location as string,
      education: obj.education as string[],
      keywords: obj.keywords as string[],
      rawTextLength: obj.rawTextLength as number,
    },
  };
}

// ============================================================================
// Scoring Result Validation
// ============================================================================

export function validateScoringResult(data: unknown): ValidationResult<ScoringResult> {
  const errors: string[] = [];

  if (!data || typeof data !== "object") {
    return { valid: false, errors: ["ScoringResult must be an object"] };
  }

  const obj = data as Record<string, unknown>;

  // All scores must be numbers between 0 and 1
  const scoreFields = ["skillMatchScore", "experienceMatchScore", "locationMatchScore", "finalScore"];

  for (const field of scoreFields) {
    if (!isNumber(obj[field])) {
      errors.push(`${field} must be a number`);
    } else if (!isInRange(obj[field] as number, 0, 1)) {
      errors.push(`${field} must be between 0 and 1`);
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    data: {
      skillMatchScore: obj.skillMatchScore as number,
      experienceMatchScore: obj.experienceMatchScore as number,
      locationMatchScore: obj.locationMatchScore as number,
      finalScore: obj.finalScore as number,
    },
  };
}

// ============================================================================
// Agent Recommendation Validation
// ============================================================================

export function validateAgentRecommendation(data: unknown): ValidationResult<AgentRecommendation> {
  const errors: string[] = [];

  if (!data || typeof data !== "object") {
    return { valid: false, errors: ["AgentRecommendation must be an object"] };
  }

  const obj = data as Record<string, unknown>;

  // recommended (boolean)
  if (!isBoolean(obj.recommended)) {
    errors.push("recommended must be a boolean");
  }

  // score (0-1)
  if (!isNumber(obj.score)) {
    errors.push("score must be a number");
  } else if (!isInRange(obj.score as number, 0, 1)) {
    errors.push("score must be between 0 and 1");
  }

  // confidence (0-1)
  if (!isNumber(obj.confidence)) {
    errors.push("confidence must be a number");
  } else if (!isInRange(obj.confidence as number, 0, 1)) {
    errors.push("confidence must be between 0 and 1");
  }

  // reason (string, non-empty)
  if (!isString(obj.reason)) {
    errors.push("reason must be a string");
  } else if ((obj.reason as string).trim().length === 0) {
    errors.push("reason cannot be empty");
  } else if ((obj.reason as string).length > 1000) {
    errors.push("reason must be under 1000 characters");
  }

  // decision
  if (!isValidDecision(obj.decision)) {
    errors.push("decision must be RECOMMENDED, BORDERLINE, or NOT_RECOMMENDED");
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    data: {
      recommended: obj.recommended as boolean,
      score: obj.score as number,
      confidence: obj.confidence as number,
      reason: obj.reason as string,
      decision: obj.decision as RecommendationDecision,
    },
  };
}

// ============================================================================
// Full Agent Result Validation
// ============================================================================

export function validateAgentResult(data: unknown): ValidationResult<AgentResult> {
  const errors: string[] = [];

  if (!data || typeof data !== "object") {
    return { valid: false, errors: ["AgentResult must be an object"] };
  }

  const obj = data as Record<string, unknown>;

  // Validate recommendation
  const recommendationResult = validateAgentRecommendation(obj.recommendation);
  if (!recommendationResult.valid) {
    errors.push(...(recommendationResult.errors || []).map((e) => `recommendation.${e}`));
  }

  // Validate metadata exists
  if (!obj.metadata || typeof obj.metadata !== "object") {
    errors.push("metadata must be an object");
  } else {
    const meta = obj.metadata as Record<string, unknown>;
    if (!isNumber(meta.profileId)) errors.push("metadata.profileId must be a number");
    if (!isString(meta.openingId)) errors.push("metadata.openingId must be a string");
    if (!isNumber(meta.totalLatencyMs)) errors.push("metadata.totalLatencyMs must be a number");
  }

  // Validate reasoning exists
  if (!obj.reasoning || typeof obj.reasoning !== "object") {
    errors.push("reasoning must be an object");
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    data: obj as unknown as AgentResult,
  };
}

// ============================================================================
// LLM Response Validation
// ============================================================================

/**
 * Validate that LLM tool call arguments match expected schema
 */
export function validateToolCallArguments(
  toolName: string,
  args: Record<string, unknown>
): ValidationResult<Record<string, unknown>> {
  const errors: string[] = [];

  switch (toolName) {
    case "parse_resume":
      if (!isNumber(args.profileId)) errors.push("profileId is required");
      if (!isString(args.s3Key)) errors.push("s3Key is required");
      break;

    case "normalize_skills":
      if (!isStringArray(args.skills)) errors.push("skills must be an array of strings");
      break;

    case "calculate_score":
      if (!isNumber(args.candidateExperience)) errors.push("candidateExperience is required");
      if (!isStringArray(args.candidateSkills)) errors.push("candidateSkills must be an array");
      if (!isString(args.candidateLocation)) errors.push("candidateLocation is required");
      if (!isStringArray(args.requiredSkills)) errors.push("requiredSkills must be an array");
      if (!isNumber(args.experienceMin)) errors.push("experienceMin is required");
      break;

    case "extract_features":
      if (!isNumber(args.experienceYears)) errors.push("experienceYears is required");
      if (!isStringArray(args.skills)) errors.push("skills must be an array");
      if (!isString(args.location)) errors.push("location is required");
      break;

    default:
      errors.push(`Unknown tool: ${toolName}`);
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return { valid: true, data: args };
}
