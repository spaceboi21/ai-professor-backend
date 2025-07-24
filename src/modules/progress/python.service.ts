import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { QuizQuestionTypeEnum } from 'src/common/constants/quiz.constant';

interface QuizQuestion {
  question: string;
  type: QuizQuestionTypeEnum;
  options?: string[];
  correct_answer?: string;
}

interface QuizVerificationRequest {
  module_title: string;
  module_description: string;
  questions: QuizQuestion[];
  max_results?: number;
}

@Injectable()
export class PythonService {
  private readonly logger = new Logger(PythonService.name);
  private readonly baseUrl =
    process.env.PYTHON_API_URL || 'http://localhost:8000';

  constructor(private readonly httpService: HttpService) {}

  /**
   * Knowledge base Q&A for multiple questions
   * POST /chat/qa/ask
   */
  async quizVerificationByAI(
    module_title: string,
    module_description: string,
    questions: QuizQuestion[],
    max_results: number = 1,
  ) {
    const module_context = `Module: ${module_title}
    Description: ${module_description}

    Questions to verify:
    ${questions
      .map((q, index) => {
        const questionText =
          index === 0
            ? `${index + 1}. ${q.question}`
            : `    ${index + 1}. ${q.question}`;
        const typeText = `      Type: ${q.type}`;
        const optionsText =
          q.options && q.options.length > 0
            ? `      Options: ${q.options.join(', ')}`
            : '';
        const correctAnswerText = q.correct_answer
          ? `      Correct Answer: ${q.correct_answer}`
          : '';

        return [questionText, typeText, optionsText, correctAnswerText]
          .filter((text) => text)
          .join('\n');
      })
      .join('\n\n')}

    Please verify each question for accuracy, relevance to the module content, and appropriateness for medical education. Provide feedback on question quality, difficulty level, and suggest improvements if needed.`;

    // module_context Module: Find High Blood Pressure Tools and Resources
    // Description: Find High Blood Pressure Tools and Resources

    // Questions to verify:
    // 1. blood Pressure q1
    //   Type: SINGLE_SELECT
    //   Options: A Group, AB Group, A+ Group, A-

    // 2. blood Pressure q2
    //   Type: SINGLE_SELECT
    //   Options: A Group, AB Group, A+ Group, A-

    // Please verify each question for accuracy, relevance to the module content, and appropriateness for medical education. Provide feedback on question quality, difficulty level, and suggest improvements if needed.

    return this._post('/chat/qa/ask', {
      module_title,
      module_description,
      questions,
      module_context,
      max_results,
    });
  }

  /**
   * Generic POST helper with improved error handling
   */
  private async _post(path: string, payload: any) {
    const url = `${this.baseUrl}${path}`;
    try {
      this.logger.log(`Making request to Python API: ${url}`);
      const response = await firstValueFrom(
        this.httpService.post(url, payload, {
          timeout: 30000, // 30 second timeout
          headers: {
            'Content-Type': 'application/json',
          },
        }),
      );

      this.logger.log(`Python API call successful: ${path}`);
      return response?.data;
    } catch (error) {
      // Re-throw with more context
      const errorMessage =
        error?.response?.data?.message || error?.message || 'Unknown error';
      throw new Error(`Python API call failed (${path}): ${errorMessage}`);
    }
  }
}
