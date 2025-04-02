import postgres from 'postgres';
import { userMock } from '../../../_mocks/user';
import { VacationRequest } from '../models/requestTypes';

const sql = postgres(process.env.POSTGRES_URL!, { ssl: 'require' });

/**
 * Fetches all vacation requests for a specific user
 * @param userRfc - The RFC (tax ID) of the user
 * @returns Array of vacation requests with leave type details
 */
const fetchUserRequests = async (
  userRfc: string = userMock.rfc,
): Promise<VacationRequest[]> => {
  try {
    // Modified query to correctly handle dates
    const requests = await sql<VacationRequest[]>`
      SELECT 
        vr.id,
        vr.user_rfc,
        vr.leave_type_id,
        lt.name as leave_type_name,
        lt.color_code,
        vr.start_date,
        vr.end_date,
        vr.end_date - vr.start_date + 1 as calendar_days,
        count_vacation_days(vr.start_date, vr.end_date) as total_days,
        vr.status,
        vr.notes,
        vr.created_at,
        vr.approved_by,
        approver.name as approver_name,
        vr.approved_at,
        vr.anniversary_year,
        vr.balance_at_request,
        vr.rejection_reason,
        -- Add additional details about the day count
        (
          SELECT jsonb_build_object(
            'calendar_days', vr.end_date - vr.start_date + 1,
            'working_days', count_vacation_days(vr.start_date, vr.end_date),
            'weekends', (
              SELECT COUNT(*) FROM generate_series(vr.start_date, vr.end_date, '1 day'::interval) d
              WHERE EXTRACT(DOW FROM d) IN (0, 6)
            ),
            'holidays', (
              SELECT COUNT(*) FROM generate_series(vr.start_date, vr.end_date, '1 day'::interval) d
              WHERE is_holiday(d::date) AND NOT (EXTRACT(DOW FROM d) IN (0, 6))
            )
          )
        ) as day_details
      FROM 
        vacation_requests vr
      JOIN 
        leave_types lt ON vr.leave_type_id = lt.id
      LEFT JOIN
        users approver ON vr.approved_by = approver.rfc
      WHERE 
        vr.user_rfc = ${userRfc}
      ORDER BY 
        vr.created_at DESC
    `;

    // Process dates to ensure they're correct
    return requests.map(request => ({
      ...request,
      // Ensure date objects are properly formatted
      start_date: new Date(request.start_date),
      end_date: new Date(request.end_date),
    }));
  } catch (error) {
    console.error('Error fetching user requests:', error);
    throw new Error('Failed to fetch user requests');
  }
};

/**
 * Fetches a single vacation request by ID
 * @param requestId - UUID of the request
 * @returns The vacation request or null if not found
 */
const fetchRequestById = async (
  requestId: string,
  userRfc: string = userMock.rfc,
): Promise<VacationRequest | null> => {
  try {
    const [request] = await sql<VacationRequest[]>`
      SELECT 
        vr.id,
        vr.user_rfc,
        vr.leave_type_id,
        lt.name as leave_type_name,
        lt.color_code,
        vr.start_date,
        vr.end_date,
        vr.end_date - vr.start_date + 1 as calendar_days,
        count_vacation_days(vr.start_date, vr.end_date) as total_days,
        vr.status,
        vr.notes,
        vr.created_at,
        vr.approved_by,
        approver.name as approver_name,
        vr.approved_at,
        vr.anniversary_year,
        vr.balance_at_request,
        vr.rejection_reason,
        -- Add additional details about the day count
        (
          SELECT jsonb_build_object(
            'calendar_days', vr.end_date - vr.start_date + 1,
            'working_days', count_vacation_days(vr.start_date, vr.end_date),
            'weekends', (
              SELECT COUNT(*) FROM generate_series(vr.start_date, vr.end_date, '1 day'::interval) d
              WHERE EXTRACT(DOW FROM d) IN (0, 6)
            ),
            'holidays', (
              SELECT COUNT(*) FROM generate_series(vr.start_date, vr.end_date, '1 day'::interval) d
              WHERE is_holiday(d::date) AND NOT (EXTRACT(DOW FROM d) IN (0, 6))
            )
          )
        ) as day_details
      FROM 
        vacation_requests vr
      JOIN 
        leave_types lt ON vr.leave_type_id = lt.id
      LEFT JOIN
        users approver ON vr.approved_by = approver.rfc
      WHERE 
        vr.id = ${requestId}
        AND vr.user_rfc = ${userRfc}
    `;

    if (!request) return null;
    
    return {
      ...request,
      // Ensure date objects are properly formatted
      start_date: new Date(request.start_date),
      end_date: new Date(request.end_date),
    };
  } catch (error) {
    console.error('Error fetching request details:', error);
    throw new Error('Failed to fetch request details');
  }
};

// Helper function to format dates for display
export const formatRequestDate = (date: Date): string => {
  // Ensure we're working with a proper date object
  const d = new Date(date);
  // Format as YYYY-MM-DD for consistent display
  return d.toISOString().split('T')[0];
};

export { fetchUserRequests, fetchRequestById };