/**
 * @fileoverview Performance tests for Contract Hiring
 * Tests 100-profile simulation with P95 < 2000ms requirement
 * 
 * Note: These tests simulate the performance-critical paths
 * without actual LLM calls for consistent benchmarking.
 */

import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import {
  calculateScore,
  getDecision,
  generateScoringExplanation,
} from "../../../src/modules/contractHiring/agent/tools/scoringEngine.js";
import { normalizeSkills } from "../../../src/modules/contractHiring/agent/tools/skillNormalizer.js";
import { sanitizeForLLM } from "../../../src/modules/contractHiring/agent/tools/sanitizer.js";
import {
  validateParsedResume,
  validateScoringResult,
  validateAgentRecommendation,
} from "../../../src/modules/contractHiring/agent/schemaValidator.js";

// ============================================================================
// Test Data Generators
// ============================================================================

function generateRandomSkills(count: number): string[] {
  const allSkills = [
    "JavaScript", "TypeScript", "Python", "Java", "Go", "Rust",
    "React", "Vue", "Angular", "Node.js", "Express", "Django",
    "PostgreSQL", "MongoDB", "Redis", "MySQL", "Docker", "Kubernetes",
    "AWS", "GCP", "Azure", "CI/CD", "Git", "Linux", "GraphQL", "REST",
  ];
  
  const shuffled = [...allSkills].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function generateMockResumeText(): string {
  const lines = [];
  lines.push("John Doe");
  lines.push("Senior Software Engineer");
  lines.push("");
  lines.push("EXPERIENCE");
  lines.push(`${Math.floor(Math.random() * 15)} years of experience in software development`);
  lines.push("");
  lines.push("SKILLS");
  lines.push(generateRandomSkills(10).join(", "));
  lines.push("");
  lines.push("EDUCATION");
  lines.push("BS Computer Science, MIT 2015");
  lines.push("");
  lines.push("LOCATION");
  lines.push(Math.random() > 0.5 ? "Remote" : "San Francisco, CA");
  
  return lines.join("\n");
}

interface ProfileSimulation {
  id: number;
  s3Key: string;
  candidateExperience: number;
  candidateSkills: string[];
  candidateLocation: string;
  resumeText: string;
}

function generateMockProfiles(count: number): ProfileSimulation[] {
  const profiles: ProfileSimulation[] = [];
  const locations = ["New York", "San Francisco", "Remote", "Austin", "Seattle", "Chicago"];
  
  for (let i = 0; i < count; i++) {
    profiles.push({
      id: i + 1,
      s3Key: `contract-hiring/tenant/opening/${i}_resume.pdf`,
      candidateExperience: Math.floor(Math.random() * 15),
      candidateSkills: generateRandomSkills(Math.floor(Math.random() * 8) + 3),
      candidateLocation: locations[Math.floor(Math.random() * locations.length)],
      resumeText: generateMockResumeText(),
    });
  }
  
  return profiles;
}

const mockOpening = {
  requiredSkills: ["JavaScript", "React", "Node.js", "TypeScript"],
  experienceMin: 3,
  experienceMax: 10,
  location: "San Francisco",
  locationType: "HYBRID",
};

// ============================================================================
// Performance Tests
// ============================================================================

describe("Performance: 100-Profile Simulation", () => {
  const PROFILE_COUNT = 100;
  const profiles = generateMockProfiles(PROFILE_COUNT);
  const latencies: number[] = [];
  
  beforeAll(() => {
    // Warm up the functions
    for (let i = 0; i < 10; i++) {
      normalizeSkills(["js", "ts", "react"]);
      calculateScore(5, ["JavaScript"], "SF", ["JavaScript"], 3, 8, "SF", "HYBRID");
    }
  });

  it("should process 100 profiles within performance requirements", () => {
    const startTime = performance.now();
    
    for (const profile of profiles) {
      const profileStart = performance.now();
      
      // Step 1: Sanitize resume text
      const sanitizedText = sanitizeForLLM(profile.resumeText);
      expect(sanitizedText.length).toBeGreaterThan(0);
      
      // Step 2: Normalize skills
      const normalizedSkills = normalizeSkills(profile.candidateSkills);
      expect(normalizedSkills.length).toBeGreaterThan(0);
      
      // Step 3: Calculate deterministic score
      const scoringResult = calculateScore(
        profile.candidateExperience,
        normalizedSkills,
        profile.candidateLocation,
        mockOpening.requiredSkills,
        mockOpening.experienceMin,
        mockOpening.experienceMax,
        mockOpening.location,
        mockOpening.locationType
      );
      
      // Step 4: Get decision
      const decision = getDecision(scoringResult.finalScore);
      
      // Step 5: Generate explanation
      const explanation = generateScoringExplanation(
        scoringResult,
        normalizedSkills,
        mockOpening.requiredSkills
      );
      
      // Step 6: Validate outputs
      const scoringValidation = validateScoringResult(scoringResult);
      expect(scoringValidation.valid).toBe(true);
      
      const recommendationData = {
        recommended: decision === "RECOMMENDED",
        score: scoringResult.finalScore,
        confidence: 0.9,
        reason: explanation,
        decision,
      };
      
      const recommendationValidation = validateAgentRecommendation(recommendationData);
      expect(recommendationValidation.valid).toBe(true);
      
      const profileEnd = performance.now();
      latencies.push(profileEnd - profileStart);
    }
    
    const totalTime = performance.now() - startTime;
    
    // Calculate statistics
    const sortedLatencies = [...latencies].sort((a, b) => a - b);
    const p50Index = Math.floor(sortedLatencies.length * 0.5);
    const p95Index = Math.floor(sortedLatencies.length * 0.95);
    const p99Index = Math.floor(sortedLatencies.length * 0.99);
    
    const p50 = sortedLatencies[p50Index];
    const p95 = sortedLatencies[p95Index];
    const p99 = sortedLatencies[p99Index];
    const avg = latencies.reduce((a, b) => a + b, 0) / latencies.length;
    const max = Math.max(...latencies);
    const min = Math.min(...latencies);
    
    // Log performance results
    console.log("\n=== Performance Results ===");
    console.log(`Total profiles: ${PROFILE_COUNT}`);
    console.log(`Total time: ${totalTime.toFixed(2)}ms`);
    console.log(`Average per profile: ${avg.toFixed(2)}ms`);
    console.log(`P50: ${p50.toFixed(2)}ms`);
    console.log(`P95: ${p95.toFixed(2)}ms`);
    console.log(`P99: ${p99.toFixed(2)}ms`);
    console.log(`Min: ${min.toFixed(2)}ms`);
    console.log(`Max: ${max.toFixed(2)}ms`);
    console.log("===========================\n");
    
    // Performance assertions
    // Note: The spec requires P95 < 2000ms for full LLM flow
    // For deterministic scoring (without LLM), we expect much faster
    expect(p95).toBeLessThan(50); // Deterministic scoring should be < 50ms per profile
    expect(avg).toBeLessThan(10); // Average should be very fast
  });

  it("should maintain performance under repeated processing", () => {
    const iterations = 3;
    const iterationTimes: number[] = [];
    
    for (let iter = 0; iter < iterations; iter++) {
      const iterStart = performance.now();
      
      for (const profile of profiles.slice(0, 50)) { // Process 50 profiles each iteration
        const normalizedSkills = normalizeSkills(profile.candidateSkills);
        const scoringResult = calculateScore(
          profile.candidateExperience,
          normalizedSkills,
          profile.candidateLocation,
          mockOpening.requiredSkills,
          mockOpening.experienceMin,
          mockOpening.experienceMax,
          mockOpening.location,
          mockOpening.locationType
        );
        getDecision(scoringResult.finalScore);
      }
      
      iterationTimes.push(performance.now() - iterStart);
    }
    
    // Performance should not degrade significantly across iterations
    const firstIteration = iterationTimes[0];
    const lastIteration = iterationTimes[iterations - 1];
    
    // Allow 200% variance for JIT warmup effects and system variance
    expect(lastIteration).toBeLessThan(firstIteration * 3);
  });
});

describe("Performance: Skill Normalization", () => {
  it("should normalize 1000 skill sets quickly", () => {
    const skillSets = Array.from({ length: 1000 }, () => generateRandomSkills(10));
    
    const start = performance.now();
    for (const skills of skillSets) {
      normalizeSkills(skills);
    }
    const duration = performance.now() - start;
    
    console.log(`Normalized 1000 skill sets in ${duration.toFixed(2)}ms`);
    expect(duration).toBeLessThan(100); // Should complete in < 100ms
  });
});

describe("Performance: Sanitization", () => {
  it("should sanitize 100 resume texts quickly", () => {
    const resumeTexts = Array.from({ length: 100 }, () => generateMockResumeText());
    
    const start = performance.now();
    for (const text of resumeTexts) {
      sanitizeForLLM(text);
    }
    const duration = performance.now() - start;
    
    console.log(`Sanitized 100 resume texts in ${duration.toFixed(2)}ms`);
    expect(duration).toBeLessThan(50); // Should complete in < 50ms
  });

  it("should handle large resume text efficiently", () => {
    // Generate a large resume (50KB)
    const largeResume = generateMockResumeText().repeat(100);
    
    const start = performance.now();
    const sanitized = sanitizeForLLM(largeResume);
    const duration = performance.now() - start;
    
    console.log(`Sanitized ${largeResume.length} bytes in ${duration.toFixed(2)}ms`);
    expect(duration).toBeLessThan(20); // Should complete quickly
    // Sanitized text should have reasonable length (may truncate if over limit)
    expect(sanitized.length).toBeGreaterThan(0);
    expect(sanitized.length).toBeLessThanOrEqual(50100); // Max 50k + truncation message
  });
});

describe("Performance: Schema Validation", () => {
  it("should validate 1000 scoring results quickly", () => {
    const results = Array.from({ length: 1000 }, () => ({
      skillMatchScore: Math.random(),
      experienceMatchScore: Math.random(),
      locationMatchScore: Math.random(),
      finalScore: Math.random(),
    }));
    
    const start = performance.now();
    for (const result of results) {
      validateScoringResult(result);
    }
    const duration = performance.now() - start;
    
    console.log(`Validated 1000 scoring results in ${duration.toFixed(2)}ms`);
    expect(duration).toBeLessThan(50); // Should complete in < 50ms
  });
});

describe("Performance: Scoring Engine", () => {
  it("should calculate 1000 scores quickly", () => {
    const profiles = generateMockProfiles(1000);
    
    const start = performance.now();
    for (const profile of profiles) {
      calculateScore(
        profile.candidateExperience,
        profile.candidateSkills,
        profile.candidateLocation,
        mockOpening.requiredSkills,
        mockOpening.experienceMin,
        mockOpening.experienceMax,
        mockOpening.location,
        mockOpening.locationType
      );
    }
    const duration = performance.now() - start;
    
    console.log(`Calculated 1000 scores in ${duration.toFixed(2)}ms`);
    expect(duration).toBeLessThan(100); // Should complete in < 100ms
  });
});
