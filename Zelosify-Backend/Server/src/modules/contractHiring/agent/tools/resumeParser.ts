/**
 * Resume Parser Tool
 * 
 * Parses PDF and PPTX resume files from S3 and extracts structured data.
 * This is a callable tool in the agent flow.
 * 
 * Includes prompt injection validation per spec requirements.
 */

import type { ParsedResume, InjectionValidationResult } from "../types.js";
import { sanitizeForLLM, validateAndSanitize, PromptInjectionValidator } from "./sanitizer.js";

// PDF parsing - using pdf-parse compatible approach
// PPTX parsing - basic text extraction

/**
 * Extended parsed resume with injection validation metadata
 */
export interface ParsedResumeWithValidation extends ParsedResume {
  injectionValidation: {
    safe: boolean;
    flagsCount: number;
    highestSeverity: string | null;
    flagsByCategory: Record<string, number>;
  };
}

/**
 * Parse a resume file and extract structured data
 * Includes prompt injection validation and logging
 */
export async function parseResume(
  fileBuffer: Buffer,
  fileName: string
): Promise<ParsedResumeWithValidation> {
  const extension = fileName.toLowerCase().split(".").pop();
  
  let rawText: string;
  
  if (extension === "pdf") {
    rawText = await parsePDF(fileBuffer);
  } else if (extension === "pptx") {
    rawText = await parsePPTX(fileBuffer);
  } else {
    throw new Error(`Unsupported file type: ${extension}`);
  }

  // Validate for prompt injection attempts BEFORE sanitization
  const validationResult = validateAndSanitize(rawText);
  
  // Log injection validation result (structured JSON per spec)
  logInjectionValidation(fileName, validationResult);
  
  // Use sanitized text for extraction
  const sanitizedText = validationResult.sanitizedText;
  
  // Extract structured data from sanitized text
  const parsed = extractStructuredData(sanitizedText);
  
  // Return with validation metadata
  return {
    ...parsed,
    injectionValidation: {
      safe: validationResult.safe,
      flagsCount: validationResult.totalFlagsCount,
      highestSeverity: validationResult.highestSeverity,
      flagsByCategory: validationResult.flagsByCategory as Record<string, number>,
    },
  };
}

/**
 * Log injection validation result in structured JSON format
 */
function logInjectionValidation(fileName: string, result: InjectionValidationResult): void {
  const logEntry = {
    timestamp: new Date().toISOString(),
    event: "injection_validation",
    fileName,
    safe: result.safe,
    totalFlags: result.totalFlagsCount,
    highestSeverity: result.highestSeverity,
    flagsBySeverity: result.flagsBySeverity,
    flagsByCategory: result.flagsByCategory,
    originalLength: result.originalLength,
    sanitizedLength: result.sanitizedLength,
    // Include detailed flags for HIGH/CRITICAL only (for security review)
    criticalFlags: result.flags
      .filter(f => f.severity === "CRITICAL" || f.severity === "HIGH")
      .map(f => ({
        category: f.category,
        severity: f.severity,
        description: f.description,
        position: f.position,
        // Don't log matched text for security (could contain sensitive data)
      })),
  };
  
  // Always log injection validation for auditing
  console.log(JSON.stringify(logEntry));
  
  // Additional warning log for unsafe content
  if (!result.safe) {
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      event: "injection_warning",
      level: "WARN",
      fileName,
      message: `Potential prompt injection detected (severity: ${result.highestSeverity})`,
      flagCount: result.totalFlagsCount,
    }));
  }
}

/**
 * Parse PDF file to text
 */
async function parsePDF(buffer: Buffer): Promise<string> {
  try {
    // Import from lib path to avoid test file loading bug in pdf-parse index.js
    const pdfParse = (await import("pdf-parse/lib/pdf-parse.js")).default;
    const data = await pdfParse(buffer);
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
  // Primary patterns - explicit years of experience statements
  const primaryPatterns = [
    /(\d+)\+?\s*years?\s*(?:of\s+)?(?:professional\s+)?experience/i,
    /(\d+)\+?\s*years?\s*(?:of\s+)?(?:industry\s+)?experience/i,
    /(\d+)\+?\s*years?\s*(?:of\s+)?(?:hands[- ]?on\s+)?experience/i,
    /experience[:\s]+(\d+)\+?\s*years?/i,
    /(\d+)\+?\s*years?\s*(?:in|of|working|as)/i,
    /worked\s+(?:for\s+)?(\d+)\+?\s*years?/i,
    /over\s+(\d+)\s*years?\s*(?:of\s+)?experience/i,
    /more\s+than\s+(\d+)\s*years?/i,
    /(\d+)\s*\+\s*years/i,  // "5+ years" format
    /approximately\s+(\d+)\s*years?/i,
  ];
  
  for (const pattern of primaryPatterns) {
    const match = text.match(pattern);
    if (match) {
      const years = parseInt(match[1], 10);
      if (years >= 0 && years <= 50) {
        return years;
      }
    }
  }
  
  // Secondary: Calculate from date ranges in work history
  const currentYear = new Date().getFullYear();
  const dateRangePatterns = [
    // "2018 - 2023" or "2018 – Present"
    /\b(19|20)(\d{2})\s*[-–—]\s*(?:(19|20)(\d{2})|present|current|now|ongoing)\b/gi,
    // "Jan 2018 - Dec 2023" format
    /(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s*(19|20)(\d{2})\s*[-–—]\s*(?:(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s*)?(19|20)?(\d{2})|present|current|now/gi,
  ];
  
  let totalYears = 0;
  const processedRanges: string[] = [];
  
  for (const pattern of dateRangePatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const matchStr = match[0].toLowerCase();
      
      // Skip if we've already processed this range
      if (processedRanges.includes(matchStr)) continue;
      processedRanges.push(matchStr);
      
      // Extract start year
      const startYearMatch = matchStr.match(/(19|20)(\d{2})/);
      if (!startYearMatch) continue;
      const startYear = parseInt(startYearMatch[1] + startYearMatch[2], 10);
      
      // Extract end year (or use current year for "present")
      let endYear = currentYear;
      if (!matchStr.includes("present") && !matchStr.includes("current") && !matchStr.includes("now") && !matchStr.includes("ongoing")) {
        const endYearMatches = matchStr.match(/(19|20)(\d{2})/g);
        if (endYearMatches && endYearMatches.length > 1) {
          const lastMatch = endYearMatches[endYearMatches.length - 1];
          endYear = parseInt(lastMatch, 10);
        }
      }
      
      // Calculate years for this range
      const rangeYears = Math.max(0, endYear - startYear);
      if (rangeYears >= 0 && rangeYears <= 30) {
        totalYears += rangeYears;
      }
    }
  }
  
  if (totalYears > 0) {
    return Math.min(totalYears, 40); // Cap at 40 years
  }
  
  // Tertiary: Count job entries as rough estimate
  const jobIndicators = text.match(/(?:software\s+engineer|developer|programmer|architect|lead|manager|analyst|consultant|specialist)/gi) || [];
  if (jobIndicators.length >= 3) {
    return Math.min(jobIndicators.length * 2, 10);
  }
  
  return 0;
}

/**
 * Extract skills from text
 */
function extractSkills(text: string): string[] {
  // Comprehensive skill list organized by category
  const skillPatterns: { skill: string; patterns: RegExp[] }[] = [
    // Programming Languages
    { skill: "JavaScript", patterns: [/\bjavascript\b/i, /\bjs\b/i] },
    { skill: "TypeScript", patterns: [/\btypescript\b/i, /\bts\b/i] },
    { skill: "Python", patterns: [/\bpython\b/i, /\bpy\b/i] },
    { skill: "Java", patterns: [/\bjava\b(?!\s*script)/i] },
    { skill: "C++", patterns: [/\bc\+\+\b/i, /\bcpp\b/i] },
    { skill: "C#", patterns: [/\bc#\b/i, /\bcsharp\b/i, /\bc\s*sharp\b/i] },
    { skill: "Go", patterns: [/\bgolang\b/i, /\bgo\s+(?:programming|language)\b/i, /\bgo\b(?=.*(?:lang|programming|backend))/i] },
    { skill: "Rust", patterns: [/\brust\b(?=.*(?:programming|lang|systems))/i, /\brustlang\b/i] },
    { skill: "Ruby", patterns: [/\bruby\b/i] },
    { skill: "PHP", patterns: [/\bphp\b/i] },
    { skill: "Swift", patterns: [/\bswift\b/i] },
    { skill: "Kotlin", patterns: [/\bkotlin\b/i] },
    { skill: "Scala", patterns: [/\bscala\b/i] },
    { skill: "R", patterns: [/\br\s+(?:programming|language|studio)\b/i] },
    
    // Frontend Frameworks
    { skill: "React", patterns: [/\breact\b/i, /\breact\.?js\b/i, /\breactjs\b/i] },
    { skill: "Angular", patterns: [/\bangular\b/i, /\bangular\.?js\b/i] },
    { skill: "Vue", patterns: [/\bvue\b/i, /\bvue\.?js\b/i, /\bvuejs\b/i] },
    { skill: "Next.js", patterns: [/\bnext\.?js\b/i, /\bnextjs\b/i] },
    { skill: "Svelte", patterns: [/\bsvelte\b/i] },
    { skill: "Redux", patterns: [/\bredux\b/i] },
    { skill: "jQuery", patterns: [/\bjquery\b/i] },
    
    // Backend Frameworks
    { skill: "Node.js", patterns: [/\bnode\.?js\b/i, /\bnodejs\b/i, /\bnode\b/i] },
    { skill: "Express", patterns: [/\bexpress\.?js\b/i, /\bexpress\b/i] },
    { skill: "Django", patterns: [/\bdjango\b/i] },
    { skill: "Flask", patterns: [/\bflask\b/i] },
    { skill: "FastAPI", patterns: [/\bfastapi\b/i] },
    { skill: "Spring", patterns: [/\bspring\s*boot\b/i, /\bspring\s*framework\b/i, /\bspring\b/i] },
    { skill: "Rails", patterns: [/\bruby\s*on\s*rails\b/i, /\brails\b/i] },
    { skill: "Laravel", patterns: [/\blaravel\b/i] },
    { skill: ".NET", patterns: [/\b\.net\b/i, /\bdotnet\b/i, /\basp\.?net\b/i] },
    { skill: "NestJS", patterns: [/\bnest\.?js\b/i, /\bnestjs\b/i] },
    
    // Cloud Platforms
    { skill: "AWS", patterns: [/\baws\b/i, /\bamazon\s*web\s*services\b/i] },
    { skill: "Azure", patterns: [/\bazure\b/i, /\bmicrosoft\s*azure\b/i] },
    { skill: "GCP", patterns: [/\bgcp\b/i, /\bgoogle\s*cloud\b/i] },
    { skill: "Heroku", patterns: [/\bheroku\b/i] },
    { skill: "Vercel", patterns: [/\bvercel\b/i] },
    { skill: "Netlify", patterns: [/\bnetlify\b/i] },
    
    // DevOps & Containers
    { skill: "Docker", patterns: [/\bdocker\b/i] },
    { skill: "Kubernetes", patterns: [/\bkubernetes\b/i, /\bk8s\b/i] },
    { skill: "Terraform", patterns: [/\bterraform\b/i] },
    { skill: "Ansible", patterns: [/\bansible\b/i] },
    { skill: "Jenkins", patterns: [/\bjenkins\b/i] },
    { skill: "GitHub Actions", patterns: [/\bgithub\s*actions\b/i] },
    { skill: "GitLab CI", patterns: [/\bgitlab\s*ci\b/i] },
    { skill: "CircleCI", patterns: [/\bcircleci\b/i] },
    { skill: "CI/CD", patterns: [/\bci\/?cd\b/i, /\bcontinuous\s*integration\b/i, /\bcontinuous\s*deployment\b/i] },
    { skill: "ArgoCD", patterns: [/\bargocd\b/i, /\bargo\s*cd\b/i] },
    
    // Databases
    { skill: "SQL", patterns: [/\bsql\b/i] },
    { skill: "PostgreSQL", patterns: [/\bpostgresql\b/i, /\bpostgres\b/i] },
    { skill: "MySQL", patterns: [/\bmysql\b/i] },
    { skill: "MongoDB", patterns: [/\bmongodb\b/i, /\bmongo\b/i] },
    { skill: "Redis", patterns: [/\bredis\b/i] },
    { skill: "Elasticsearch", patterns: [/\belasticsearch\b/i, /\belastic\s*search\b/i] },
    { skill: "DynamoDB", patterns: [/\bdynamodb\b/i] },
    { skill: "Cassandra", patterns: [/\bcassandra\b/i] },
    { skill: "Oracle", patterns: [/\boracle\s*(?:db|database)?\b/i] },
    { skill: "SQLite", patterns: [/\bsqlite\b/i] },
    { skill: "Firebase", patterns: [/\bfirebase\b/i] },
    { skill: "Supabase", patterns: [/\bsupabase\b/i] },
    
    // APIs & Protocols
    { skill: "REST", patterns: [/\brest\b/i, /\brestful\b/i, /\brest\s*api\b/i] },
    { skill: "GraphQL", patterns: [/\bgraphql\b/i] },
    { skill: "gRPC", patterns: [/\bgrpc\b/i] },
    { skill: "WebSocket", patterns: [/\bwebsocket\b/i, /\bweb\s*socket\b/i] },
    { skill: "Microservices", patterns: [/\bmicroservices?\b/i, /\bmicro\s*services?\b/i] },
    
    // AI/ML
    { skill: "Machine Learning", patterns: [/\bmachine\s*learning\b/i, /\bml\b/i] },
    { skill: "Deep Learning", patterns: [/\bdeep\s*learning\b/i, /\bdl\b(?=.*(?:neural|model|ai))/i] },
    { skill: "TensorFlow", patterns: [/\btensorflow\b/i] },
    { skill: "PyTorch", patterns: [/\bpytorch\b/i] },
    { skill: "AI", patterns: [/\bartificial\s*intelligence\b/i, /\bai\b(?=.*(?:model|agent|system))/i] },
    { skill: "NLP", patterns: [/\bnlp\b/i, /\bnatural\s*language\s*processing\b/i] },
    { skill: "Computer Vision", patterns: [/\bcomputer\s*vision\b/i, /\bcv\b(?=.*(?:model|image|vision))/i] },
    { skill: "Data Science", patterns: [/\bdata\s*science\b/i] },
    { skill: "Pandas", patterns: [/\bpandas\b/i] },
    { skill: "NumPy", patterns: [/\bnumpy\b/i] },
    { skill: "Scikit-learn", patterns: [/\bscikit[- ]?learn\b/i, /\bsklearn\b/i] },
    { skill: "LLM", patterns: [/\bllm\b/i, /\blarge\s*language\s*model\b/i] },
    { skill: "OpenAI", patterns: [/\bopenai\b/i, /\bgpt[-\s]?\d\b/i, /\bchatgpt\b/i] },
    
    // Frontend Technologies
    { skill: "HTML", patterns: [/\bhtml\b/i, /\bhtml5\b/i] },
    { skill: "CSS", patterns: [/\bcss\b/i, /\bcss3\b/i] },
    { skill: "SASS", patterns: [/\bsass\b/i, /\bscss\b/i] },
    { skill: "Tailwind", patterns: [/\btailwind\b/i, /\btailwindcss\b/i] },
    { skill: "Bootstrap", patterns: [/\bbootstrap\b/i] },
    { skill: "Material UI", patterns: [/\bmaterial[- ]?ui\b/i, /\bmui\b/i] },
    
    // Testing
    { skill: "Jest", patterns: [/\bjest\b/i] },
    { skill: "Mocha", patterns: [/\bmocha\b/i] },
    { skill: "Cypress", patterns: [/\bcypress\b/i] },
    { skill: "Selenium", patterns: [/\bselenium\b/i] },
    { skill: "Playwright", patterns: [/\bplaywright\b/i] },
    { skill: "Unit Testing", patterns: [/\bunit\s*test(?:ing|s)?\b/i] },
    { skill: "TDD", patterns: [/\btdd\b/i, /\btest[- ]?driven\s*development\b/i] },
    
    // Tools & Version Control
    { skill: "Git", patterns: [/\bgit\b(?!\s*hub|\s*lab)/i] },
    { skill: "GitHub", patterns: [/\bgithub\b/i] },
    { skill: "GitLab", patterns: [/\bgitlab\b/i] },
    { skill: "Jira", patterns: [/\bjira\b/i] },
    { skill: "Confluence", patterns: [/\bconfluence\b/i] },
    
    // Operating Systems
    { skill: "Linux", patterns: [/\blinux\b/i] },
    { skill: "Unix", patterns: [/\bunix\b/i] },
    { skill: "Shell Scripting", patterns: [/\bshell\s*script(?:ing|s)?\b/i, /\bbash\b/i, /\bsh\s*script\b/i] },
    
    // Methodologies
    { skill: "Agile", patterns: [/\bagile\b/i] },
    { skill: "Scrum", patterns: [/\bscrum\b/i] },
    { skill: "Kanban", patterns: [/\bkanban\b/i] },
    { skill: "Project Management", patterns: [/\bproject\s*management\b/i] },
    
    // Security
    { skill: "Security", patterns: [/\bcybersecurity\b/i, /\bsecurity\s*(?:engineer|analyst|specialist)\b/i] },
    { skill: "OAuth", patterns: [/\boauth\b/i] },
    { skill: "JWT", patterns: [/\bjwt\b/i, /\bjson\s*web\s*token\b/i] },
    
    // Message Queues
    { skill: "Kafka", patterns: [/\bkafka\b/i] },
    { skill: "RabbitMQ", patterns: [/\brabbitmq\b/i] },
    { skill: "SQS", patterns: [/\bsqs\b/i, /\bsimple\s*queue\s*service\b/i] },
    
    // Monitoring
    { skill: "Prometheus", patterns: [/\bprometheus\b/i] },
    { skill: "Grafana", patterns: [/\bgrafana\b/i] },
    { skill: "Datadog", patterns: [/\bdatadog\b/i] },
    { skill: "New Relic", patterns: [/\bnew\s*relic\b/i] },
    
    // Mobile
    { skill: "React Native", patterns: [/\breact\s*native\b/i] },
    { skill: "Flutter", patterns: [/\bflutter\b/i] },
    { skill: "iOS", patterns: [/\bios\s*(?:development|developer|app)\b/i] },
    { skill: "Android", patterns: [/\bandroid\s*(?:development|developer|app)\b/i] },
  ];
  
  const foundSkills = new Set<string>();
  const lowerText = text.toLowerCase();
  
  // Match skills using patterns
  for (const { skill, patterns } of skillPatterns) {
    for (const pattern of patterns) {
      if (pattern.test(text)) {
        foundSkills.add(skill);
        break;
      }
    }
  }
  
  // Also extract from dedicated skills sections
  const skillsSectionPatterns = [
    /(?:technical\s+)?skills?[:\s]*\n?([\s\S]*?)(?:\n\n|\n(?=[A-Z][a-z]+:)|$)/i,
    /technologies?[:\s]*\n?([\s\S]*?)(?:\n\n|\n(?=[A-Z][a-z]+:)|$)/i,
    /tech\s*stack[:\s]*\n?([\s\S]*?)(?:\n\n|\n(?=[A-Z][a-z]+:)|$)/i,
    /proficienc(?:y|ies)[:\s]*\n?([\s\S]*?)(?:\n\n|\n(?=[A-Z][a-z]+:)|$)/i,
    /expertise[:\s]*\n?([\s\S]*?)(?:\n\n|\n(?=[A-Z][a-z]+:)|$)/i,
  ];
  
  for (const pattern of skillsSectionPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const skillLine = match[1];
      const additionalSkills = skillLine
        .split(/[,;|•·\n\r]/g)
        .map((s) => s.trim())
        .filter((s) => s.length > 1 && s.length < 40 && !/^\d+$/.test(s));
      
      for (const s of additionalSkills) {
        // Only add if it looks like a real skill
        if (/^[A-Za-z][A-Za-z0-9.#+\-\s]*$/.test(s)) {
          foundSkills.add(s);
        }
      }
    }
  }
  
  return [...foundSkills];
}

/**
 * Extract location from text
 */
function extractLocation(text: string): string {
  const lowerText = text.toLowerCase();
  
  // First check for explicit remote preference
  if (/\b(?:remote|work\s*from\s*home|wfh|anywhere|distributed)\s*(?:work|position|role|only|preferred)?\b/i.test(text)) {
    return "Remote";
  }
  
  // Common location patterns
  const locationPatterns = [
    /(?:location|based\s+in|located\s+in|residing\s+in|lives?\s+in)[:\s]+([^,\n]+)/i,
    /(?:address|city)[:\s]+([^,\n]+)/i,
    /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?),\s*([A-Z]{2})\b/,  // "City, ST" format
    /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?),\s*([A-Z][a-z]+)\b/,  // "City, Country" format
  ];
  
  for (const pattern of locationPatterns) {
    const match = text.match(pattern);
    if (match) {
      const location = match[1].trim();
      // Make sure it's not a job title or common word
      const skipWords = ["senior", "junior", "lead", "principal", "staff", "engineer", "developer", "manager"];
      if (!skipWords.some(w => location.toLowerCase().includes(w))) {
        return location;
      }
    }
  }
  
  // Comprehensive list of cities and regions
  const locations = [
    // US Cities
    "New York", "NYC", "Manhattan", "Brooklyn",
    "San Francisco", "SF", "Bay Area", "Silicon Valley",
    "Los Angeles", "LA",
    "Chicago",
    "Seattle",
    "Austin",
    "Boston",
    "Denver", "Boulder",
    "Atlanta",
    "Miami",
    "Dallas", "Houston",
    "Portland",
    "San Diego",
    "Phoenix",
    "Philadelphia",
    "Washington DC", "DC",
    "Minneapolis",
    "Detroit",
    "Nashville",
    "Salt Lake City",
    "Raleigh", "Durham", "Research Triangle",
    
    // US States
    "California", "Texas", "New York State", "Florida", "Washington", "Colorado", "Massachusetts",
    
    // Canada
    "Toronto", "Vancouver", "Montreal", "Ottawa", "Calgary",
    
    // UK
    "London", "Manchester", "Edinburgh", "Birmingham", "Bristol", "Cambridge", "Oxford",
    
    // Europe
    "Berlin", "Munich", "Hamburg", "Frankfurt",
    "Paris", "Lyon",
    "Amsterdam", "Rotterdam",
    "Dublin",
    "Stockholm", "Gothenburg",
    "Copenhagen",
    "Oslo",
    "Helsinki",
    "Zurich", "Geneva",
    "Vienna",
    "Barcelona", "Madrid",
    "Lisbon",
    "Milan", "Rome",
    "Prague",
    "Warsaw", "Krakow",
    "Budapest",
    
    // Asia
    "Singapore",
    "Tokyo", "Osaka",
    "Seoul",
    "Hong Kong",
    "Shanghai", "Beijing", "Shenzhen", "Hangzhou",
    "Taipei",
    "Bangalore", "Bengaluru", "Mumbai", "Delhi", "Hyderabad", "Chennai", "Pune",
    "Tel Aviv",
    "Dubai", "Abu Dhabi",
    
    // Australia/NZ
    "Sydney", "Melbourne", "Brisbane", "Perth",
    "Auckland", "Wellington",
    
    // South America
    "São Paulo", "Rio de Janeiro",
    "Buenos Aires",
    "Mexico City", "Monterrey", "Guadalajara",
    "Bogotá",
    "Santiago",
    
    // Fictional (for test data)
    "Gotham City", "Gotham", "Metropolis",
  ];
  
  // Case-insensitive search
  for (const location of locations) {
    const regex = new RegExp(`\\b${location.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    if (regex.test(text)) {
      return location;
    }
  }
  
  // Check for country names as last resort
  const countries = ["USA", "United States", "UK", "United Kingdom", "Canada", "Germany", "India", "Australia"];
  for (const country of countries) {
    if (lowerText.includes(country.toLowerCase())) {
      return country;
    }
  }
  
  return "Unknown";
}

/**
 * Extract education from text
 */
function extractEducation(text: string): string[] {
  const education = new Set<string>();
  
  // Degree patterns
  const degreePatterns = [
    // Bachelor's degrees
    { pattern: /\b(?:B\.?S\.?|Bachelor(?:'s)?)\s*(?:of\s+)?(?:Science|Computer Science|Engineering|Information Technology)/gi, degree: "Bachelor of Science" },
    { pattern: /\b(?:B\.?A\.?|Bachelor(?:'s)?)\s*(?:of\s+)?(?:Arts)/gi, degree: "Bachelor of Arts" },
    { pattern: /\b(?:B\.?E\.?|Bachelor(?:'s)?)\s*(?:of\s+)?(?:Engineering)/gi, degree: "Bachelor of Engineering" },
    { pattern: /\bB\.?Tech\b/gi, degree: "B.Tech" },
    { pattern: /\bBachelor(?:'s)?\s*degree\b/gi, degree: "Bachelor's Degree" },
    
    // Master's degrees
    { pattern: /\b(?:M\.?S\.?|Master(?:'s)?)\s*(?:of\s+)?(?:Science|Computer Science|Engineering|Information Technology)/gi, degree: "Master of Science" },
    { pattern: /\b(?:M\.?A\.?|Master(?:'s)?)\s*(?:of\s+)?(?:Arts)/gi, degree: "Master of Arts" },
    { pattern: /\b(?:M\.?E\.?|Master(?:'s)?)\s*(?:of\s+)?(?:Engineering)/gi, degree: "Master of Engineering" },
    { pattern: /\bM\.?Tech\b/gi, degree: "M.Tech" },
    { pattern: /\bMaster(?:'s)?\s*degree\b/gi, degree: "Master's Degree" },
    
    // MBA
    { pattern: /\bMBA\b/gi, degree: "MBA" },
    { pattern: /\bMaster(?:'s)?\s*(?:of\s+)?Business\s*Administration\b/gi, degree: "MBA" },
    
    // PhD/Doctorate
    { pattern: /\bPh\.?D\.?\b/gi, degree: "PhD" },
    { pattern: /\bDoctorate\b/gi, degree: "Doctorate" },
    { pattern: /\bDoctor\s*(?:of\s+)?(?:Philosophy|Computer Science|Engineering)\b/gi, degree: "PhD" },
    
    // Associate
    { pattern: /\b(?:A\.?S\.?|Associate(?:'s)?)\s*(?:of\s+)?(?:Science|Applied Science)/gi, degree: "Associate of Science" },
    { pattern: /\bAssociate(?:'s)?\s*degree\b/gi, degree: "Associate Degree" },
  ];
  
  for (const { pattern, degree } of degreePatterns) {
    if (pattern.test(text)) {
      education.add(degree);
    }
  }
  
  // Look for university names
  const universityPatterns = [
    /(?:university\s+of\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/gi,
    /(?:[A-Z][a-z]+\s+University)/gi,
    /(?:[A-Z][a-z]+\s+Institute\s+of\s+Technology)/gi,
    /\bMIT\b/g,
    /\bStanford\b/gi,
    /\bHarvard\b/gi,
    /\bBerkeley\b/gi,
    /\bCarnegie\s*Mellon\b/gi,
    /\bCMU\b/g,
    /\bCaltech\b/gi,
    /\bGeorgia\s*Tech\b/gi,
    /\bIIT\b/g,
  ];
  
  for (const pattern of universityPatterns) {
    const matches = text.match(pattern);
    if (matches) {
      for (const match of matches) {
        // Clean up and add
        const cleaned = match.trim();
        if (cleaned.length > 2) {
          education.add(cleaned);
        }
      }
    }
  }
  
  // Look for education section
  const educationSectionMatch = text.match(/(?:education|academic|qualifications?)[:\s]*\n?([\s\S]*?)(?:\n\n|\n(?=experience|skills|work|employment|professional))/i);
  if (educationSectionMatch && educationSectionMatch[1]) {
    const section = educationSectionMatch[1];
    // Look for degree-like entries
    const lineMatches = section.match(/(?:degree|certificate|diploma|graduated?|majored?)[:\s]*[^\n]+/gi);
    if (lineMatches) {
      for (const match of lineMatches) {
        education.add(match.trim().substring(0, 100)); // Limit length
      }
    }
  }
  
  return [...education].slice(0, 10); // Limit to 10 entries
}

/**
 * Extract keywords from text
 */
function extractKeywords(text: string): string[] {
  const keywords = new Set<string>();
  
  // Action verbs that indicate accomplishments
  const actionPatterns = [
    /\b(developed|built|designed|implemented|architected|created|established)\b/gi,
    /\b(led|managed|directed|coordinated|supervised|mentored|coached)\b/gi,
    /\b(improved|optimized|enhanced|streamlined|automated|reduced|increased)\b/gi,
    /\b(launched|deployed|shipped|delivered|released|published)\b/gi,
    /\b(integrated|migrated|refactored|restructured|modernized)\b/gi,
    /\b(collaborated|partnered|contributed|supported|facilitated)\b/gi,
    /\b(analyzed|researched|evaluated|assessed|tested|validated)\b/gi,
  ];
  
  // Technical descriptors
  const technicalPatterns = [
    /\b(scalable|distributed|real-time|high-performance|production)\b/gi,
    /\b(cloud-native|serverless|containerized|microservice)\b/gi,
    /\b(full-stack|front-end|back-end|backend|frontend)\b/gi,
    /\b(responsive|mobile-first|cross-platform|native)\b/gi,
    /\b(secure|encrypted|authenticated|authorized)\b/gi,
    /\b(concurrent|parallel|asynchronous|async|multi-threaded)\b/gi,
    /\b(api|sdk|cli|ui|ux)\b/gi,
  ];
  
  // Business/impact indicators
  const businessPatterns = [
    /\b(startup|enterprise|Fortune\s*500|B2B|B2C|SaaS)\b/gi,
    /\b(revenue|growth|users|customers|clients)\b/gi,
    /\b(million|billion|thousands?)\s+(?:users|requests|transactions)/gi,
    /\b(\d+)%\s*(?:improvement|reduction|increase|growth)\b/gi,
    /\b(\d+)x\s*(?:faster|improvement|growth)\b/gi,
  ];
  
  // Leadership/team indicators
  const leadershipPatterns = [
    /\b(team\s*(?:lead|leader|of\s*\d+))\b/gi,
    /\b(senior|principal|staff|lead|chief|head)\b/gi,
    /\b(cross-functional|agile|remote|distributed)\s*team/gi,
  ];
  
  const allPatterns = [...actionPatterns, ...technicalPatterns, ...businessPatterns, ...leadershipPatterns];
  
  for (const pattern of allPatterns) {
    const matches = text.match(pattern);
    if (matches) {
      for (const match of matches) {
        keywords.add(match.toLowerCase().trim());
      }
    }
  }
  
  // Extract certifications
  const certPatterns = [
    /\b(AWS\s*(?:Certified|Solutions\s*Architect|Developer|SysOps))/gi,
    /\b(Google\s*Cloud\s*(?:Certified|Professional))/gi,
    /\b(Azure\s*(?:Certified|Administrator|Developer))/gi,
    /\b(Certified\s*(?:Kubernetes|Scrum\s*Master|PMP|CISSP))/gi,
  ];
  
  for (const pattern of certPatterns) {
    const matches = text.match(pattern);
    if (matches) {
      for (const match of matches) {
        keywords.add(match.toLowerCase().trim());
      }
    }
  }
  
  return [...keywords].slice(0, 30); // Limit to 30 keywords
}
