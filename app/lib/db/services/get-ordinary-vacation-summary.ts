import postgres from 'postgres';
import { getCurrentUserRfc } from '@/app/utils/get-current-user';
import { VacationBalance } from '../models/vacationBalance';
import type { VacationSummary } from '../models/vacationSummary';

const sql = postgres(process.env.POSTGRES_URL!, { ssl: 'require' });

/**
 * Fetches the current vacation summary for a user
 * @param userRfc - Optional RFC override (for admin functions)
 * @returns A vacation summary object with entitled, used, and remaining days
 */
const fetchVacationSummary = async (
  userRfc?: string, 
): Promise<VacationSummary | null> => {
  try {
    if (!userRfc) {
      const currentUserRfc = await getCurrentUserRfc();
      
      if (!currentUserRfc) {
        console.warn('fetchVacationSummary: No user RFC available');
        return null;
      }
      
      userRfc = currentUserRfc;
    }
    
    const currentDate = new Date();

    // Get the vacation balances for the user where the leave type is "Vacaciones Ordinarias"
    const vacationBalances = await sql<VacationBalance[]>`
      SELECT vb.*
      FROM vacation_balances vb
      JOIN leave_types lt ON vb.leave_type_id = lt.id
      WHERE vb.user_rfc = ${userRfc}
        AND lt.name = 'Vacaciones Ordinarias'
        AND ${currentDate} >= vb.period_start
        AND ${currentDate} <= vb.period_end
    `;

    if (!vacationBalances.length) {
      console.log(`No vacation balances found for user ${userRfc} with type "Vacaciones Ordinarias"`);
      return null;
    }

    const currentBalance = vacationBalances[0];

    const availableVacations = currentBalance.entitled_days - currentBalance.used_days;
    
    return {
      entitledDays: Math.round(currentBalance.entitled_days),
      usedDays: Math.round(currentBalance.used_days),
      remainingDays: Math.round(currentBalance.pending_days),
      periodStart: currentBalance.period_start,
      periodEnd: currentBalance.period_end,
      expiresAt: currentBalance.expires_at,
      availableVacations: Math.round(availableVacations),
    };
  } catch (error) {
    console.error('Error fetching vacation summary:', error);
    return null; 
  }
};

export { fetchVacationSummary, type VacationSummary };