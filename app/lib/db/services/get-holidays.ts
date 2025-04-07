import postgres from 'postgres';

// Initialize database connection
const sql = postgres(process.env.POSTGRES_URL!, { 
  ssl: 'require'
});

/**
 * Interface for holiday data
 */
interface Holiday {
  holiday_date: Date;
  description: string;
  type: string;
  full_day: boolean;
}

/**
 * Fetches holidays for a specific period (years range)
 * @param startYear - The starting year to fetch holidays for
 * @param endYear - The ending year to fetch holidays for (defaults to startYear)
 * @returns Array of holidays with their details
 */
export async function fetchHolidaysForPeriod(
  startYear: number,
  endYear: number = startYear
): Promise<{ date: string, description: string, type: string }[]> {
  try {
    // Get the start and end dates for the query
    const startDate = new Date(startYear, 0, 1); // January 1st of startYear
    const endDate = new Date(endYear, 11, 31); // December 31st of endYear

    const holidays = await sql<Holiday[]>`
      SELECT 
        holiday_date,
        description,
        type::text,
        full_day
      FROM 
        holidays
      WHERE 
        holiday_date BETWEEN ${startDate} AND ${endDate}
      ORDER BY 
        holiday_date
    `;

    // Format the results
    return holidays.map(holiday => ({
      date: holiday.holiday_date.toISOString().split('T')[0],
      description: holiday.description,
      type: holiday.type
    }));
  } catch (error) {
    console.error('Error fetching holidays:', error);
    return [];
  }
}

/**
 * Checks if a specific date is a holiday
 * @param date - The date to check
 * @returns Boolean indicating if the date is a holiday
 */
export async function isHoliday(date: Date): Promise<boolean> {
  try {
    const [result] = await sql<{ is_holiday: boolean }[]>`
      SELECT is_holiday(${date}::date) as is_holiday
    `;
    
    return result?.is_holiday || false;
  } catch (error) {
    console.error('Error checking if date is holiday:', error);
    return false;
  }
}