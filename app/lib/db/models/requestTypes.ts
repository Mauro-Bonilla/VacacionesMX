/**
 * Represents the possible statuses for a vacation request
 */
export type RequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

/**
 * Interface for day counting details
 */
export interface DayDetails {
  calendar_days: number;
  working_days: number;
  weekends: number;
  holidays: number;
}

/**
 * Interface representing a vacation request with its details
 */
export interface VacationRequest {
  id: string;
  user_rfc: string;
  leave_type_id: string;
  leave_type_name?: string;
  color_code?: string;
  start_date: Date;
  end_date: Date;
  // String representations for consistent display
  start_date_string?: string;
  end_date_string?: string;
  total_days: number;
  calendar_days?: number;
  status: RequestStatus;
  notes: string | null;
  created_at: Date;
  approved_by: string | null;
  approver_name?: string | null;
  approved_at: Date | null;
  anniversary_year: number | null;
  balance_at_request: number | null;
  rejection_reason: string | null;
  day_details?: DayDetails;
}

/**
 * Interface for creating a new vacation request
 */
export interface CreateVacationRequestInput {
  leave_type_id: string;
  start_date: Date;
  end_date: Date;
  notes?: string;
  anniversary_year?: number;
}

/**
 * Interface for updating an existing vacation request
 */
export interface UpdateVacationRequestInput {
  id: string;
  leave_type_id?: string;
  start_date?: Date;
  end_date?: Date;
  status?: RequestStatus;
  notes?: string;
  rejection_reason?: string;
}