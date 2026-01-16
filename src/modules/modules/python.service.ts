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

export interface PythonModuleResponse {
  success: boolean;
  total_modules: number;
  modules: Array<{
    module_id: string;
    module_title: string;
    author: string;
    teaching_unit: string;
    semester: string;
    difficulty_level: string;
    estimated_duration: number;
    pedagogical_tags: string[];
    keywords: string[];
    theoretical_concepts: string[];
    bibliography: string[];
    prerequisites: string[];
    description: string;
    upload_date: string;
    namespace: string;
    total_chunks: number;
    vector_count: number;
  }>;
  index_name: string;
  total_vectors: number;
}

@Injectable()
export class PythonService {
  private readonly logger = new Logger(PythonService.name);
  private readonly baseUrl =
    process.env.PYTHON_API_URL || 'http://localhost:8000/api/v1';

  constructor(private readonly httpService: HttpService) {}

  /**
   * Get modules from Python service
   * GET /api/v1/modules/
   */
  async getModules(): Promise<PythonModuleResponse> {
    return this._get('/modules/');
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
  ): Promise<ModuleValidationResponse> {
    return this._post('/chat/module/validate', {
      module_title,
      module_subject,
      module_description,
      module_category,
    });
  }

  /**
   * Generic GET helper with improved error handling
   */
  private async _get(path: string) {
    const url = `${this.baseUrl}${path}`;
    try {
      this.logger.log(`Making GET request to Python API: ${url}`);
      const response = await firstValueFrom(
        this.httpService.get(url, {
          timeout: 60000, // 60 second timeout (increased from 30s)
          headers: {
            'Content-Type': 'application/json',
          },
        }),
      );

      this.logger.log(`Python API GET call successful: ${path}`);
      return response?.data;
    } catch (error) {
      // Re-throw with more context
      const errorMessage =
        error?.response?.data?.message || error?.message || 'Unknown error';
      this.logger.error(`Python API GET call failed: ${url}`, error?.stack || error);
      throw new Error(`Python API GET call failed (${path}): ${errorMessage}`);
    }
  }

  /**
   * Generic POST helper with improved error handling
   */
  private async _post(path: string, payload: any) {
    const url = `${this.baseUrl}${path}`;
    try {
      this.logger.log(`Making POST request to Python API: ${url}`);
      const response = await firstValueFrom(
        this.httpService.post(url, payload, {
          timeout: 60000, // 60 second timeout (increased from 30s)
          headers: {
            'Content-Type': 'application/json',
          },
        }),
      );

      this.logger.log(`Python API POST call successful: ${path}`);
      return response?.data;
    } catch (error) {
      // Re-throw with more context
      const errorMessage =
        error?.response?.data?.message || error?.message || 'Unknown error';
      this.logger.error(`Python API POST call failed: ${url}`, error?.stack || error);
      throw new Error(`Python API POST call failed (${path}): ${errorMessage}`);
    }
  }
}
