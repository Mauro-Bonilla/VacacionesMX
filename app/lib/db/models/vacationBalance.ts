/**
 * Interface representing a vacation balance record
 */
export interface VacationBalance {
    id: string; // UUID
    user_rfc: string;
    leave_type_id: string; // UUID
    applicable_year: number;
    anniversary_year: number;
    period_start: Date;
    period_end: Date;
    entitled_days: number; // Decimal
    used_days: number; // Decimal
    pending_days: number; // Decimal
    expires_at: Date | null;
    created_at: Date;
    updated_at: Date;
  }
  
  /**
   * Interface for creating a new vacation balance
   */
  export interface CreateVacationBalanceInput {
    user_rfc: string;
    leave_type_id: string;
    applicable_year: number;
    anniversary_year: number;
    period_start: Date;
    period_end: Date;
    entitled_days: number;
    used_days?: number;
    pending_days?: number;
    expires_at?: Date;
  }
  
  /**
   * Interface for updating a vacation balance
   */
  export interface UpdateVacationBalanceInput {
    entitled_days?: number;
    used_days?: number;
    pending_days?: number;
    expires_at?: Date | null;
    period_end?: Date;
  }
  
  /**
   * Interface representing the available balance for a user
   */
  export interface UserVacationBalanceSummary {
    user_rfc: string;
    leave_type_id: string;
    total_entitled: number;
    total_used: number;
    total_pending: number;
    available: number;
  }