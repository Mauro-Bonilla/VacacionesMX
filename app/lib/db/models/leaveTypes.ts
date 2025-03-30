/**
 * Interface representing a leave type in the system
 */
export interface LeaveType {
    id: string; // UUID
    name: string;
    description: string | null;
    is_paid: boolean;
    requires_approval: boolean;
    max_days_per_year: number | null;
    max_days_per_request: number | null;
    min_notice_days: number;
    color_code: string; // Hex color code
    created_at: Date;
    updated_at: Date;
  }
  
  /**
   * Interface for creating a new leave type
   */
  export interface CreateLeaveTypeInput {
    name: string;
    description?: string;
    is_paid?: boolean;
    requires_approval?: boolean;
    max_days_per_year?: number;
    max_days_per_request?: number;
    min_notice_days?: number;
    color_code?: string;
  }
  
  /**
   * Interface for updating a leave type
   */
  export interface UpdateLeaveTypeInput {
    name?: string;
    description?: string | null;
    is_paid?: boolean;
    requires_approval?: boolean;
    max_days_per_year?: number | null;
    max_days_per_request?: number | null;
    min_notice_days?: number;
    color_code?: string;
  }