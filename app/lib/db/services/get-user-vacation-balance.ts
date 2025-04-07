import postgres from 'postgres';
import { userMock } from '../../../_mocks/user';
import { VacationBalance, LeaveTypeBalance, UserVacationBalances } from '../models/vacationBalance';

const sql = postgres(process.env.POSTGRES_URL!, { ssl: 'require' });

/**
 * Fetches all vacation balances for a user across all leave types
 * @param userRfc - The RFC (tax ID) of the user
 * @returns Object containing vacation balances for each leave type
 */
export async function fetchUserVacationBalances(
  userRfc: string = userMock.rfc
): Promise<UserVacationBalances | null> {
  try {
    const currentDate = new Date();

    // Join vacation_balances with leave_types to get leave type details
    const balances = await sql<(VacationBalance & { 
      leave_type_name: string;
      color_code: string;
    })[]>`
      SELECT 
        vb.*,
        lt.name as leave_type_name,
        lt.color_code
      FROM 
        vacation_balances vb
      JOIN 
        leave_types lt ON vb.leave_type_id = lt.id
      WHERE 
        vb.user_rfc = ${userRfc}
        AND ${currentDate} >= vb.period_start
        AND ${currentDate} <= vb.period_end
      ORDER BY 
        vb.leave_type_id
    `;

    if (!balances.length) {
      return null;
    }

    // Format the response
    const formattedBalances: LeaveTypeBalance[] = balances.map(balance => {
      const availableDays = balance.entitled_days - balance.used_days - balance.pending_days;
      
      return {
        leaveTypeId: balance.leave_type_id,
        leaveTypeName: balance.leave_type_name,
        entitledDays: Math.round(balance.entitled_days),
        usedDays: Math.round(balance.used_days),
        pendingDays: Math.round(balance.pending_days),
        availableDays: Math.round(availableDays),
        periodStart: balance.period_start,
        periodEnd: balance.period_end,
        expiresAt: balance.expires_at,
        colorCode: balance.color_code
      };
    });

    return {
      userRfc,
      balances: formattedBalances
    };
  } catch (error) {
    console.error('Error fetching vacation balances:', error);
    return null;
  }
}

/**
 * Gets the balance for a specific leave type
 * @param leaveTypeId - ID of the leave type
 * @param userRfc - The RFC (tax ID) of the user
 * @returns The leave balance or null if not found
 */
export async function getLeaveTypeBalance(
  leaveTypeId: string,
  userRfc: string = userMock.rfc
): Promise<LeaveTypeBalance | null> {
  const allBalances = await fetchUserVacationBalances(userRfc);
  
  if (!allBalances) {
    return null;
  }
  
  const balance = allBalances.balances.find(b => b.leaveTypeId === leaveTypeId);
  return balance || null;
}

/**
 * For backward compatibility with existing code
 * Fetches the ordinary vacation summary (similar to previous implementation)
 */
export async function fetchVacationSummary(
  userRfc: string = userMock.rfc
): Promise<any | null> {
  const ordinaryVacationId = '10a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b5c';
  const balance = await getLeaveTypeBalance(ordinaryVacationId, userRfc);
  
  if (!balance) {
    return null;
  }
  
  // Map to the original format for backward compatibility
  return {
    entitledDays: balance.entitledDays,
    usedDays: balance.usedDays,
    remainingDays: balance.pendingDays,
    periodStart: balance.periodStart,
    periodEnd: balance.periodEnd,
    expiresAt: balance.expiresAt,
    availableVacations: balance.availableDays,
  };
}