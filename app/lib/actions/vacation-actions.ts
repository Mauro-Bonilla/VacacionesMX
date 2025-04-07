'use server';

import { revalidatePath } from 'next/cache';
import { userMock } from '@/app/_mocks/user';
import { createVacationRequest } from '@/app/lib/db/services/create-vacation-request';
import { fetchUserVacationBalances } from '@/app/lib/db/services/get-user-vacation-balance';
import { fetchLeaveTypes, getLeaveTypeById } from '@/app/lib/db/services/get-leave-types';
import { fetchHolidaysForPeriod } from '@/app/lib/db/services/get-holidays';
import { LeaveType } from '@/app/lib/db/models/leaveTypes';
import { LeaveTypeBalance } from '@/app/lib/db/models/vacationBalance';

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
  holidays?: { date: string, description: string, type: string }[];
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
    
    return {
      success: true,
      holidays
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
    const balancesData = await fetchUserVacationBalances(userMock.rfc);
    
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
    // Convert string dates to Date objects
    const requestData = {
      leave_type_id: formData.leave_type_id,
      start_date: new Date(formData.start_date),
      end_date: new Date(formData.end_date),
      notes: formData.notes
    };
    
    // Call the service function to create the request
    const result = await createVacationRequest(requestData, userMock.rfc);
    
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