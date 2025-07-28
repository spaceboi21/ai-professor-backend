import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

export interface ModuleValidationResponse {
  module_exists: boolean;
  confidence_score: number;
  index_used: string;
  message: string;
  module_title: string;
  module_description: string;
  validation_details: {
    total_documents_found: number;
    max_similarity_score: number;
    min_similarity_threshold: number;
    search_query: string;
    clinical_index: {
      exists: boolean;
      score: number;
      documents_found: number;
      document_titles: string[];
    };
    literary_index: {
      exists: boolean;
      score: number;
      documents_found: number;
      document_titles: string[];
    };
    primary_index: string;
    coverage_type: string;
  };
}

@Injectable()
export class PythonService {
  private readonly logger = new Logger(PythonService.name);
  private readonly baseUrl =
    process.env.PYTHON_API_URL || 'http://localhost:8000';

  constructor(private readonly httpService: HttpService) {}

  /**
   * Validate module against knowledge base
   * POST /chat/module/validate
   */
  async validateModule(
    module_title: string,
    module_subject: string,
    module_description: string,
    module_category: string,
  ): Promise<ModuleValidationResponse> {
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
