import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

export interface AnchorChatConversationHistoryType {
  role: string;
  content: string;
  timestamp: Date;
}

@Injectable()
export class AnchorChatPythonService {
  private readonly logger = new Logger(AnchorChatPythonService.name);
  private readonly baseUrl =
    process.env.PYTHON_API_URL || 'http://localhost:8000';

  constructor(private readonly httpService: HttpService) {}

  /**
   * Start a new anchor-chat session with AI resource advisor
   * POST /chat/anchor/start
   */
  async startAnchorChatSession(
    anchor_tag_title: string,
    anchor_tag_description: string,
    anchor_context: string,
    module_title: string,
    chapter_title: string,
    bibliography_title: string,
    ai_chat_question?: string,
  ): Promise<any> {
    return this._post('/chat/anchor/start', {
      anchor_tag_title,
      anchor_tag_description,
      anchor_context,
      module_title,
      chapter_title,
      bibliography_title,
      ai_chat_question,
    });
  }

  /**
   * Start a new quiz chat session
   * POST /chat/quiz/start
   */
  async startQuizChatSession(
    module_title: string,
    quiz_subject?: string,
    quiz_questions?: any[],
    user_answers?: any[],
  ): Promise<any> {
    return this._post('/chat/quiz/start', {
      module_title,
      quiz_subject: quiz_subject || null,
      quiz_questions: quiz_questions || null,
      user_answers: user_answers || null,
    });
  }

  /**
   * Get quiz resources and suggestions
   * POST /chat/quiz/resources
   */
  async getQuizResources(
    module_title: string,
    quiz_subject?: string,
    quiz_questions?: any[],
    user_answers?: any[],
    conversation_history?: AnchorChatConversationHistoryType[],
    keywords?: string[],
  ): Promise<any> {
    const payload = {
      module_title,
      quiz_subject: quiz_subject || null,
      quiz_questions: quiz_questions || null,
      user_answers: user_answers || null,
      conversation_history: conversation_history || [],
      keywords: keywords || [],
    };

    this.logger.log('🐍 Quiz Resources API Payload:');
    this.logger.log(JSON.stringify(payload, null, 2));

    return this._post('/chat/quiz/resources', payload);
  }

  /**
   * Chat with AI about quiz-related topics
   * POST /chat/quiz/chat
   */
  async quizChat(
    message: string,
    conversation_history: AnchorChatConversationHistoryType[],
    module_title: string,
    quiz_subject?: string,
    quiz_questions?: any[],
    user_answers?: any[],
  ): Promise<any> {
    return this._post('/chat/quiz/chat', {
      message,
      conversation_history,
      quiz_details: {
        module_title,
        quiz_subject: quiz_subject || null,
        quiz_questions: quiz_questions || null,
        user_answers: user_answers || null,
      },
    });
  }

  /**
   * Chat with AI about resources related to anchor tag
   * POST /chat/anchor/chat
   */
  async anchorResourceChat(
    message: string,
    conversation_history: AnchorChatConversationHistoryType[],
    anchor_tag_title: string,
    anchor_tag_description: string,
    anchor_context: string,
    module_title: string,
    chapter_title: string,
    bibliography_title: string,
    is_answering_ai_question?: boolean,
  ): Promise<any> {
    const anchor_details = {
      anchor_tag_title,
      anchor_tag_description,
      anchor_context,
      module_title,
      chapter_title,
      bibliography_title,
    };

    return this._post('/chat/anchor/chat', {
      message,
      conversation_history,
      anchor_details,
      is_answering_ai_question,
    });
  }

  /**
   * Continue conversation after AI question is answered
   * This uses the same /chat/anchor/chat endpoint but with special context
   */
  async continueAfterAiQuestion(
    student_answer: string,
    conversation_history: AnchorChatConversationHistoryType[],
    anchor_tag_title: string,
    anchor_tag_description: string,
    anchor_context: string,
    module_title: string,
    chapter_title: string,
    bibliography_title: string,
    original_ai_question: string,
  ): Promise<any> {
    return this._post('/chat/anchor/chat', {
      message: student_answer,
      conversation_history,
      anchor_details: {
        anchor_tag_title,
        anchor_tag_description,
        anchor_context,
        module_title,
        chapter_title,
        bibliography_title,
      },
      is_answering_ai_question: true,
      original_ai_question,
    });
  }


  /**
   * Get suggested resources based on anchor tag and conversation
   * POST /chat/anchor/resources
   */
  async getAnchorResources(
    anchor_tag_title: string,
    anchor_tag_description: string,
    anchor_context: string,
    module_title: string,
    chapter_title: string,
    bibliography_title: string,
    conversation_history: AnchorChatConversationHistoryType[],
    keywords: string[],
  ): Promise<any> {
    return this._post('/chat/anchor/resources', {
      anchor_tag_title,
      anchor_tag_description,
      anchor_context,
      module_title,
      chapter_title,
      bibliography_title,
      conversation_history,
      keywords,
    });
  }

  /**
   * Extract keywords from anchor tag and conversation
   * POST /chat/anchor/keywords
   */
  async extractAnchorKeywords(
    anchor_tag_title: string,
    anchor_tag_description: string,
    conversation_text: string,
  ): Promise<any> {
    return this._post('/chat/anchor/keywords', {
      anchor_tag_title,
      anchor_tag_description,
      conversation_text,
    });
  }

  /**
   * Get personalized learning recommendations based on anchor tag
   * POST /chat/anchor/recommendations
   */
  async getPersonalizedRecommendations(
    anchor_tag_title: string,
    anchor_tag_description: string,
    student_learning_style: string,
    previous_interactions: string[],
  ): Promise<any> {
    return this._post('/chat/anchor/recommendations', {
      anchor_tag_title,
      anchor_tag_description,
      student_learning_style,
      previous_interactions,
    });
  }

  /**
   * Validate anchor tag content against knowledge base
   * POST /chat/anchor/validate
   */
  async validateAnchorTag(
    anchor_tag_title: string,
    anchor_tag_description: string,
    content_type: string,
    module_title: string,
  ): Promise<any> {
    return this._post('/chat/anchor/validate', {
      anchor_tag_title,
      anchor_tag_description,
      content_type,
      module_title,
    });
  }

  /**
   * Generic POST helper with improved error handling
   */
  private async _post(path: string, payload: any): Promise<any> {
    const url = `${this.baseUrl}${path}`;
    try {
      this.logger.log(`Making request to Python API: ${url}`);
      const response = await firstValueFrom(
        this.httpService.post(url, payload, {
          timeout: 60000, // 60 second timeout
          headers: {
            'Content-Type': 'application/json',
          },
        }),
      );

      this.logger.log(`Python API call successful: ${path}`);
      return response?.data;
    } catch (error) {
      // Enhanced error logging for debugging
      this.logger.error(`Python API call failed (${path}):`, {
        status: error?.response?.status,
        statusText: error?.response?.statusText,
        data: error?.response?.data,
        payload: payload,
        url: url,
      });

      // Re-throw with more context
      const errorMessage =
        error?.response?.data?.message || error?.message || 'Unknown error';
      throw new Error(`Python API call failed (${path}): ${errorMessage}`);
    }
  }
}
