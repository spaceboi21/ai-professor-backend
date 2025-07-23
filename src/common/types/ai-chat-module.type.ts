export interface ConversationHistoryType {
  role: string;
  content: string;
  timestamp: string;
}

export interface RatingObjectType {
  overall_score: number;
  communication_score: number;
  clinical_score: number;
  professionalism_score: number;
}

export interface SupervisorAnalysisResponseType {
  overall_score: number;
  communication_score: number;
  clinical_score: number;
  professionalism_score: number;
  keywords_for_learning: string[];
  suggestions: string[];
  missed_opportunities: string[];
  areas_for_improvement: string[];
  strengths: string[];
  skill_gaps: string[];
}

export interface ProfessorResourcesResponseType {
  search_query: string;
  resources: string[];
  recommendations: string;
  total_found: number;
  knowledge_available: boolean;
  keywords_used: string[]
}