/**
 * Resume Parser Tool
 * 
 * Parses PDF and PPTX resume files from S3 and extracts structured data.
 * This is a callable tool in the agent flow.
 */

import type { ParsedResume } from "../types.js";
import { sanitizeForLLM } from "./sanitizer.js";

// PDF parsing - using pdf-parse compatible approach
// PPTX parsing - basic text extraction

/**
 * Parse a resume file and extract structured data
 */
export async function parseResume(
  fileBuffer: Buffer,
  fileName: string
): Promise<ParsedResume> {
  const extension = fileName.toLowerCase().split(".").pop();
  
  let rawText: string;
  
  if (extension === "pdf") {
    rawText = await parsePDF(fileBuffer);
  } else if (extension === "pptx") {
    rawText = await parsePPTX(fileBuffer);
  } else {
    throw new Error(`Unsupported file type: ${extension}`);
  }

  // Sanitize text for LLM usage (prompt injection mitigation)
  const sanitizedText = sanitizeForLLM(rawText);
  
  // Extract structured data from text
  return extractStructuredData(sanitizedText);
}

/**
 * Parse PDF file to text
 */
async function parsePDF(buffer: Buffer): Promise<string> {
  try {
    // Dynamic import to handle ESM/CJS compatibility
    const pdfParse = await import("pdf-parse/lib/pdf-parse.js");
    const data = await pdfParse.default(buffer);
    return data.text || "";
  } catch (error) {
    console.error("PDF parsing error:", error);
    // Return empty string on parse failure - agent will handle missing data
    return "";
  }
}

/**
 * Parse PPTX file to text
 * Basic implementation that extracts text from slides
 */
async function parsePPTX(buffer: Buffer): Promise<string> {
  try {
    // PPTX is a ZIP file containing XML
    const JSZip = (await import("jszip")).default;
    const zip = await JSZip.loadAsync(buffer);
    
    const slideTexts: string[] = [];
    
    // Extract text from slide XML files
    const slideFiles = Object.keys(zip.files).filter(
      (name) => name.startsWith("ppt/slides/slide") && name.endsWith(".xml")
    );
    
    for (const slideFile of slideFiles) {
      const content = await zip.files[slideFile].async("string");
      // Extract text between <a:t> tags (PowerPoint text elements)
      const textMatches = content.match(/<a:t>([^<]*)<\/a:t>/g) || [];
      const texts = textMatches.map((match) =>
        match.replace(/<\/?a:t>/g, "").trim()
      );
      slideTexts.push(texts.join(" "));
    }
    
    return slideTexts.join("\n");
  } catch (error) {
    console.error("PPTX parsing error:", error);
    return "";
  }
}

/**
 * Extract structured data from resume text using pattern matching
 */
function extractStructuredData(text: string): ParsedResume {
  const lowerText = text.toLowerCase();
  
  return {
    experienceYears: extractExperienceYears(text),
    skills: extractSkills(text),
    normalizedSkills: [], // Will be filled by skill normalizer tool
    location: extractLocation(text),
    education: extractEducation(text),
    keywords: extractKeywords(text),
    rawTextLength: text.length,
  };
}

/**
 * Extract years of experience from text
 */
function extractExperienceYears(text: string): number {
  // Common patterns for experience
  const patterns = [
    /(\d+)\+?\s*years?\s*(?:of\s+)?experience/i,
    /experience[:\s]+(\d+)\+?\s*years?/i,
    /(\d+)\+?\s*years?\s*(?:in|of|working)/i,
    /worked\s+(?:for\s+)?(\d+)\+?\s*years?/i,
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return parseInt(match[1], 10);
    }
  }
  
  // Fallback: count job entries with dates to estimate
  const dateRanges = text.match(/\b(19|20)\d{2}\s*[-–]\s*(19|20)?\d{2,4}|\b(19|20)\d{2}\s*[-–]\s*present/gi) || [];
  if (dateRanges.length > 0) {
    // Rough estimate based on date ranges found
    return Math.min(dateRanges.length * 2, 15);
  }
  
  return 0;
}

/**
 * Extract skills from text
 */
function extractSkills(text: string): string[] {
  const commonSkills = [
    "JavaScript", "TypeScript", "Python", "Java", "C++", "C#", "Go", "Rust",
    "React", "Angular", "Vue", "Node.js", "Express", "Next.js", "Django", "Flask",
    "AWS", "Azure", "GCP", "Docker", "Kubernetes", "Terraform",
    "SQL", "PostgreSQL", "MySQL", "MongoDB", "Redis", "Elasticsearch",
    "Git", "CI/CD", "Jenkins", "GitHub Actions",
    "REST", "GraphQL", "gRPC", "Microservices",
    "Machine Learning", "AI", "Data Science", "Deep Learning",
    "Agile", "Scrum", "Project Management",
    "HTML", "CSS", "SASS", "Tailwind",
    "Linux", "Unix", "Shell Scripting",
  ];
  
  const foundSkills: string[] = [];
  const lowerText = text.toLowerCase();
  
  for (const skill of commonSkills) {
    if (lowerText.includes(skill.toLowerCase())) {
      foundSkills.push(skill);
    }
  }
  
  // Also look for skills section
  const skillsSectionMatch = text.match(/skills?[:\s]+([^\n]+)/i);
  if (skillsSectionMatch) {
    const skillLine = skillsSectionMatch[1];
    const additionalSkills = skillLine
      .split(/[,;|•·]/g)
      .map((s) => s.trim())
      .filter((s) => s.length > 1 && s.length < 30);
    foundSkills.push(...additionalSkills);
  }
  
  // Deduplicate
  return [...new Set(foundSkills)];
}

/**
 * Extract location from text
 */
function extractLocation(text: string): string {
  // Common location patterns
  const patterns = [
    /location[:\s]+([^,\n]+)/i,
    /based\s+in\s+([^,\n]+)/i,
    /(?:residing|located)\s+(?:in|at)\s+([^,\n]+)/i,
    /address[:\s]+([^,\n]+)/i,
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return match[1].trim();
    }
  }
  
  // Look for city names
  const cities = [
    "New York", "San Francisco", "Los Angeles", "Chicago", "Seattle",
    "Austin", "Boston", "Denver", "Atlanta", "Miami",
    "London", "Berlin", "Paris", "Tokyo", "Singapore",
    "Remote", "Gotham City",
  ];
  
  for (const city of cities) {
    if (text.toLowerCase().includes(city.toLowerCase())) {
      return city;
    }
  }
  
  return "Unknown";
}

/**
 * Extract education from text
 */
function extractEducation(text: string): string[] {
  const education: string[] = [];
  
  const degreePatterns = [
    /\b(B\.?S\.?|Bachelor'?s?)\s+(?:of\s+)?(?:Science|Arts|Engineering)\b/gi,
    /\b(M\.?S\.?|Master'?s?)\s+(?:of\s+)?(?:Science|Arts|Engineering|Business)\b/gi,
    /\b(Ph\.?D\.?|Doctorate)\b/gi,
    /\b(MBA)\b/gi,
    /\b(B\.?Tech|M\.?Tech)\b/gi,
  ];
  
  for (const pattern of degreePatterns) {
    const matches = text.match(pattern);
    if (matches) {
      education.push(...matches);
    }
  }
  
  return [...new Set(education)];
}

/**
 * Extract keywords from text
 */
function extractKeywords(text: string): string[] {
  // Common action verbs and technical terms
  const keywordPatterns = [
    /\b(developed|built|designed|implemented|architected|led|managed)\b/gi,
    /\b(scalable|distributed|real-time|high-performance|production)\b/gi,
    /\b(startup|enterprise|Fortune\s*500)\b/gi,
  ];
  
  const keywords: string[] = [];
  
  for (const pattern of keywordPatterns) {
    const matches = text.match(pattern);
    if (matches) {
      keywords.push(...matches.map((m) => m.toLowerCase()));
    }
  }
  
  return [...new Set(keywords)];
}
