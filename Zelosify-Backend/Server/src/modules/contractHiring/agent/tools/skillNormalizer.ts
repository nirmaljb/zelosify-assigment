/**
 * Skill Normalizer Tool
 * 
 * Normalizes skill names to standard forms for accurate matching.
 * This ensures consistent comparison between candidate skills and requirements.
 */

/**
 * Skill normalization mappings
 */
const SKILL_MAPPINGS: Record<string, string> = {
  // JavaScript variations
  "js": "JavaScript",
  "javascript": "JavaScript",
  "ecmascript": "JavaScript",
  "es6": "JavaScript",
  "es2015": "JavaScript",
  "es2020": "JavaScript",
  
  // TypeScript variations
  "ts": "TypeScript",
  "typescript": "TypeScript",
  
  // React variations
  "react": "React",
  "react.js": "React",
  "reactjs": "React",
  "react js": "React",
  
  // Node.js variations
  "node": "Node.js",
  "node.js": "Node.js",
  "nodejs": "Node.js",
  
  // Python variations
  "python": "Python",
  "python3": "Python",
  "py": "Python",
  
  // Database variations
  "postgres": "PostgreSQL",
  "postgresql": "PostgreSQL",
  "pg": "PostgreSQL",
  "mysql": "MySQL",
  "mongo": "MongoDB",
  "mongodb": "MongoDB",
  "redis": "Redis",
  
  // Cloud variations
  "amazon web services": "AWS",
  "aws": "AWS",
  "azure": "Azure",
  "microsoft azure": "Azure",
  "google cloud": "GCP",
  "gcp": "GCP",
  "google cloud platform": "GCP",
  
  // Container variations
  "docker": "Docker",
  "kubernetes": "Kubernetes",
  "k8s": "Kubernetes",
  
  // Framework variations
  "angular": "Angular",
  "angularjs": "Angular",
  "vue": "Vue",
  "vue.js": "Vue",
  "vuejs": "Vue",
  "next": "Next.js",
  "next.js": "Next.js",
  "nextjs": "Next.js",
  "express": "Express",
  "express.js": "Express",
  "expressjs": "Express",
  "django": "Django",
  "flask": "Flask",
  "spring": "Spring",
  "spring boot": "Spring Boot",
  "springboot": "Spring Boot",
  
  // Language variations
  "java": "Java",
  "c++": "C++",
  "cpp": "C++",
  "c#": "C#",
  "csharp": "C#",
  "golang": "Go",
  "go": "Go",
  "rust": "Rust",
  "ruby": "Ruby",
  "php": "PHP",
  "swift": "Swift",
  "kotlin": "Kotlin",
  "scala": "Scala",
  
  // Data/ML variations
  "machine learning": "Machine Learning",
  "ml": "Machine Learning",
  "artificial intelligence": "AI",
  "ai": "AI",
  "deep learning": "Deep Learning",
  "dl": "Deep Learning",
  "data science": "Data Science",
  "tensorflow": "TensorFlow",
  "pytorch": "PyTorch",
  "keras": "Keras",
  
  // DevOps variations
  "ci/cd": "CI/CD",
  "cicd": "CI/CD",
  "continuous integration": "CI/CD",
  "jenkins": "Jenkins",
  "github actions": "GitHub Actions",
  "gitlab ci": "GitLab CI",
  "terraform": "Terraform",
  "ansible": "Ansible",
  
  // API variations
  "rest": "REST",
  "restful": "REST",
  "rest api": "REST",
  "graphql": "GraphQL",
  "grpc": "gRPC",
  
  // Other
  "git": "Git",
  "github": "GitHub",
  "gitlab": "GitLab",
  "agile": "Agile",
  "scrum": "Scrum",
  "jira": "Jira",
  "linux": "Linux",
  "unix": "Unix",
  "html": "HTML",
  "css": "CSS",
  "sass": "SASS",
  "tailwind": "Tailwind CSS",
  "tailwindcss": "Tailwind CSS",
  "sql": "SQL",
  "nosql": "NoSQL",
};

/**
 * Normalize a single skill
 */
export function normalizeSkill(skill: string): string {
  const lowerSkill = skill.toLowerCase().trim();
  return SKILL_MAPPINGS[lowerSkill] || skill.trim();
}

/**
 * Normalize an array of skills
 */
export function normalizeSkills(skills: string[]): string[] {
  const normalized = skills.map(normalizeSkill);
  // Remove duplicates
  return [...new Set(normalized)];
}

/**
 * Check if two skills are equivalent after normalization
 */
export function skillsMatch(skill1: string, skill2: string): boolean {
  return normalizeSkill(skill1) === normalizeSkill(skill2);
}

/**
 * Calculate skill overlap between candidate and requirements
 */
export function calculateSkillOverlap(
  candidateSkills: string[],
  requiredSkills: string[]
): { overlap: number; matchedSkills: string[]; missingSkills: string[] } {
  const normalizedCandidate = normalizeSkills(candidateSkills);
  const normalizedRequired = normalizeSkills(requiredSkills);
  
  const matchedSkills: string[] = [];
  const missingSkills: string[] = [];
  
  for (const required of normalizedRequired) {
    if (normalizedCandidate.includes(required)) {
      matchedSkills.push(required);
    } else {
      missingSkills.push(required);
    }
  }
  
  const overlap = requiredSkills.length > 0
    ? matchedSkills.length / requiredSkills.length
    : 0;
  
  return { overlap, matchedSkills, missingSkills };
}
