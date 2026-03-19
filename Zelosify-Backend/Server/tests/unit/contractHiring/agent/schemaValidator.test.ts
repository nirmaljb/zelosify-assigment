/**
 * @fileoverview Unit tests for Schema Validator
 * Tests output validation before persistence
 */

import { describe, it, expect } from "vitest";
import {
  validateParsedResume,
  validateScoringResult,
  validateAgentRecommendation,
  validateAgentResult,
  validateToolCallArguments,
} from "../../../../src/modules/contractHiring/agent/schemaValidator.js";

// ============================================================================
// Parsed Resume Validation Tests
// ============================================================================

describe("validateParsedResume", () => {
  const validResume = {
    experienceYears: 5,
    skills: ["JavaScript", "React"],
    normalizedSkills: ["JavaScript", "React"],
    location: "New York",
    education: ["BS Computer Science"],
    keywords: ["frontend", "web"],
    rawTextLength: 5000,
  };

  it("should validate a correct parsed resume", () => {
    const result = validateParsedResume(validResume);
    expect(result.valid).toBe(true);
    expect(result.data).toEqual(validResume);
  });

  it("should reject null input", () => {
    const result = validateParsedResume(null);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("ParsedResume must be an object");
  });

  it("should reject non-object input", () => {
    const result = validateParsedResume("string");
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("ParsedResume must be an object");
  });

  describe("experienceYears validation", () => {
    it("should reject non-number experienceYears", () => {
      const result = validateParsedResume({ ...validResume, experienceYears: "5" });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("experienceYears must be a number");
    });

    it("should reject negative experienceYears", () => {
      const result = validateParsedResume({ ...validResume, experienceYears: -1 });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("experienceYears must be between 0 and 50");
    });

    it("should reject experienceYears > 50", () => {
      const result = validateParsedResume({ ...validResume, experienceYears: 51 });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("experienceYears must be between 0 and 50");
    });

    it("should accept 0 years experience", () => {
      const result = validateParsedResume({ ...validResume, experienceYears: 0 });
      expect(result.valid).toBe(true);
    });
  });

  describe("skills validation", () => {
    it("should reject non-array skills", () => {
      const result = validateParsedResume({ ...validResume, skills: "JavaScript" });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("skills must be an array of strings");
    });

    it("should reject array with non-string elements", () => {
      const result = validateParsedResume({ ...validResume, skills: [1, 2, 3] });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("skills must be an array of strings");
    });

    it("should accept empty skills array", () => {
      const result = validateParsedResume({ ...validResume, skills: [], normalizedSkills: [] });
      expect(result.valid).toBe(true);
    });
  });

  describe("location validation", () => {
    it("should reject non-string location", () => {
      const result = validateParsedResume({ ...validResume, location: 123 });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("location must be a string");
    });

    it("should accept empty string location", () => {
      const result = validateParsedResume({ ...validResume, location: "" });
      expect(result.valid).toBe(true);
    });
  });

  it("should collect multiple errors", () => {
    const result = validateParsedResume({
      experienceYears: "invalid",
      skills: null,
      normalizedSkills: null,
      location: 123,
      education: null,
      keywords: null,
      rawTextLength: "invalid",
    });
    expect(result.valid).toBe(false);
    expect(result.errors?.length).toBeGreaterThan(1);
  });
});

// ============================================================================
// Scoring Result Validation Tests
// ============================================================================

describe("validateScoringResult", () => {
  const validScoring = {
    skillMatchScore: 0.8,
    experienceMatchScore: 1,
    locationMatchScore: 0.9,
    finalScore: 0.87,
  };

  it("should validate a correct scoring result", () => {
    const result = validateScoringResult(validScoring);
    expect(result.valid).toBe(true);
    expect(result.data).toEqual(validScoring);
  });

  it("should reject null input", () => {
    const result = validateScoringResult(null);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("ScoringResult must be an object");
  });

  describe("score range validation", () => {
    it("should reject scores below 0", () => {
      const result = validateScoringResult({ ...validScoring, skillMatchScore: -0.1 });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("skillMatchScore must be between 0 and 1");
    });

    it("should reject scores above 1", () => {
      const result = validateScoringResult({ ...validScoring, experienceMatchScore: 1.5 });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("experienceMatchScore must be between 0 and 1");
    });

    it("should accept boundary values 0 and 1", () => {
      const result = validateScoringResult({
        skillMatchScore: 0,
        experienceMatchScore: 1,
        locationMatchScore: 0,
        finalScore: 0.3,
      });
      expect(result.valid).toBe(true);
    });
  });

  it("should reject non-number scores", () => {
    const result = validateScoringResult({ ...validScoring, finalScore: "0.87" });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("finalScore must be a number");
  });

  it("should reject NaN values", () => {
    const result = validateScoringResult({ ...validScoring, skillMatchScore: NaN });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("skillMatchScore must be a number");
  });

  it("should reject Infinity values", () => {
    const result = validateScoringResult({ ...validScoring, locationMatchScore: Infinity });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("locationMatchScore must be a number");
  });
});

// ============================================================================
// Agent Recommendation Validation Tests
// ============================================================================

describe("validateAgentRecommendation", () => {
  const validRecommendation = {
    recommended: true,
    score: 0.82,
    confidence: 0.91,
    reason: "Strong skill match (80%), experience within range.",
    decision: "RECOMMENDED" as const,
  };

  it("should validate a correct recommendation", () => {
    const result = validateAgentRecommendation(validRecommendation);
    expect(result.valid).toBe(true);
    expect(result.data).toEqual(validRecommendation);
  });

  it("should reject null input", () => {
    const result = validateAgentRecommendation(null);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("AgentRecommendation must be an object");
  });

  describe("recommended validation", () => {
    it("should reject non-boolean recommended", () => {
      const result = validateAgentRecommendation({ ...validRecommendation, recommended: "yes" });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("recommended must be a boolean");
    });

    it("should accept false for recommended", () => {
      const result = validateAgentRecommendation({ ...validRecommendation, recommended: false });
      expect(result.valid).toBe(true);
    });
  });

  describe("score validation", () => {
    it("should reject score below 0", () => {
      const result = validateAgentRecommendation({ ...validRecommendation, score: -0.5 });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("score must be between 0 and 1");
    });

    it("should reject score above 1", () => {
      const result = validateAgentRecommendation({ ...validRecommendation, score: 1.2 });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("score must be between 0 and 1");
    });
  });

  describe("confidence validation", () => {
    it("should reject confidence below 0", () => {
      const result = validateAgentRecommendation({ ...validRecommendation, confidence: -0.1 });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("confidence must be between 0 and 1");
    });

    it("should reject confidence above 1", () => {
      const result = validateAgentRecommendation({ ...validRecommendation, confidence: 1.5 });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("confidence must be between 0 and 1");
    });
  });

  describe("reason validation", () => {
    it("should reject non-string reason", () => {
      const result = validateAgentRecommendation({ ...validRecommendation, reason: 123 });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("reason must be a string");
    });

    it("should reject empty reason", () => {
      const result = validateAgentRecommendation({ ...validRecommendation, reason: "" });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("reason cannot be empty");
    });

    it("should reject whitespace-only reason", () => {
      const result = validateAgentRecommendation({ ...validRecommendation, reason: "   " });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("reason cannot be empty");
    });

    it("should reject reason over 1000 characters", () => {
      const result = validateAgentRecommendation({
        ...validRecommendation,
        reason: "x".repeat(1001),
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("reason must be under 1000 characters");
    });
  });

  describe("decision validation", () => {
    it("should accept RECOMMENDED", () => {
      const result = validateAgentRecommendation({ ...validRecommendation, decision: "RECOMMENDED" });
      expect(result.valid).toBe(true);
    });

    it("should accept BORDERLINE", () => {
      const result = validateAgentRecommendation({
        ...validRecommendation,
        recommended: false,
        decision: "BORDERLINE",
      });
      expect(result.valid).toBe(true);
    });

    it("should accept NOT_RECOMMENDED", () => {
      const result = validateAgentRecommendation({
        ...validRecommendation,
        recommended: false,
        decision: "NOT_RECOMMENDED",
      });
      expect(result.valid).toBe(true);
    });

    it("should reject invalid decision", () => {
      const result = validateAgentRecommendation({ ...validRecommendation, decision: "MAYBE" });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("decision must be RECOMMENDED, BORDERLINE, or NOT_RECOMMENDED");
    });
  });
});

// ============================================================================
// Agent Result Validation Tests
// ============================================================================

describe("validateAgentResult", () => {
  const validResult = {
    recommendation: {
      recommended: true,
      score: 0.82,
      confidence: 0.91,
      reason: "Strong skill match.",
      decision: "RECOMMENDED",
    },
    metadata: {
      profileId: 123,
      openingId: "opening-uuid",
      totalLatencyMs: 1200,
    },
    reasoning: {
      toolCalls: [],
      iterations: 1,
    },
  };

  it("should validate a correct agent result", () => {
    const result = validateAgentResult(validResult);
    expect(result.valid).toBe(true);
  });

  it("should reject null input", () => {
    const result = validateAgentResult(null);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("AgentResult must be an object");
  });

  it("should reject missing recommendation", () => {
    const { recommendation, ...rest } = validResult;
    const result = validateAgentResult(rest);
    expect(result.valid).toBe(false);
    expect(result.errors?.some((e) => e.includes("recommendation"))).toBe(true);
  });

  it("should reject missing metadata", () => {
    const { metadata, ...rest } = validResult;
    const result = validateAgentResult(rest);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("metadata must be an object");
  });

  it("should reject missing reasoning", () => {
    const { reasoning, ...rest } = validResult;
    const result = validateAgentResult(rest);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("reasoning must be an object");
  });

  it("should validate nested recommendation errors", () => {
    const result = validateAgentResult({
      ...validResult,
      recommendation: { ...validResult.recommendation, score: 2 },
    });
    expect(result.valid).toBe(false);
    expect(result.errors?.some((e) => e.includes("score"))).toBe(true);
  });
});

// ============================================================================
// Tool Call Arguments Validation Tests
// ============================================================================

describe("validateToolCallArguments", () => {
  describe("parse_resume tool", () => {
    it("should validate correct parse_resume arguments", () => {
      const result = validateToolCallArguments("parse_resume", {
        profileId: 123,
        s3Key: "contract-hiring/tenant/opening/file.pdf",
      });
      expect(result.valid).toBe(true);
    });

    it("should reject missing profileId", () => {
      const result = validateToolCallArguments("parse_resume", {
        s3Key: "file.pdf",
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("profileId is required");
    });

    it("should reject missing s3Key", () => {
      const result = validateToolCallArguments("parse_resume", {
        profileId: 123,
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("s3Key is required");
    });
  });

  describe("normalize_skills tool", () => {
    it("should validate correct normalize_skills arguments", () => {
      const result = validateToolCallArguments("normalize_skills", {
        skills: ["js", "ts", "react"],
      });
      expect(result.valid).toBe(true);
    });

    it("should reject non-array skills", () => {
      const result = validateToolCallArguments("normalize_skills", {
        skills: "JavaScript",
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("skills must be an array of strings");
    });
  });

  describe("calculate_score tool", () => {
    it("should validate correct calculate_score arguments", () => {
      const result = validateToolCallArguments("calculate_score", {
        candidateExperience: 5,
        candidateSkills: ["JavaScript", "React"],
        candidateLocation: "New York",
        requiredSkills: ["JavaScript"],
        experienceMin: 3,
        experienceMax: 8,
        openingLocation: "New York",
        locationType: "ONSITE",
      });
      expect(result.valid).toBe(true);
    });

    it("should reject missing candidateExperience", () => {
      const result = validateToolCallArguments("calculate_score", {
        candidateSkills: ["JavaScript"],
        candidateLocation: "New York",
        requiredSkills: ["JavaScript"],
        experienceMin: 3,
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("candidateExperience is required");
    });

    it("should reject non-array candidateSkills", () => {
      const result = validateToolCallArguments("calculate_score", {
        candidateExperience: 5,
        candidateSkills: "JavaScript",
        candidateLocation: "New York",
        requiredSkills: ["JavaScript"],
        experienceMin: 3,
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("candidateSkills must be an array");
    });
  });

  describe("extract_features tool", () => {
    it("should validate correct extract_features arguments", () => {
      const result = validateToolCallArguments("extract_features", {
        experienceYears: 5,
        skills: ["JavaScript", "React"],
        location: "New York",
      });
      expect(result.valid).toBe(true);
    });

    it("should reject missing fields", () => {
      const result = validateToolCallArguments("extract_features", {
        experienceYears: 5,
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("skills must be an array");
      expect(result.errors).toContain("location is required");
    });
  });

  describe("unknown tool", () => {
    it("should reject unknown tool names", () => {
      const result = validateToolCallArguments("unknown_tool", {});
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Unknown tool: unknown_tool");
    });
  });
});
