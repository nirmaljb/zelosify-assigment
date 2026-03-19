/**
 * @fileoverview Unit tests for Skill Normalizer Tool
 * Tests skill normalization mappings and overlap calculations
 */

import { describe, it, expect } from "vitest";
import {
  normalizeSkill,
  normalizeSkills,
  skillsMatch,
  calculateSkillOverlap,
} from "../../../../../src/modules/contractHiring/agent/tools/skillNormalizer.js";

// ============================================================================
// Single Skill Normalization Tests
// ============================================================================

describe("normalizeSkill", () => {
  describe("JavaScript variations", () => {
    it("should normalize 'js' to 'JavaScript'", () => {
      expect(normalizeSkill("js")).toBe("JavaScript");
    });

    it("should normalize 'javascript' to 'JavaScript'", () => {
      expect(normalizeSkill("javascript")).toBe("JavaScript");
    });

    it("should normalize 'ecmascript' to 'JavaScript'", () => {
      expect(normalizeSkill("ecmascript")).toBe("JavaScript");
    });

    it("should normalize 'es6' to 'JavaScript'", () => {
      expect(normalizeSkill("es6")).toBe("JavaScript");
    });
  });

  describe("TypeScript variations", () => {
    it("should normalize 'ts' to 'TypeScript'", () => {
      expect(normalizeSkill("ts")).toBe("TypeScript");
    });

    it("should normalize 'typescript' to 'TypeScript'", () => {
      expect(normalizeSkill("typescript")).toBe("TypeScript");
    });
  });

  describe("Framework variations", () => {
    it("should normalize React variations", () => {
      expect(normalizeSkill("react")).toBe("React");
      expect(normalizeSkill("react.js")).toBe("React");
      expect(normalizeSkill("reactjs")).toBe("React");
    });

    it("should normalize Node.js variations", () => {
      expect(normalizeSkill("node")).toBe("Node.js");
      expect(normalizeSkill("node.js")).toBe("Node.js");
      expect(normalizeSkill("nodejs")).toBe("Node.js");
    });

    it("should normalize Vue variations", () => {
      expect(normalizeSkill("vue")).toBe("Vue");
      expect(normalizeSkill("vue.js")).toBe("Vue");
      expect(normalizeSkill("vuejs")).toBe("Vue");
    });

    it("should normalize Next.js variations", () => {
      expect(normalizeSkill("next")).toBe("Next.js");
      expect(normalizeSkill("next.js")).toBe("Next.js");
      expect(normalizeSkill("nextjs")).toBe("Next.js");
    });
  });

  describe("Database variations", () => {
    it("should normalize PostgreSQL variations", () => {
      expect(normalizeSkill("postgres")).toBe("PostgreSQL");
      expect(normalizeSkill("postgresql")).toBe("PostgreSQL");
      expect(normalizeSkill("pg")).toBe("PostgreSQL");
    });

    it("should normalize MongoDB variations", () => {
      expect(normalizeSkill("mongo")).toBe("MongoDB");
      expect(normalizeSkill("mongodb")).toBe("MongoDB");
    });
  });

  describe("Cloud variations", () => {
    it("should normalize AWS variations", () => {
      expect(normalizeSkill("aws")).toBe("AWS");
      expect(normalizeSkill("amazon web services")).toBe("AWS");
    });

    it("should normalize GCP variations", () => {
      expect(normalizeSkill("gcp")).toBe("GCP");
      expect(normalizeSkill("google cloud")).toBe("GCP");
      expect(normalizeSkill("google cloud platform")).toBe("GCP");
    });
  });

  describe("DevOps variations", () => {
    it("should normalize Kubernetes variations", () => {
      expect(normalizeSkill("k8s")).toBe("Kubernetes");
      expect(normalizeSkill("kubernetes")).toBe("Kubernetes");
    });

    it("should normalize CI/CD variations", () => {
      expect(normalizeSkill("ci/cd")).toBe("CI/CD");
      expect(normalizeSkill("cicd")).toBe("CI/CD");
      expect(normalizeSkill("continuous integration")).toBe("CI/CD");
    });
  });

  describe("Language variations", () => {
    it("should normalize Python variations", () => {
      expect(normalizeSkill("python")).toBe("Python");
      expect(normalizeSkill("python3")).toBe("Python");
      expect(normalizeSkill("py")).toBe("Python");
    });

    it("should normalize Go variations", () => {
      expect(normalizeSkill("go")).toBe("Go");
      expect(normalizeSkill("golang")).toBe("Go");
    });

    it("should normalize C++ variations", () => {
      expect(normalizeSkill("c++")).toBe("C++");
      expect(normalizeSkill("cpp")).toBe("C++");
    });

    it("should normalize C# variations", () => {
      expect(normalizeSkill("c#")).toBe("C#");
      expect(normalizeSkill("csharp")).toBe("C#");
    });
  });

  describe("ML/AI variations", () => {
    it("should normalize Machine Learning variations", () => {
      expect(normalizeSkill("ml")).toBe("Machine Learning");
      expect(normalizeSkill("machine learning")).toBe("Machine Learning");
    });

    it("should normalize AI variations", () => {
      expect(normalizeSkill("ai")).toBe("AI");
      expect(normalizeSkill("artificial intelligence")).toBe("AI");
    });
  });

  describe("edge cases", () => {
    it("should preserve unknown skills", () => {
      expect(normalizeSkill("CustomFramework")).toBe("CustomFramework");
      expect(normalizeSkill("proprietary-tool")).toBe("proprietary-tool");
    });

    it("should trim whitespace", () => {
      expect(normalizeSkill("  JavaScript  ")).toBe("JavaScript");
      expect(normalizeSkill("  python  ")).toBe("Python");
    });

    it("should be case-insensitive for lookups", () => {
      expect(normalizeSkill("JAVASCRIPT")).toBe("JavaScript");
      expect(normalizeSkill("Python")).toBe("Python");
      expect(normalizeSkill("AWS")).toBe("AWS");
    });
  });
});

// ============================================================================
// Array Normalization Tests
// ============================================================================

describe("normalizeSkills", () => {
  it("should normalize an array of skills", () => {
    const skills = ["js", "ts", "react", "node"];
    const normalized = normalizeSkills(skills);
    expect(normalized).toEqual(["JavaScript", "TypeScript", "React", "Node.js"]);
  });

  it("should remove duplicates after normalization", () => {
    const skills = ["js", "javascript", "JavaScript", "JAVASCRIPT"];
    const normalized = normalizeSkills(skills);
    expect(normalized).toEqual(["JavaScript"]);
  });

  it("should handle empty array", () => {
    expect(normalizeSkills([])).toEqual([]);
  });

  it("should handle mixed known and unknown skills", () => {
    const skills = ["js", "CustomTool", "react", "ProprietaryLib"];
    const normalized = normalizeSkills(skills);
    expect(normalized).toContain("JavaScript");
    expect(normalized).toContain("React");
    expect(normalized).toContain("CustomTool");
    expect(normalized).toContain("ProprietaryLib");
  });
});

// ============================================================================
// Skills Match Tests
// ============================================================================

describe("skillsMatch", () => {
  it("should return true for identical skills", () => {
    expect(skillsMatch("JavaScript", "JavaScript")).toBe(true);
  });

  it("should return true for normalized equivalent skills", () => {
    expect(skillsMatch("js", "JavaScript")).toBe(true);
    expect(skillsMatch("ts", "TypeScript")).toBe(true);
    expect(skillsMatch("k8s", "Kubernetes")).toBe(true);
  });

  it("should return false for different skills", () => {
    expect(skillsMatch("JavaScript", "Python")).toBe(false);
    expect(skillsMatch("React", "Vue")).toBe(false);
  });

  it("should handle case differences in mappings", () => {
    expect(skillsMatch("JS", "javascript")).toBe(true);
    expect(skillsMatch("REACT", "react.js")).toBe(true);
  });
});

// ============================================================================
// Skill Overlap Tests
// ============================================================================

describe("calculateSkillOverlap", () => {
  describe("full overlap", () => {
    it("should return 1 overlap when all required skills are present", () => {
      const result = calculateSkillOverlap(
        ["JavaScript", "React", "Node.js", "PostgreSQL"],
        ["JavaScript", "React"]
      );
      expect(result.overlap).toBe(1);
      expect(result.matchedSkills).toContain("JavaScript");
      expect(result.matchedSkills).toContain("React");
      expect(result.missingSkills).toEqual([]);
    });
  });

  describe("partial overlap", () => {
    it("should return 0.5 overlap when half skills match", () => {
      const result = calculateSkillOverlap(
        ["JavaScript", "Rust"],
        ["JavaScript", "Python"]
      );
      expect(result.overlap).toBe(0.5);
      expect(result.matchedSkills).toContain("JavaScript");
      expect(result.missingSkills).toContain("Python");
    });

    it("should return 0.6 overlap for 3 of 5 skills", () => {
      const result = calculateSkillOverlap(
        ["JavaScript", "React", "Node.js"],
        ["JavaScript", "React", "Node.js", "Python", "Docker"]
      );
      expect(result.overlap).toBe(0.6);
      expect(result.matchedSkills.length).toBe(3);
      expect(result.missingSkills.length).toBe(2);
    });
  });

  describe("no overlap", () => {
    it("should return 0 overlap when no skills match", () => {
      const result = calculateSkillOverlap(
        ["Rust", "Go", "Haskell"],
        ["JavaScript", "Python", "Java"]
      );
      expect(result.overlap).toBe(0);
      expect(result.matchedSkills).toEqual([]);
      expect(result.missingSkills.length).toBe(3);
    });
  });

  describe("with normalization", () => {
    it("should match normalized skills", () => {
      const result = calculateSkillOverlap(
        ["js", "node", "pg"],
        ["JavaScript", "Node.js", "PostgreSQL"]
      );
      expect(result.overlap).toBe(1);
      expect(result.matchedSkills.length).toBe(3);
    });

    it("should handle mixed normalizations", () => {
      const result = calculateSkillOverlap(
        ["ts", "react.js", "k8s"],
        ["TypeScript", "React", "Docker"]
      );
      expect(result.overlap).toBeCloseTo(0.67, 1);
      expect(result.matchedSkills).toContain("TypeScript");
      expect(result.matchedSkills).toContain("React");
      expect(result.missingSkills).toContain("Docker");
    });
  });

  describe("edge cases", () => {
    it("should return 0 overlap for empty required skills", () => {
      const result = calculateSkillOverlap(["JavaScript"], []);
      expect(result.overlap).toBe(0);
    });

    it("should return 0 overlap for empty candidate skills", () => {
      const result = calculateSkillOverlap([], ["JavaScript"]);
      expect(result.overlap).toBe(0);
      expect(result.missingSkills).toContain("JavaScript");
    });
  });
});
