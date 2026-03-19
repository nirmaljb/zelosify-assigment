/**
 * @fileoverview Unit tests for Scoring Engine Tool
 * Tests deterministic scoring logic per spec:
 * - Experience boundary tests
 * - Skill overlap accuracy
 * - Score formula correctness
 * - Location logic
 * - Decision thresholds
 */

import { describe, it, expect } from "vitest";
import {
  calculateExperienceScore,
  calculateSkillScore,
  calculateLocationScore,
  calculateFinalScore,
  getDecision,
  calculateScore,
  generateScoringExplanation,
} from "../../../../../src/modules/contractHiring/agent/tools/scoringEngine.js";

// ============================================================================
// Experience Score Tests
// ============================================================================

describe("calculateExperienceScore", () => {
  describe("under-qualified candidates (score = 0)", () => {
    it("should return 0 when candidate experience is below minimum", () => {
      expect(calculateExperienceScore(2, 5, 10)).toBe(0);
    });

    it("should return 0 when candidate has 0 years but min is 1", () => {
      expect(calculateExperienceScore(0, 1, 5)).toBe(0);
    });

    it("should return 0 when candidate is just under minimum", () => {
      expect(calculateExperienceScore(4.9, 5, 10)).toBe(0);
    });
  });

  describe("within-range candidates (score = 1)", () => {
    it("should return 1 when candidate experience equals minimum", () => {
      expect(calculateExperienceScore(5, 5, 10)).toBe(1);
    });

    it("should return 1 when candidate experience equals maximum", () => {
      expect(calculateExperienceScore(10, 5, 10)).toBe(1);
    });

    it("should return 1 when candidate experience is in middle of range", () => {
      expect(calculateExperienceScore(7, 5, 10)).toBe(1);
    });

    it("should return 1 when no max specified and candidate >= min", () => {
      expect(calculateExperienceScore(15, 5, null)).toBe(1);
    });

    it("should return 1 for entry level (0-3 range)", () => {
      expect(calculateExperienceScore(0, 0, 3)).toBe(1);
      expect(calculateExperienceScore(2, 0, 3)).toBe(1);
    });
  });

  describe("over-qualified candidates (score = 0.8)", () => {
    it("should return 0.8 when candidate experience exceeds maximum", () => {
      expect(calculateExperienceScore(12, 5, 10)).toBe(0.8);
    });

    it("should return 0.8 for significantly over-qualified candidates", () => {
      expect(calculateExperienceScore(20, 3, 5)).toBe(0.8);
    });
  });

  describe("edge cases", () => {
    it("should handle undefined max as null", () => {
      // @ts-expect-error Testing undefined behavior
      expect(calculateExperienceScore(10, 5, undefined)).toBe(1);
    });

    it("should handle zero experience range (min = max)", () => {
      expect(calculateExperienceScore(5, 5, 5)).toBe(1);
      expect(calculateExperienceScore(4, 5, 5)).toBe(0);
      expect(calculateExperienceScore(6, 5, 5)).toBe(0.8);
    });
  });
});

// ============================================================================
// Skill Score Tests
// ============================================================================

describe("calculateSkillScore", () => {
  describe("basic skill matching", () => {
    it("should return 1 when all required skills are present", () => {
      const candidateSkills = ["JavaScript", "React", "Node.js", "PostgreSQL"];
      const requiredSkills = ["JavaScript", "React"];
      expect(calculateSkillScore(candidateSkills, requiredSkills)).toBe(1);
    });

    it("should return 0.5 when half the required skills are present", () => {
      const candidateSkills = ["JavaScript"];
      const requiredSkills = ["JavaScript", "Python"];
      expect(calculateSkillScore(candidateSkills, requiredSkills)).toBe(0.5);
    });

    it("should return 0 when no required skills are present", () => {
      const candidateSkills = ["Rust", "Go"];
      const requiredSkills = ["JavaScript", "Python", "Java"];
      expect(calculateSkillScore(candidateSkills, requiredSkills)).toBe(0);
    });
  });

  describe("skill normalization integration", () => {
    it("should match normalized skill variations", () => {
      const candidateSkills = ["js", "node", "pg"];
      const requiredSkills = ["JavaScript", "Node.js", "PostgreSQL"];
      expect(calculateSkillScore(candidateSkills, requiredSkills)).toBe(1);
    });

    it("should match TypeScript variations", () => {
      const candidateSkills = ["ts", "react"];
      const requiredSkills = ["TypeScript", "React"];
      expect(calculateSkillScore(candidateSkills, requiredSkills)).toBe(1);
    });

    it("should match Kubernetes abbreviations", () => {
      const candidateSkills = ["k8s", "docker"];
      const requiredSkills = ["Kubernetes", "Docker"];
      expect(calculateSkillScore(candidateSkills, requiredSkills)).toBe(1);
    });
  });

  describe("edge cases", () => {
    it("should return 1 when no skills are required", () => {
      const candidateSkills = ["JavaScript", "React"];
      const requiredSkills: string[] = [];
      expect(calculateSkillScore(candidateSkills, requiredSkills)).toBe(1);
    });

    it("should return 0 when candidate has no skills but some are required", () => {
      const candidateSkills: string[] = [];
      const requiredSkills = ["JavaScript"];
      expect(calculateSkillScore(candidateSkills, requiredSkills)).toBe(0);
    });

    it("should handle case-insensitive matching", () => {
      const candidateSkills = ["JAVASCRIPT", "react", "Node.JS"];
      const requiredSkills = ["javascript", "REACT", "node.js"];
      expect(calculateSkillScore(candidateSkills, requiredSkills)).toBe(1);
    });
  });

  describe("partial matches", () => {
    it("should calculate correct ratio for 3 of 5 skills", () => {
      const candidateSkills = ["JavaScript", "React", "Node.js"];
      const requiredSkills = ["JavaScript", "React", "Node.js", "PostgreSQL", "Docker"];
      expect(calculateSkillScore(candidateSkills, requiredSkills)).toBe(0.6);
    });

    it("should calculate correct ratio for 1 of 4 skills", () => {
      const candidateSkills = ["Python"];
      const requiredSkills = ["JavaScript", "React", "Node.js", "Python"];
      expect(calculateSkillScore(candidateSkills, requiredSkills)).toBe(0.25);
    });
  });
});

// ============================================================================
// Location Score Tests
// ============================================================================

describe("calculateLocationScore", () => {
  describe("remote positions", () => {
    it("should return 1 for remote positions regardless of candidate location", () => {
      expect(calculateLocationScore("New York", "San Francisco", "REMOTE")).toBe(1);
      expect(calculateLocationScore("London", "Tokyo", "Remote")).toBe(1);
      expect(calculateLocationScore("", "Anywhere", "remote")).toBe(1);
    });
  });

  describe("exact match", () => {
    it("should return 1 for exact location match", () => {
      expect(calculateLocationScore("Gotham City", "Gotham City", "ONSITE")).toBe(1);
    });

    it("should return 1 for case-insensitive exact match", () => {
      expect(calculateLocationScore("gotham city", "Gotham City", "ONSITE")).toBe(1);
      expect(calculateLocationScore("NEW YORK", "new york", "HYBRID")).toBe(1);
    });
  });

  describe("partial match", () => {
    it("should return 0.9 when candidate location contains opening location", () => {
      expect(calculateLocationScore("San Francisco, CA", "San Francisco", "ONSITE")).toBe(0.9);
    });

    it("should return 0.9 when opening location contains candidate location", () => {
      expect(calculateLocationScore("NYC", "New York City, NYC Metro", "ONSITE")).toBe(0.9);
    });

    it("should return 0.9 if candidate mentions remote availability", () => {
      expect(calculateLocationScore("Remote / Austin", "San Francisco", "ONSITE")).toBe(0.9);
    });
  });

  describe("mismatch", () => {
    it("should return 0.5 for location mismatch", () => {
      expect(calculateLocationScore("London", "Tokyo", "ONSITE")).toBe(0.5);
    });

    it("should return 0.5 for completely different locations", () => {
      expect(calculateLocationScore("Berlin", "Sydney", "HYBRID")).toBe(0.5);
    });
  });

  describe("no location specified", () => {
    it("should return 1 when opening has no location", () => {
      expect(calculateLocationScore("Anywhere", null, "ONSITE")).toBe(1);
      expect(calculateLocationScore("London", "", "HYBRID")).toBe(1);
    });
  });
});

// ============================================================================
// Final Score Formula Tests
// ============================================================================

describe("calculateFinalScore", () => {
  it("should apply correct weights: 0.5 skill + 0.3 exp + 0.2 location", () => {
    // All perfect scores
    expect(calculateFinalScore(1, 1, 1)).toBe(1);
    
    // All zeros
    expect(calculateFinalScore(0, 0, 0)).toBe(0);
  });

  it("should calculate weighted average correctly", () => {
    // skillMatchScore=1, expMatchScore=1, locMatchScore=0
    // 0.5*1 + 0.3*1 + 0.2*0 = 0.8
    expect(calculateFinalScore(1, 1, 0)).toBe(0.8);
    
    // skillMatchScore=1, expMatchScore=0, locMatchScore=1
    // 0.5*1 + 0.3*0 + 0.2*1 = 0.7
    expect(calculateFinalScore(1, 0, 1)).toBe(0.7);
    
    // skillMatchScore=0, expMatchScore=1, locMatchScore=1
    // 0.5*0 + 0.3*1 + 0.2*1 = 0.5
    expect(calculateFinalScore(0, 1, 1)).toBe(0.5);
  });

  it("should round to 2 decimal places", () => {
    // 0.5*0.333 + 0.3*0.666 + 0.2*0.999 = 0.1665 + 0.1998 + 0.1998 = 0.5661
    expect(calculateFinalScore(0.333, 0.666, 0.999)).toBe(0.57);
  });

  it("should handle boundary scores correctly", () => {
    // Exactly at recommended threshold: 0.75
    // Need: 0.5*x + 0.3*1 + 0.2*1 = 0.75
    // 0.5*x + 0.5 = 0.75 => x = 0.5
    expect(calculateFinalScore(0.5, 1, 1)).toBe(0.75);
  });
});

// ============================================================================
// Decision Threshold Tests
// ============================================================================

describe("getDecision", () => {
  describe("RECOMMENDED threshold (>= 0.75)", () => {
    it("should return RECOMMENDED for score exactly 0.75", () => {
      expect(getDecision(0.75)).toBe("RECOMMENDED");
    });

    it("should return RECOMMENDED for scores above 0.75", () => {
      expect(getDecision(0.85)).toBe("RECOMMENDED");
      expect(getDecision(1)).toBe("RECOMMENDED");
    });
  });

  describe("BORDERLINE threshold (0.5 - 0.74)", () => {
    it("should return BORDERLINE for score exactly 0.5", () => {
      expect(getDecision(0.5)).toBe("BORDERLINE");
    });

    it("should return BORDERLINE for score exactly 0.74", () => {
      expect(getDecision(0.74)).toBe("BORDERLINE");
    });

    it("should return BORDERLINE for scores in range", () => {
      expect(getDecision(0.6)).toBe("BORDERLINE");
      expect(getDecision(0.65)).toBe("BORDERLINE");
    });
  });

  describe("NOT_RECOMMENDED threshold (< 0.5)", () => {
    it("should return NOT_RECOMMENDED for score just below 0.5", () => {
      expect(getDecision(0.49)).toBe("NOT_RECOMMENDED");
    });

    it("should return NOT_RECOMMENDED for zero", () => {
      expect(getDecision(0)).toBe("NOT_RECOMMENDED");
    });

    it("should return NOT_RECOMMENDED for low scores", () => {
      expect(getDecision(0.25)).toBe("NOT_RECOMMENDED");
      expect(getDecision(0.1)).toBe("NOT_RECOMMENDED");
    });
  });
});

// ============================================================================
// Full Scoring Pipeline Tests
// ============================================================================

describe("calculateScore (full pipeline)", () => {
  it("should calculate perfect score for ideal candidate", () => {
    const result = calculateScore(
      5,                                    // candidateExperience
      ["JavaScript", "React", "Node.js"],  // candidateSkills
      "Gotham City",                        // candidateLocation
      ["JavaScript", "React", "Node.js"],  // requiredSkills
      3,                                    // experienceMin
      7,                                    // experienceMax
      "Gotham City",                        // openingLocation
      "ONSITE"                              // locationType
    );

    expect(result.skillMatchScore).toBe(1);
    expect(result.experienceMatchScore).toBe(1);
    expect(result.locationMatchScore).toBe(1);
    expect(result.finalScore).toBe(1);
  });

  it("should calculate zero score for completely unqualified candidate", () => {
    const result = calculateScore(
      1,                          // candidateExperience (below min of 5)
      ["Rust", "Go"],            // candidateSkills (none match)
      "London",                   // candidateLocation (mismatch)
      ["JavaScript", "Python"],  // requiredSkills
      5,                          // experienceMin
      10,                         // experienceMax
      "Tokyo",                    // openingLocation
      "ONSITE"                    // locationType
    );

    expect(result.skillMatchScore).toBe(0);
    expect(result.experienceMatchScore).toBe(0);
    expect(result.locationMatchScore).toBe(0.5);
    expect(result.finalScore).toBe(0.1); // 0.5*0 + 0.3*0 + 0.2*0.5 = 0.1
  });

  it("should handle borderline case correctly", () => {
    const result = calculateScore(
      5,                          // candidateExperience (within range)
      ["JavaScript"],            // candidateSkills (1 of 2)
      "Remote",                   // candidateLocation (indicates remote)
      ["JavaScript", "Python"],  // requiredSkills
      3,                          // experienceMin
      7,                          // experienceMax
      "New York",                 // openingLocation
      "ONSITE"                    // locationType
    );

    expect(result.skillMatchScore).toBe(0.5);
    expect(result.experienceMatchScore).toBe(1);
    // Remote candidate for onsite position = 0.9
    expect(result.locationMatchScore).toBe(0.9);
    // 0.5*0.5 + 0.3*1 + 0.2*0.9 = 0.25 + 0.3 + 0.18 = 0.73
    expect(result.finalScore).toBe(0.73);
  });

  it("should handle remote position correctly", () => {
    const result = calculateScore(
      8,                                    // candidateExperience
      ["Python", "Django", "PostgreSQL"],  // candidateSkills
      "Antarctica",                         // candidateLocation (anywhere)
      ["Python", "Django"],                // requiredSkills
      5,                                    // experienceMin
      10,                                   // experienceMax
      "San Francisco",                      // openingLocation
      "REMOTE"                              // locationType
    );

    expect(result.skillMatchScore).toBe(1);
    expect(result.experienceMatchScore).toBe(1);
    expect(result.locationMatchScore).toBe(1); // Remote = always 1
    expect(result.finalScore).toBe(1);
  });
});

// ============================================================================
// Explanation Generation Tests
// ============================================================================

describe("generateScoringExplanation", () => {
  it("should generate explanation for strong candidate", () => {
    const result = {
      skillMatchScore: 0.9,
      experienceMatchScore: 1,
      locationMatchScore: 1,
      finalScore: 0.95,
    };
    const explanation = generateScoringExplanation(
      result,
      ["JavaScript", "React", "Node.js"],
      ["JavaScript", "React", "Node.js", "Python"]
    );

    expect(explanation).toContain("Strong skill match");
    expect(explanation).toContain("experience within range");
    expect(explanation).toContain("location compatible");
  });

  it("should generate explanation for weak candidate", () => {
    const result = {
      skillMatchScore: 0.2,
      experienceMatchScore: 0,
      locationMatchScore: 0.5,
      finalScore: 0.2,
    };
    const explanation = generateScoringExplanation(
      result,
      ["Rust"],
      ["JavaScript", "Python", "Java", "Go"]
    );

    expect(explanation).toContain("Limited skill match");
    expect(explanation).toContain("missing:");
    expect(explanation).toContain("experience below requirements");
  });

  it("should generate explanation for over-qualified candidate", () => {
    const result = {
      skillMatchScore: 1,
      experienceMatchScore: 0.8,
      locationMatchScore: 1,
      finalScore: 0.94,
    };
    const explanation = generateScoringExplanation(
      result,
      ["JavaScript", "React"],
      ["JavaScript", "React"]
    );

    expect(explanation).toContain("Strong skill match");
    expect(explanation).toContain("slightly overqualified");
  });
});
