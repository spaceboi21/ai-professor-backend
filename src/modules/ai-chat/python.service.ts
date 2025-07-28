import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { ConversationHistoryType } from 'src/common/types/ai-chat-module.type';

@Injectable()
export class PythonService {
  private readonly logger = new Logger(PythonService.name);
  private readonly baseUrl =
    process.env.PYTHON_API_URL || 'http://localhost:8000';

  constructor(private readonly httpService: HttpService) {}

  /**
   * Start a new AI patient session
   * POST /chat/patient/start
   */
  async startPatientSession(
    module_title: string,
    module_description: string,
    scenario: string,
  ) {
    return this._post('/chat/patient/start', {
      scenario,
      module_title,
      module_description,
    });
  }

  /**
   * Send a message to the AI patient
   * POST /chat/patient/chat
   */
  async patientChat(
    message: string,
    conversation_history: ConversationHistoryType[],
    module_title: string,
    module_description: string,
    scenario: string,
  ) {
    const patient_context = {
      module_title,
      module_description,
      scenario,
    };

    return this._post('/chat/patient/chat', {
      message,
      conversation_history,
      patient_context,
    });
  }

  /**
   * Analyze conversation and provide supervisor feedback
   * POST /chat/supervisor/analyze
   */
  async supervisorAnalyze(conversation_history: ConversationHistoryType[]) {
    return this._post('/chat/supervisor/analyze', { conversation_history });
  }

  /**
   * Get study materials and resources from AI professor
   * POST /chat/professor/resources
   */
  async professorResources(
    module_title: string,
    feedback: {
      areas_for_improvement: string[];
      overall_score: number;
      strengths: string[];
    },
    keywords: string[],
  ) {
    return this._post('/chat/professor/resources', {
      keywords,
      module_context: module_title,
      feedback,
    });
  }

  /**
   * Extract keywords for learning
   * POST /chat/professor/keywords
   */
  async extractKeywords(text: string) {
    return this._post('/chat/professor/keywords', {
      text,
    });
  }

  /**
   * Complete session workflow (analyze and recommend in one step)
   * POST /chat/workflow/complete-session
   */
  async completeSessionWorkflow(
    module_title: string,
    module_description: string,
    conversation_history: ConversationHistoryType[],
    scenario: string,
  ) {
    const patient_context = {
      module_title,
      module_description,
      scenario,
    };
    return this._post('/chat/workflow/complete-session', {
      patient_context,
      conversation_history,
    });
  }

  async generatePatientScenario(
    module_title: string,
    module_description: string,
  ) {
    return this._post('/chat/patient/generate-scenario', {
      module_title,
      module_description,
    });
  }

  /**
   * Validate module against knowledge base
   * POST /chat/module/validate
   */
  async validateModule(
    module_title: string,
    module_subject: string,
    module_description: string,
    module_category: string,
  ) {
    return this._post('/chat/module/validate', {
      module_title,
      module_subject,
      module_description,
      module_category,
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
