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

    const vacationBalances = await sql<VacationBalance[]>`
      SELECT *
      FROM vacation_balances
      WHERE user_rfc = ${userRfc}
        AND leave_type_id = '10a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b5c'
        AND ${currentDate} >= period_start
        AND ${currentDate} <= period_end
    `;

    if (!vacationBalances.length) {
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