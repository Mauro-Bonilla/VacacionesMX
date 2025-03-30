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
    const requests = await sql<VacationRequest[]>`
      SELECT 
        vr.user_rfc,
        vr.leave_type_id,
        lt.name as leave_type_name,
        lt.color_code,
        vr.start_date,
        vr.end_date,
        vr.end_date - vr.start_date + 1 as total_days,
        vr.status,
        vr.notes,
        vr.created_at,
        vr.approved_by,
        approver.name as approver_name,
        vr.approved_at,
        vr.anniversary_year,
        vr.balance_at_request,
        vr.rejection_reason
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

    return requests;
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
        vr.end_date - vr.start_date + 1 as total_days,
        vr.status,
        vr.notes,
        vr.created_at,
        vr.approved_by,
        approver.name as approver_name,
        vr.approved_at,
        vr.anniversary_year,
        vr.balance_at_request,
        vr.rejection_reason
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

    return request || null;
  } catch (error) {
    console.error('Error fetching request details:', error);
    throw new Error('Failed to fetch request details');
  }
};

export { fetchUserRequests, fetchRequestById };