import postgres from 'postgres';
import { getCurrentUserRfc } from '@/app/utils/get-current-user';
import { VacationRequest, DayDetails } from '../models/requestTypes';
import { format } from 'date-fns';

// Initialize database connection
const sql = postgres(process.env.POSTGRES_URL!, { 
  ssl: 'require'
});

/**
 * Ensures a date string is preserved exactly as stored in the database
 * regardless of the local timezone
 * 
 * @param dateStr - Date string from database (YYYY-MM-DD)
 * @returns A Date object that will display the same date in any timezone
 */
const preserveDatabaseDate = (dateStr: string | Date): Date => {
  // If it's already a Date object, get its ISO string date part
  const dateString = dateStr instanceof Date 
    ? dateStr.toISOString().split('T')[0]
    : String(dateStr).split('T')[0];
  
  // Add noon UTC time to ensure the date is preserved in any timezone
  // This is crucial - by using noon UTC, we ensure the date won't change
  // even with timezone differences of up to ±12 hours
  return new Date(`${dateString}T12:00:00Z`);
};

/**
 * Formats a date as YYYY-MM-DD, preserving the exact date from database
 * 
 * @param date - Date value from database
 * @returns Formatted date string YYYY-MM-DD
 */
export const formatRequestDate = (date: Date | string): string => {
  if (!date) return '';
  
  // Convert to a timezone-safe Date object first
  const safeDate = preserveDatabaseDate(date);
  // Extract just the date part
  return safeDate.toISOString().split('T')[0];
};

/**
 * Process a request from database to ensure consistent date handling
 * across timezones
 * 
 * @param request - Raw request from database
 * @returns Processed request with timezone-safe dates
 */
const processRequestDates = <T extends {start_date: any, end_date: any}>(request: T): T => {
  if (!request) return request;
  
  // Create safe versions of dates that won't change with timezone
  const safeStartDate = preserveDatabaseDate(request.start_date);
  const safeEndDate = preserveDatabaseDate(request.end_date);
  
  // Store both the properly preserved Date objects and their string representations
  return {
    ...request,
    // Keep string representation for display (YYYY-MM-DD)
    start_date_string: formatRequestDate(request.start_date),
    end_date_string: formatRequestDate(request.end_date),
    // Replace Date objects with timezone-safe versions
    start_date: safeStartDate,
    end_date: safeEndDate,
  } as T;
};

/**
 * Fetches all vacation requests for the authenticated user
 * @param userRfc - Optional RFC override (for admin functions)
 * @returns Array of vacation requests with leave type details
 */
const fetchUserRequests = async (
  userRfc?: string,
): Promise<VacationRequest[]> => {
  try {
    // Get authenticated user RFC if not provided
    if (!userRfc) {
      const currentUserRfc = await getCurrentUserRfc();
      
      if (!currentUserRfc) {
        console.warn('fetchUserRequests: No user RFC available');
        return []; // Return empty array instead of throwing
      }
      
      userRfc = currentUserRfc;
    }

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

    // Process each request to fix timezone issues
    return requests.map(processRequestDates);
  } catch (error) {
    console.error('Error fetching user requests:', error);
    return []; // Return empty array instead of throwing
  }
};

/**
 * Fetches a single vacation request by ID
 * @param requestId - UUID of the request
 * @param userRfc - Optional RFC override (for admin functions)
 * @returns The vacation request or null if not found
 */
const fetchRequestById = async (
  requestId: string,
  userRfc?: string,
): Promise<VacationRequest | null> => {
  try {
    // Get authenticated user RFC if not provided
    if (!userRfc) {
      const currentUserRfc = await getCurrentUserRfc();
      
      if (!currentUserRfc) {
        console.warn('fetchRequestById: No user RFC available');
        return null;
      }
      
      userRfc = currentUserRfc;
    }

    const [request] = await sql<(VacationRequest & { day_details?: DayDetails })[]>`
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

    // Log raw data for debugging
    console.log('Raw request from DB:', {
      id: request.id,
      start_date: String(request.start_date),
      end_date: String(request.end_date)
    });
    
    // Process to fix timezone issues
    return processRequestDates(request);
  } catch (error) {
    console.error('Error fetching request details:', error);
    return null; // Return null instead of throwing
  }
};

/**
 * Get a display-friendly date range string
 * @param startDate - Start date
 * @param endDate - End date
 * @returns Formatted date range string
 */
export const getDateRangeString = (startDate: Date, endDate: Date): string => {
  // Format dates in a consistent way that matches the database dates
  const start = formatRequestDate(startDate);
  const end = formatRequestDate(endDate);
  
  // Format them nicely for display
  const formatDisplay = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-');
    const date = new Date(`${year}-${month}-${day}T12:00:00Z`);
    return format(date, 'MMM dd, yyyy');
  };
  
  return `${formatDisplay(start)} - ${formatDisplay(end)}`;
};

/**
 * Debug function to test date handling
 */
export const debugDates = (dateStr: string): any => {
  const jsDate = new Date(dateStr);
  const preserved = preserveDatabaseDate(dateStr);
  
  return {
    original: dateStr,
    jsDate: jsDate.toString(),
    jsDateISO: jsDate.toISOString(),
    preserved: preserved.toString(),
    preservedISO: preserved.toISOString(),
    preservedFormatted: formatRequestDate(dateStr)
  };
};

export { fetchUserRequests, fetchRequestById };