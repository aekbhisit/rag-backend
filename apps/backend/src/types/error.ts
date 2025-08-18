export interface ErrorResponse {
  error_code: string;
  message: string;
  details?: Record<string, any>;
  fallback_answer?: string;
  suggested_actions?: string[];
  escalation_required: boolean;
  timestamp: string;
  request_id: string;
}


