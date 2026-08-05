import type { PersonalityResult, Position, ResumeData } from '../../types';

export type AiProviderName = 'zhipu' | 'deepseek';

export interface ResumeParseInput {
  extractedText: string;
  fileName?: string;
  sourceType: 'text' | 'pdf' | 'docx' | 'txt' | 'image' | 'ocr-pdf';
}

export interface MatchResult {
  resumeMatch: number;
  personalityMatch: number;
  overallMatch: number;
  resumeMatchExplanation: string;
  personalityMatchExplanation: string;
  whyExcellent: string;
}

export interface MatchPositionInput {
  resumeData: Partial<ResumeData>;
  personalityResult: Partial<PersonalityResult>;
  position: Position;
}

export interface ChatMessageInput {
  sender: 'user' | 'assistant' | 'model';
  text: string;
}

export interface PositionChatInput {
  position: Position;
  messages: ChatMessageInput[];
  resumeData?: Partial<ResumeData>;
}

export interface AiProvider {
  name: AiProviderName;
  isConfigured(): boolean;
  parseResume(input: ResumeParseInput): Promise<ResumeData>;
  matchPosition(input: MatchPositionInput): Promise<MatchResult>;
  chatAboutPosition(input: PositionChatInput): Promise<string>;
}
