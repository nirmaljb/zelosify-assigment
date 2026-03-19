/**
 * Tool Registry
 * 
 * Defines all tools available to the AI agent for recommendation processing.
 * Tools are invoked dynamically by the LLM based on the task at hand.
 */

import type { ToolDefinition } from "./types.js";

// ============================================================================
// Tool Definitions for LLM
// ============================================================================

export const RESUME_PARSER_TOOL: ToolDefinition = {
  name: "parse_resume",
  description: "Parse a candidate resume file (PDF or PPTX) and extract structured information including experience, skills, education, and location. Call this tool when you need to analyze a candidate's resume.",
  parameters: {
    type: "object",
    properties: {
      profileId: {
        type: "number",
        description: "The profile ID to parse the resume for",
      },
      s3Key: {
        type: "string",
        description: "The S3 key where the resume file is stored",
      },
    },
    required: ["profileId", "s3Key"],
  },
};

export const FEATURE_EXTRACTOR_TOOL: ToolDefinition = {
  name: "extract_features",
  description: "Extract a feature vector from parsed resume data for matching against opening requirements. Call this after parsing the resume to prepare for scoring.",
  parameters: {
    type: "object",
    properties: {
      experienceYears: {
        type: "number",
        description: "Years of experience extracted from resume",
      },
      skills: {
        type: "array",
        description: "List of skills from resume",
        items: { type: "string" },
      },
      location: {
        type: "string",
        description: "Candidate location from resume",
      },
      openingRequirements: {
        type: "object",
        description: "The opening requirements to match against",
      },
    },
    required: ["experienceYears", "skills", "location", "openingRequirements"],
  },
};

export const SKILL_NORMALIZER_TOOL: ToolDefinition = {
  name: "normalize_skills",
  description: "Normalize a list of skills to standard forms for accurate matching. For example, 'JS' becomes 'JavaScript', 'React.js' becomes 'React'. Call this to ensure consistent skill comparison.",
  parameters: {
    type: "object",
    properties: {
      skills: {
        type: "array",
        description: "List of raw skills to normalize",
        items: { type: "string" },
      },
    },
    required: ["skills"],
  },
};

export const SCORING_ENGINE_TOOL: ToolDefinition = {
  name: "calculate_score",
  description: "Calculate the final recommendation score using the deterministic scoring formula. This tool MUST be called to get the official score - do not calculate scores manually. Returns skillMatchScore, experienceMatchScore, locationMatchScore, and finalScore.",
  parameters: {
    type: "object",
    properties: {
      candidateExperience: {
        type: "number",
        description: "Candidate's years of experience",
      },
      candidateSkills: {
        type: "array",
        description: "Candidate's normalized skills",
        items: { type: "string" },
      },
      candidateLocation: {
        type: "string",
        description: "Candidate's location",
      },
      requiredSkills: {
        type: "array",
        description: "Required skills for the opening",
        items: { type: "string" },
      },
      experienceMin: {
        type: "number",
        description: "Minimum required experience",
      },
      experienceMax: {
        type: "number",
        description: "Maximum required experience (null if no max)",
      },
      openingLocation: {
        type: "string",
        description: "Opening location",
      },
      locationType: {
        type: "string",
        description: "REMOTE or ONSITE",
        enum: ["REMOTE", "ONSITE"],
      },
    },
    required: [
      "candidateExperience",
      "candidateSkills",
      "candidateLocation",
      "requiredSkills",
      "experienceMin",
      "openingLocation",
      "locationType",
    ],
  },
};

/**
 * All available tools for the agent
 */
export const ALL_TOOLS: ToolDefinition[] = [
  RESUME_PARSER_TOOL,
  FEATURE_EXTRACTOR_TOOL,
  SKILL_NORMALIZER_TOOL,
  SCORING_ENGINE_TOOL,
];

/**
 * Get tool definition by name
 */
export function getToolDefinition(name: string): ToolDefinition | undefined {
  return ALL_TOOLS.find((tool) => tool.name === name);
}
