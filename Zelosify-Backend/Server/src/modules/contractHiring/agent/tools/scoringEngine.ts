/**
 * Scoring Engine Tool
 * 
 * Implements the deterministic scoring logic as specified.
 * This must be invoked as a tool by the agent - not calculated by the LLM.
 * 
 * Formula:
 *   FinalScore = (0.5 × skillMatchScore) + (0.3 × experienceMatchScore) + (0.2 × locationMatchScore)
 * 
 * Decision Thresholds:
 *   >= 0.75: Recommended
 *   0.5 - 0.74: Borderline
 *   < 0.5: Not Recommended
 */

import type { ScoringResult, RecommendationDecision } from "../types.js";
import { normalizeSkills } from "./skillNormalizer.js";

// ============================================================================
// Scoring Weights (from spec)
// ============================================================================

const SKILL_WEIGHT = 0.5;
const EXPERIENCE_WEIGHT = 0.3;
const LOCATION_WEIGHT = 0.2;

// ============================================================================
// Decision Thresholds (from spec)
// ============================================================================

const RECOMMENDED_THRESHOLD = 0.75;
const BORDERLINE_THRESHOLD = 0.5;

// ============================================================================
// Scoring Functions
// ============================================================================

/**
 * Calculate experience match score
 * 
 * Rules:
 * - candidateExp < min → 0
 * - within range → 1
 * - above max → 0.8
 */
export function calculateExperienceScore(
  candidateExperience: number,
  experienceMin: number,
  experienceMax: number | null
): number {
  // Under-qualified
  if (candidateExperience < experienceMin) {
    return 0;
  }
  
  // If no max specified, any experience >= min is perfect
  if (experienceMax === null || experienceMax === undefined) {
    return 1;
  }
  
  // Within range
  if (candidateExperience <= experienceMax) {
    return 1;
  }
  
  // Over-qualified
  return 0.8;
}

/**
 * Calculate skill match score
 * 
 * Formula: overlap / requiredSkills
 */
export function calculateSkillScore(
  candidateSkills: string[],
  requiredSkills: string[]
): number {
  if (requiredSkills.length === 0) {
    // No required skills means any skills are acceptable
    return 1;
  }
  
  const normalizedCandidate = normalizeSkills(candidateSkills);
  const normalizedRequired = normalizeSkills(requiredSkills);
  
  let matchCount = 0;
  for (const required of normalizedRequired) {
    if (normalizedCandidate.some((c) => c.toLowerCase() === required.toLowerCase())) {
      matchCount++;
    }
  }
  
  return matchCount / requiredSkills.length;
}

/**
 * Calculate location match score
 * 
 * Rules:
 * - Remote opening → 1 (anyone can work remote)
 * - Onsite exact match → 1
 * - Onsite mismatch → 0.5
 */
export function calculateLocationScore(
  candidateLocation: string,
  openingLocation: string | null,
  locationType: string | null
): number {
  // Remote positions accept anyone
  if (locationType?.toUpperCase() === "REMOTE") {
    return 1;
  }
  
  // No location specified
  if (!openingLocation) {
    return 1;
  }
  
  // Normalize for comparison
  const normalizedCandidate = candidateLocation.toLowerCase().trim();
  const normalizedOpening = openingLocation.toLowerCase().trim();
  
  // Exact match
  if (normalizedCandidate === normalizedOpening) {
    return 1;
  }
  
  // Partial match (city is contained)
  if (normalizedCandidate.includes(normalizedOpening) || 
      normalizedOpening.includes(normalizedCandidate)) {
    return 0.9;
  }
  
  // Candidate indicates remote availability
  if (normalizedCandidate.includes("remote")) {
    return 0.9;
  }
  
  // Mismatch
  return 0.5;
}

/**
 * Calculate final score using the formula
 */
export function calculateFinalScore(
  skillMatchScore: number,
  experienceMatchScore: number,
  locationMatchScore: number
): number {
  const score = 
    (SKILL_WEIGHT * skillMatchScore) +
    (EXPERIENCE_WEIGHT * experienceMatchScore) +
    (LOCATION_WEIGHT * locationMatchScore);
  
  // Round to 2 decimal places
  return Math.round(score * 100) / 100;
}

/**
 * Determine recommendation decision based on score
 */
export function getDecision(finalScore: number): RecommendationDecision {
  if (finalScore >= RECOMMENDED_THRESHOLD) {
    return "RECOMMENDED";
  }
  if (finalScore >= BORDERLINE_THRESHOLD) {
    return "BORDERLINE";
  }
  return "NOT_RECOMMENDED";
}

/**
 * Main scoring engine function
 * Returns complete scoring breakdown for transparency
 */
export function calculateScore(
  candidateExperience: number,
  candidateSkills: string[],
  candidateLocation: string,
  requiredSkills: string[],
  experienceMin: number,
  experienceMax: number | null,
  openingLocation: string | null,
  locationType: string | null
): ScoringResult {
  const skillMatchScore = calculateSkillScore(candidateSkills, requiredSkills);
  const experienceMatchScore = calculateExperienceScore(
    candidateExperience,
    experienceMin,
    experienceMax
  );
  const locationMatchScore = calculateLocationScore(
    candidateLocation,
    openingLocation,
    locationType
  );
  const finalScore = calculateFinalScore(
    skillMatchScore,
    experienceMatchScore,
    locationMatchScore
  );
  
  return {
    skillMatchScore,
    experienceMatchScore,
    locationMatchScore,
    finalScore,
  };
}

/**
 * Generate human-readable explanation of scoring
 */
export function generateScoringExplanation(
  scoringResult: ScoringResult,
  candidateSkills: string[],
  requiredSkills: string[]
): string {
  const { skillMatchScore, experienceMatchScore, locationMatchScore, finalScore } = scoringResult;
  const decision = getDecision(finalScore);
  
  const skillPercent = Math.round(skillMatchScore * 100);
  const expPercent = Math.round(experienceMatchScore * 100);
  const locPercent = Math.round(locationMatchScore * 100);
  
  const parts: string[] = [];
  
  // Skill analysis
  if (skillMatchScore >= 0.8) {
    parts.push(`Strong skill match (${skillPercent}%)`);
  } else if (skillMatchScore >= 0.5) {
    parts.push(`Moderate skill match (${skillPercent}%)`);
  } else {
    const normalizedRequired = normalizeSkills(requiredSkills);
    const normalizedCandidate = normalizeSkills(candidateSkills);
    const missing = normalizedRequired.filter(
      (r) => !normalizedCandidate.some((c) => c.toLowerCase() === r.toLowerCase())
    );
    parts.push(`Limited skill match (${skillPercent}%), missing: ${missing.slice(0, 3).join(", ")}`);
  }
  
  // Experience analysis
  if (experienceMatchScore === 1) {
    parts.push("experience within range");
  } else if (experienceMatchScore === 0.8) {
    parts.push("slightly overqualified");
  } else {
    parts.push("experience below requirements");
  }
  
  // Location analysis
  if (locationMatchScore === 1) {
    parts.push("location compatible");
  } else if (locationMatchScore >= 0.5) {
    parts.push("location may require consideration");
  }
  
  return parts.join(", ") + ".";
}
