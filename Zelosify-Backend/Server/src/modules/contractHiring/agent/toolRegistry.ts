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
  description: `Parse a candidate's resume file (PDF or PPTX) and extract structured information.

MUST be called FIRST before any other tools.

Returns:
- experienceYears: Total years of professional experience (number)
- skills: Array of technical skills found in the resume
- location: Candidate's location or "Unknown"
- education: Array of degrees/certifications
- keywords: Action verbs and impact indicators

Example output:
{
  "experienceYears": 5,
  "skills": ["JavaScript", "React", "Node.js", "AWS"],
  "location": "San Francisco",
  "education": ["Bachelor of Science", "Stanford"],
  "keywords": ["developed", "led", "scalable"]
}`,
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
  description: `Extract a feature vector from parsed resume data for matching against opening requirements.

This is an OPTIONAL tool - you can skip directly to calculate_score if you have the data from parse_resume.

Use this when you need to prepare or validate the feature data before scoring.`,
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
  description: `Normalize a list of skills to standard forms for accurate matching.

Call this AFTER parse_resume with the skills array from the parsed data.

Normalization examples:
- "JS" → "JavaScript"
- "React.js" → "React"
- "node" → "Node.js"
- "k8s" → "Kubernetes"
- "TS" → "TypeScript"
- "postgres" → "PostgreSQL"

This ensures consistent skill comparison between candidate and job requirements.`,
  parameters: {
    type: "object",
    properties: {
      skills: {
        type: "array",
        description: "List of raw skills to normalize (from parse_resume output)",
        items: { type: "string" },
      },
    },
    required: ["skills"],
  },
};

export const SCORING_ENGINE_TOOL: ToolDefinition = {
  name: "calculate_score",
  description: `Calculate the final recommendation score using the DETERMINISTIC scoring formula.

**CRITICAL:** This tool MUST be called to get the official score. DO NOT calculate scores manually.

Formula: FinalScore = (0.5 × skillMatchScore) + (0.3 × experienceMatchScore) + (0.2 × locationMatchScore)

Decision thresholds:
- ≥ 0.75: RECOMMENDED
- 0.50 - 0.74: BORDERLINE  
- < 0.50: NOT_RECOMMENDED

Required parameters (get these from parse_resume and normalize_skills):
- candidateExperience: Number of years from resume
- candidateSkills: Normalized skills array
- candidateLocation: Location from resume (or "Unknown")
- requiredSkills: Skills required by the job opening
- experienceMin: Minimum required years
- experienceMax: Maximum required years (can be null)
- openingLocation: Job location
- locationType: "REMOTE" or "ONSITE"

Returns:
{
  "skillMatchScore": 0.8,
  "experienceMatchScore": 1.0,
  "locationMatchScore": 1.0,
  "finalScore": 0.82,
  "decision": "RECOMMENDED",
  "explanation": "Strong skill match (80%), experience within range, location compatible."
}`,
  parameters: {
    type: "object",
    properties: {
      candidateExperience: {
        type: "number",
        description: "Candidate's years of experience (from parse_resume.experienceYears)",
      },
      candidateSkills: {
        type: "array",
        description: "Candidate's NORMALIZED skills (from normalize_skills output)",
        items: { type: "string" },
      },
      candidateLocation: {
        type: "string",
        description: "Candidate's location (from parse_resume.location)",
      },
      requiredSkills: {
        type: "array",
        description: "Required skills from the job opening",
        items: { type: "string" },
      },
      experienceMin: {
        type: "number",
        description: "Minimum required years of experience from job opening",
      },
      experienceMax: {
        type: "number",
        description: "Maximum required years of experience (null if no upper limit)",
      },
      openingLocation: {
        type: "string",
        description: "Job opening location",
      },
      locationType: {
        type: "string",
        description: "Whether the job is REMOTE or ONSITE",
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
