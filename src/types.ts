export interface Position {
  id: string;
  title: string;
  company: string;
  city: string;
  type: 'state-owned' | 'internet'; // 央国企 vs 互联网
  overallMatch: number; // e.g., 92
  resumeMatch: number; // e.g., 85
  personalityMatch: number; // e.g., 95
  salaryRange: string; // e.g., "年薪12-18万"
  difficultyRating: number; // e.g., 3 (for 3 stars)
  tags: string[]; // e.g., ["六险二金", "有编制"]
  summary: string;
  responsibilities: string[];
  requirements: string[]; // Hard skills
  softSkills: string[]; // Soft skills
  salaryDetail: string;
  careerPath: string[]; // Career progression steps
  fitPersonality: string[]; // e.g., ["尽责性高", "情绪稳定"]
  howToPrepare: {
    timeline: string[];
    exam: string;
    interview: string;
  };
  relatedJobs: string[]; // Job IDs or Titles of related positions
}

export interface AssessmentQuestion {
  id: number;
  text: string;
  dimension: 'O' | 'C' | 'E' | 'A' | 'N'; // Openness, Conscientiousness, Extraversion, Agreeableness, Neuroticism
}

export interface PersonalityResult {
  typeTitle: string;
  description: string;
  radarScores: {
    dimension: string;
    score: number;
    avg: number;
  }[];
  industryFit: {
    stateOwned: number; // e.g. 75
    internet: number; // e.g. 60
  };
  hollandCode: string; // e.g., "RCI"
  hollandTags: string[]; // e.g. ["现实型", "常规型", "研究型"]
  deepInterpretation: {
    summary: string;
    advantages: string[];
  };
}

export interface ResumeData {
  name: string;
  school: string;
  major: string;
  graduationYear: string;
  skills: string[];
  internships: {
    company: string;
    role: string;
    duration: string;
  }[];
  projects: {
    name: string;
    role: string;
    tech: string;
  }[];
  inferredDirection: string;
  targetCities: string[];
}
