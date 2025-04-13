'use server';

import { revalidatePath } from 'next/cache';
import { createVacationRequest } from '@/app/lib/db/services/create-vacation-request';
import { fetchUserVacationBalances } from '@/app/lib/db/services/get-user-vacation-balance';
import { fetchLeaveTypes, getLeaveTypeById } from '@/app/lib/db/services/get-leave-types';
import { fetchHolidaysForPeriod } from '@/app/lib/db/services/get-holidays';
import { LeaveType } from '@/app/lib/db/models/leaveTypes';
import { LeaveTypeBalance } from '@/app/lib/db/models/vacationBalance';
import { getCurrentUserRfc } from '@/app/utils/get-current-user';

/**
 * Gets all leave types from the database
 */
export async function getLeaveTypes(): Promise<{ 
  success: boolean; 
  leaveTypes?: LeaveType[]; 
  error?: string 
}> {
  try {
    const types = await fetchLeaveTypes();
    
    if (!types || types.length === 0) {
      return { 
        success: false, 
        error: 'No se encontraron tipos de ausencia' 
      };
    }
    
    return {
      success: true,
      leaveTypes: types
    };
  } catch (error) {
    console.error('Error fetching leave types:', error);
    return {
      success: false,
      error: 'Error al obtener los tipos de ausencia'
    };
  }
}

/**
 * Gets holidays for a specified period
 */
export async function getHolidaysForPeriod(
  startYear: number,
  endYear: number = startYear
): Promise<{
  success: boolean;
  holidays?: { date: string, description: string, type: string, full_day: boolean }[];
  error?: string
}> {
  try {
    const holidays = await fetchHolidaysForPeriod(startYear, endYear);
    
    if (!holidays || holidays.length === 0) {
      return {
        success: true,
        holidays: []
      };
    }
    
    // Add the full_day property to each holiday
    const holidaysWithFullDay = holidays.map(holiday => ({
      ...holiday,
      full_day: true // Assuming all holidays are full-day by default
    }));
    
    return {
      success: true,
      holidays: holidaysWithFullDay
    };
  } catch (error) {
    console.error('Error fetching holidays:', error);
    return {
      success: false,
      error: 'Error al obtener los días festivos'
    };
  }
}

/**
 * Gets holidays for a specified date range
 */
export async function getHolidaysForDateRange(
  startDate: string,
  endDate: string
): Promise<{
  success: boolean;
  holidays?: { date: string, description: string, type: string, full_day: boolean }[];
  error?: string;
  workingDays?: number;
}> {
  try {
    if (!startDate || !endDate) {
      return {
        success: false,
        error: 'Fechas no proporcionadas'
      };
    }
    
    // Convert dates to Date objects
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Validate dates
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
      return {
        success: false,
        error: 'Rango de fechas inválido'
      };
    }
    
    // For now, simulate holidays until we update the service
    const startYear = start.getFullYear();
    const endYear = end.getFullYear();
    
    // Fetch holidays from the years covered
    const holidaysResult = await getHolidaysForPeriod(
      startYear, 
      endYear === startYear ? startYear : endYear
    );
    
    if (!holidaysResult.success) {
      return holidaysResult;
    }
    
    // Filter holidays that fall within the date range
    const filteredHolidays = (holidaysResult.holidays || []).filter(holiday => {
      const holidayDate = new Date(holiday.date);
      return holidayDate >= start && holidayDate <= end;
    });
    
    // Calculate working days (excluding Sundays and holidays)
    const workingDays = await calculateWorkingDays(startDate, endDate, filteredHolidays);
    
    return {
      success: true,
      holidays: filteredHolidays,
      workingDays
    };
  } catch (error) {
    console.error('Error fetching holidays for date range:', error);
    return {
      success: false,
      error: 'Error al obtener los días festivos para el rango de fechas'
    };
  }
}

/**
 * Checks if a leave type is special (allows backdated requests)
 * This method uses the leave type's properties instead of hardcoded IDs
 */
export async function checkIfSpecialLeaveType(leaveTypeId: string): Promise<boolean> {
  try {
    // Get the leave type from the database
    const leaveType = await getLeaveTypeById(leaveTypeId);
    if (!leaveType) return false;
    
    // Define special leave types by name
    // This way it will work regardless of the UUIDs in the database
    const specialLeaveTypeNames = [
      'Incapacidad',
      'Maternidad',
      'Paternidad',
      'Fallecimiento Familiar',
      'Matrimonio'
    ];
    
    // Check if it's a special leave type by name or has min_notice_days of 0
    return specialLeaveTypeNames.includes(leaveType.name) || 
           (leaveType.min_notice_days !== null && leaveType.min_notice_days === 0);
  } catch (error) {
    console.error('Error checking if leave type is special:', error);
    // Default to false if there's an error
    return false;
  }
}

/**
 * Gets the user vacation balances using the server-side service
 */
export async function getUserVacationBalances(): Promise<{ 
  success: boolean; 
  balances?: LeaveTypeBalance[]; 
  error?: string 
}> {
  try {
    // Get the authenticated user's RFC
    const userRfc = await getCurrentUserRfc();
    
    if (!userRfc) {
      return { 
        success: false, 
        error: 'No se encontró un usuario autenticado' 
      };
    }
    
    const balancesData = await fetchUserVacationBalances(userRfc);
    
    if (!balancesData) {
      return { 
        success: false, 
        error: 'No se encontraron balances de vacaciones' 
      };
    }
    
    return {
      success: true,
      balances: balancesData.balances
    };
  } catch (error) {
    console.error('Error fetching vacation balances:', error);
    return {
      success: false,
      error: 'Error al obtener los balances de vacaciones'
    };
  }
}

/**
 * Submits a vacation request using the server-side service
 */
export async function submitVacationRequest(formData: {
  leave_type_id: string;
  start_date: string;
  end_date: string;
  notes?: string;
}): Promise<{ success: boolean; message: string }> {
  try {
    // Get the authenticated user's RFC
    const userRfc = await getCurrentUserRfc();
    
    if (!userRfc) {
      return { 
        success: false, 
        message: 'No se encontró un usuario autenticado' 
      };
    }
    
    // Convert string dates to Date objects
    const requestData = {
      leave_type_id: formData.leave_type_id,
      start_date: new Date(formData.start_date),
      end_date: new Date(formData.end_date),
      notes: formData.notes
    };
    
    // Call the service function to create the request
    const result = await createVacationRequest(requestData, userRfc);
    
    // Revalidate the dashboard path to reflect the new request
    revalidatePath('/dashboard');
    
    return result;
  } catch (error) {
    console.error('Error submitting vacation request:', error);
    return {
      success: false,
      message: 'Error al enviar la solicitud de vacaciones'
    };
  }
}

/**
 * Checks if a specific date is a weekend day that should be excluded
 * We will exclude Sundays (0)
 * This must be async since it's in a server action file
 */
export async function isWeekendDay(date: Date | string): Promise<boolean> {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const day = dateObj.getDay();
  // Return true if Sunday (0)
  return day === 0;
}

/**
 * Check if a date is a holiday
 */
export async function isHoliday(date: string, holidays: any[]): Promise<boolean> {
  const dateStr = new Date(date).toISOString().split('T')[0];
  return holidays.some(h => h.date === dateStr);
}

/**
 * Calculate working days (excluding weekends and holidays) between two dates
 * This is a server-side calculation that must be async
 */
export async function calculateWorkingDays(
  startDate: string, 
  endDate: string, 
  holidays: { date: string }[] = []
): Promise<number> {
  if (!startDate || !endDate) return 0;
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  // Validate dates
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
    return 0;
  }
  
  let workingDays = 0;
  const current = new Date(start);
  
  // Convert holiday dates to a simple format for quick lookup
  const holidayDates = new Set(holidays.map(h => h.date));
  
  while (current <= end) {
    // Skip Sundays (0) and holidays
    const currentDateStr = current.toISOString().split('T')[0];
    if (current.getDay() !== 0 && !holidayDates.has(currentDateStr)) {
      workingDays++;
    }
    
    // Move to next day
    current.setDate(current.getDate() + 1);
  }
  
  return workingDays;
}