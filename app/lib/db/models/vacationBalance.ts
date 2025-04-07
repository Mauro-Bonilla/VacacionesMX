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
   * Represents the fields that can be updated in a vacation balance record
   */
  export interface UpdateVacationBalanceInput {
    entitled_days?: number; // Optional decimal value for entitled days
    used_days?: number; // Optional decimal value for used days
    pending_days?: number; // Optional decimal value for pending days
    expires_at?: Date | null; // Optional expiration date or null
    period_end?: Date; // Optional end date of the vacation period
  }
  
  /**
   * Interface representing the available balance for a user
   * Summarizes the vacation balance details for a specific user
   */
  export interface UserVacationBalanceSummary {
    user_rfc: string; // User's RFC (tax ID)
    leave_type_id: string; // UUID of the leave type
    total_entitled: number; // Total entitled vacation days
    total_used: number; // Total used vacation days
    total_pending: number; // Total pending vacation days
    available: number; // Total available vacation days
  }

  /**
   * Interface representing the balance for a specific leave type
   * Provides detailed information about a leave type's vacation balance
   */
  export interface LeaveTypeBalance {
    leaveTypeId: string; // UUID of the leave type
    leaveTypeName: string; // Name of the leave type
    entitledDays: number; // Total entitled vacation days
    usedDays: number; // Total used vacation days
    pendingDays: number; // Total pending vacation days
    availableDays: number; // Total available vacation days
    periodStart: Date; // Start date of the vacation period
    periodEnd: Date; // End date of the vacation period
    expiresAt: Date | null; // Expiration date of the vacation balance or null
    colorCode: string; // Color code associated with the leave type
  }

  /**
   * Interface representing all vacation balances for a user
   * Contains a list of leave type balances for a specific user
   */
  export interface UserVacationBalances {
    userRfc: string; // User's RFC (tax ID)
    balances: LeaveTypeBalance[]; // Array of leave type balances
  }
