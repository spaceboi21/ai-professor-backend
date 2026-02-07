import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { SessionTypeEnum } from 'src/common/constants/internship.constant';

// Response interfaces for Python API
export interface PatientInitializeResponse {
  session_id: string;
  initial_context: Record<string, any>;
  success: boolean;
  message?: string;
}

export interface PatientMessageResponse {
  patient_response: string;
  clinical_signals: Array<{
    signal_type: string;
    description: string;
    severity: string;
  }>;
  emotional_state: string;
  success: boolean;
  message?: string;
}

export interface TherapistInitializeResponse {
  session_id: string;
  initial_context: Record<string, any>;
  success: boolean;
  message?: string;
}

export interface TherapistMessageResponse {
  therapist_response: string;
  pedagogical_insights: string[];
  suggested_techniques: string[];
  success: boolean;
  message?: string;
}

export interface SupervisorRealtimeTipResponse {
  should_show_tip: boolean;
  tip_content: string;
  tip_category: string;
  success: boolean;
  message?: string;
}

export interface SupervisorFeedbackResponse {
  feedback: {
    overall_score: number;
    strengths: string[];
    areas_for_improvement: string[];
    technical_assessment: Record<string, any>;
    communication_assessment: Record<string, any>;
    clinical_reasoning: Record<string, any>;
  };
  score: number;
  success: boolean;
  message?: string;
}

export interface SessionAnalysisResponse {
  overall_performance: Record<string, any>;
  skill_breakdown: Record<string, any>;
  recommendations: string[];
  success: boolean;
  message?: string;
}

// Cross-session memory interfaces
export interface InternshipMemoryResponse {
  found: boolean;
  memory?: {
    internship_id: string;
    user_id: string;
    total_sessions: number;
    current_session_number: number;
    sessions: any[];
    patient_memory: {
      techniques_learned: string[];
      safe_place_details: string | null;
      trauma_targets: any[];
      current_sud_baseline: number | null;
      bilateral_stimulation_preferences: string | null;
    };
    student_progress: {
      skills_demonstrated: Record<string, number>;
      areas_of_strength: string[];
      areas_for_improvement: string[];
      supervisor_notes: Array<{
        note: string;
        session_number: number;
        timestamp: string;
      }>;
    };
  };
}

export interface SaveSessionSummaryRequest {
  internship_id: string;
  user_id: string;
  session_summary: {
    session_number: number;
    session_type: string;
    duration_minutes: number;
    key_activities: string[];
    outcomes: string;
    student_skills_demonstrated: string[];
    feedback_highlights: string;
  };
}

export interface UpdatePatientMemoryRequest {
  internship_id: string;
  user_id: string;
  technique_learned?: string;
  safe_place_details?: string;
  trauma_target?: {
    description: string;
    sud: number;
    emotion: string;
  };
  sud_level?: number;
  bls_preference?: string;
}

@Injectable()
export class PythonInternshipService {
  private readonly logger = new Logger(PythonInternshipService.name);
  private readonly baseUrl =
    process.env.PYTHON_API_URL || 'http://localhost:8000/api/v1';

  constructor(private readonly httpService: HttpService) {}

  /**
   * Initialize patient simulation session
   * POST /api/v1/internship/patient/initialize
   */
  async initializePatientSession(
    caseId: string,
    patientProfile: Record<string, any>,
    scenarioConfig: Record<string, any>,
    internshipId?: string,
    userId?: string,
  ): Promise<PatientInitializeResponse> {
    const payload: any = {
      case_id: caseId,
      patient_profile: patientProfile,
      scenario_config: scenarioConfig,
    };

    // Add cross-session memory context if provided
    if (internshipId && userId) {
      payload.internship_id = internshipId;
      payload.user_id = userId;
      this.logger.log(
        `Initializing patient with memory context: internship=${internshipId}, user=${userId}`,
      );
    }

    return this._post('/internship/patient/initialize', payload);
  }

  /**
   * Send message to patient simulation
   * POST /api/v1/internship/patient/message
   */
  async sendPatientMessage(
    sessionId: string,
    studentMessage: string,
    context: Record<string, any>,
    therapistActions?: string[],
  ): Promise<PatientMessageResponse> {
    const payload = {
      session_id: sessionId,
      student_message: studentMessage,
      context,
      therapist_actions: therapistActions || [],
    };

    return this._post('/internship/patient/message', payload);
  }

  /**
   * Initialize therapist consultation session
   * POST /api/v1/internship/therapist/initialize
   */
  async initializeTherapistSession(
    caseId: string,
    sessionHistory: any[],
    studentContext: Record<string, any>,
  ): Promise<TherapistInitializeResponse> {
    const payload = {
      case_id: caseId,
      session_history: sessionHistory,
      student_context: studentContext,
    };

    return this._post('/internship/therapist/initialize', payload);
  }

  /**
   * Send message to therapist simulation
   * POST /api/v1/internship/therapist/message
   */
  async sendTherapistMessage(
    sessionId: string,
    studentMessage: string,
  ): Promise<TherapistMessageResponse> {
    const payload = {
      session_id: sessionId,
      student_message: studentMessage,
    };

    return this._post('/internship/therapist/message', payload);
  }

  /**
   * Get real-time supervisor tips
   * POST /api/v1/internship/supervisor/realtime-tips
   */
  async getSupervisorRealtimeTip(
    sessionId: string,
    currentMessage: string,
    conversationHistory: any[],
  ): Promise<SupervisorRealtimeTipResponse> {
    const payload = {
      session_id: sessionId,
      current_message: currentMessage,
      conversation_history: conversationHistory,
    };

    return this._post('/internship/supervisor/realtime-tips', payload);
  }

  /**
   * Generate supervisor feedback
   * POST /api/v1/internship/supervisor/generate-feedback
   */
  async generateSupervisorFeedback(
    caseId: string,
    sessionData: Record<string, any>,
    evaluationCriteria: Array<{ criterion: string; weight: number }>,
  ): Promise<SupervisorFeedbackResponse> {
    const payload = {
      case_id: caseId,
      session_data: sessionData,
      evaluation_criteria: evaluationCriteria,
    };

    return this._post('/internship/supervisor/generate-feedback', payload);
  }

  /**
   * Analyze complete session
   * POST /api/v1/internship/analyze-session
   */
  async analyzeSession(
    sessionId: string,
    sessionTranscript: any[],
    evaluationRubric: any[],
  ): Promise<SessionAnalysisResponse> {
    const payload = {
      session_id: sessionId,
      session_transcript: sessionTranscript,
      evaluation_rubric: evaluationRubric,
    };

    return this._post('/internship/analyze-session', payload);
  }

  /**
   * End session on Python side
   * POST /api/v1/internship/session/end
   */
  async endSession(sessionId: string, sessionType: SessionTypeEnum): Promise<any> {
    const payload = {
      session_id: sessionId,
      session_type: sessionType,
    };

    return this._post('/internship/session/end', payload);
  }

  /**
   * Ingest case into Python/Pinecone for AI patient simulation
   * POST /api/v1/internship/cases/ingest
   */
  async ingestCase(data: {
    case_id: string;
    case_title: string;
    case_content: string;
    case_documents: Array<{ url: string; type: string; name: string }>;
    metadata?: any;
  }): Promise<any> {
    try {
      this.logger.log(`Ingesting case into Python/Pinecone: ${data.case_id}`);
      
      const response = await this._post('/internship/cases/ingest', data);
      
      this.logger.log(
        `Case ingested successfully: ${data.case_id} - Chunks: ${response.chunks_created}, Vectors: ${response.vectors_uploaded}`,
      );
      
      return response;
    } catch (error) {
      this.logger.error(
        `Failed to ingest case ${data.case_id}: ${error.message}`,
      );
      // Don't throw - case is already saved in MongoDB
      // Just log the error and return failure status
      return { success: false, error: error.message, case_id: data.case_id };
    }
  }

  /**
   * Delete case from Python/Pinecone
   * POST /api/v1/internship/cases/delete
   */
  async deleteCase(caseId: string): Promise<any> {
    try {
      this.logger.log(`Deleting case from Python/Pinecone: ${caseId}`);
      
      const response = await this._post('/internship/cases/delete', {
        case_id: caseId,
      });
      
      this.logger.log(`Case deleted successfully from Python: ${caseId}`);
      
      return response;
    } catch (error) {
      this.logger.error(
        `Failed to delete case from Python ${caseId}: ${error.message}`,
      );
      // Don't throw - we still want MongoDB deletion to succeed
      return { success: false, error: error.message, case_id: caseId };
    }
  }

  /**
   * Get internship memory for cross-session continuity
   * GET /api/v1/internship/memory/{internship_id}/{user_id}
   */
  async getInternshipMemory(
    internshipId: string,
    userId: string,
  ): Promise<InternshipMemoryResponse> {
    try {
      this.logger.log(
        `Getting internship memory: internship_id=${internshipId}, user_id=${userId}`,
      );
      
      const response = await this._get(
        `/internship/memory/${internshipId}/${userId}`,
      );
      
      if (response.found) {
        this.logger.log(
          `Memory found: ${response.memory.total_sessions} sessions, ` +
          `${response.memory.patient_memory.techniques_learned.length} techniques learned`,
        );
      } else {
        this.logger.log('No existing memory found - this is the first session');
      }
      
      return response;
    } catch (error) {
      this.logger.error(`Failed to get internship memory: ${error.message}`);
      // Return empty memory instead of throwing - graceful degradation
      return { found: false };
    }
  }

  /**
   * Save session summary to cross-session memory
   * POST /api/v1/internship/memory/session-summary
   */
  async saveSessionSummary(
    request: SaveSessionSummaryRequest,
  ): Promise<any> {
    try {
      this.logger.log(
        `Saving session summary: internship_id=${request.internship_id}, ` +
        `session_number=${request.session_summary.session_number}`,
      );
      
      // Extract query params
      const { internship_id, user_id, session_summary } = request;
      
      // Build query string
      const queryParams = new URLSearchParams({
        internship_id,
        user_id,
      }).toString();
      
      const response = await this._post(
        `/internship/memory/session-summary?${queryParams}`,
        { session_summary },
      );
      
      this.logger.log(
        `Session summary saved successfully: session ${session_summary.session_number}`,
      );
      
      return response;
    } catch (error) {
      this.logger.error(`Failed to save session summary: ${error.message}`);
      // Don't throw - session is already completed in NestJS
      // Just log the error
      return { success: false, error: error.message };
    }
  }

  /**
   * Update patient memory (techniques learned, safe place, trauma targets, etc.)
   * POST /api/v1/internship/memory/update-patient-memory
   */
  async updatePatientMemory(
    request: UpdatePatientMemoryRequest,
  ): Promise<any> {
    try {
      this.logger.log(
        `Updating patient memory: internship_id=${request.internship_id}, ` +
        `technique=${request.technique_learned || 'N/A'}`,
      );
      
      // Extract query params
      const { internship_id, user_id, ...bodyData } = request;
      
      // Build query string
      const queryParams = new URLSearchParams({
        internship_id,
        user_id,
      }).toString();
      
      const response = await this._post(
        `/internship/memory/update-patient-memory?${queryParams}`,
        bodyData,
      );
      
      this.logger.log('Patient memory updated successfully');
      
      return response;
    } catch (error) {
      this.logger.error(`Failed to update patient memory: ${error.message}`);
      // Don't throw - memory update is optional
      return { success: false, error: error.message };
    }
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
          timeout: 30000, // 30 second timeout
        }),
      );

      this.logger.log(`Python API GET call successful: ${path}`);
      return response?.data;
    } catch (error) {
      // Re-throw with more context
      const errorMessage =
        error?.response?.data?.message || error?.message || 'Unknown error';
      this.logger.error(
        `Python API GET call failed (${path}): ${errorMessage}`,
      );
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
      this.logger.debug(`Request payload: ${JSON.stringify(payload, null, 2)}`);
      
      const response = await firstValueFrom(
        this.httpService.post(url, payload, {
          timeout: 60000, // 60 second timeout for AI operations
          headers: {
            'Content-Type': 'application/json',
          },
        }),
      );

      this.logger.log(`Python API POST call successful: ${path}`);
      return response?.data;
    } catch (error) {
      // Enhanced error handling with detailed validation errors
      const statusCode = error?.response?.status;
      const errorData = error?.response?.data;
      const errorMessage = errorData?.detail || errorData?.message || error?.message || 'Unknown error';
      
      // For 422 validation errors, provide detailed field information
      if (statusCode === 422) {
        const validationDetails = errorData?.detail || [];
        const fieldErrors = Array.isArray(validationDetails) 
          ? validationDetails.map(err => `${err.loc?.join('.')} - ${err.msg}`).join(', ')
          : JSON.stringify(validationDetails);
        
        this.logger.error(
          `Python API validation error (422) on ${path}:\n` +
          `  Fields: ${fieldErrors}\n` +
          `  Payload sent: ${JSON.stringify(payload, null, 2)}`
        );
        throw new Error(
          `Python API validation failed: ${fieldErrors || errorMessage}\n` +
          `Please check that your case has a properly configured patient_simulation_config with all required fields.`
        );
      }
      
      this.logger.error(
        `Python API POST call failed (${path}): ${errorMessage}`,
      );
      throw new Error(`Python API POST call failed (${path}): ${errorMessage}`);
    }
  }
}

