import { QuizQuestionTypeEnum } from '../constants/quiz.constant';

export interface QuizQuestion {
  question: string;
  question_type: QuizQuestionTypeEnum;
  options?: string[];
  user_answer?: string;
}

export interface QuizVerificationRequest {
  module_title: string;
  module_description: string;
  questions: QuizQuestion[];
  max_results?: number;
}

export interface QuizVerificationResponse {
  total_questions: number;
  correct_answers: number;
  score_percentage: number;
  overall_feedback: string;
  knowledge_available: boolean;
  questions_results: {
    question_index: number;
    question: string;
    question_type: QuizQuestionTypeEnum;
    user_answer: string;
    is_correct: boolean;
    correct_answer: string;
    explanation: string | null;
    feedback: string | null;
    score: number;
  }[];
}
