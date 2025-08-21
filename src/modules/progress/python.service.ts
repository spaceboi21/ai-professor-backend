import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { QuizQuestionTypeEnum } from 'src/common/constants/quiz.constant';
import { QuizQuestion } from 'src/common/types/quiz.type';

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
    const module_context = `Questions to verify:
${questions
  .map(
    (q, index) =>
      `${index + 1}. ${q.question}\n  Type: ${q.question_type}${
        q.options && q.options.length > 0
          ? `\n  Options: ${q.options.join(', ')}`
          : ''
      }\n  user_answer: ${q.user_answer ?? ''}`,
  )
  .join('\n\n')}`;

    console.log('module_context', JSON.stringify(module_context));
    console.log('questions', questions);
    return this._post('/chat/qa/validate-quiz', {
      module_title,
      module_description,
      module_context,
      questions,
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
