// src/app/lib/db/services/get-leave-types.ts
import postgres from 'postgres';
import { LeaveType } from '../models/leaveTypes';

const sql = postgres(process.env.POSTGRES_URL!, { ssl: 'require' });

// Special leave types that allow backdated requests or have special handling
const SPECIAL_LEAVE_TYPES = [
  '20a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b5c', // Incapacidad
  '30a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b5c', // Maternidad
  '40a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b5c', // Paternidad
  '50a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b5c', // Fallecimiento Familiar
  '60a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b5c', // Matrimonio
];

/**
 * Fetches all leave types from the database
 * @returns Array of LeaveType objects
 */
export async function fetchLeaveTypes(): Promise<LeaveType[]> {
  try {
    const leaveTypes = await sql<LeaveType[]>`
      SELECT *
      FROM leave_types
      ORDER BY name DESC
    `;
    
    return leaveTypes;
  } catch (error) {
    console.error('Error fetching leave types:', error);
    return [];
  }
}

/**
 * Checks if a leave type is special (allows backdated requests or has special handling)
 * @param leaveTypeId - ID of the leave type
 * @returns Boolean indicating if the leave type is special
 */
export function isSpecialLeaveType(leaveTypeId: string): boolean {
  return SPECIAL_LEAVE_TYPES.includes(leaveTypeId);
}

/**
 * Gets a leave type by its ID
 * @param leaveTypeId - ID of the leave type
 * @returns The leave type or null if not found
 */
export async function getLeaveTypeById(leaveTypeId: string): Promise<LeaveType | null> {
  try {
    const leaveTypes = await sql<LeaveType[]>`
      SELECT *
      FROM leave_types
      WHERE id = ${leaveTypeId}
      LIMIT 1
    `;
    
    return leaveTypes.length > 0 ? leaveTypes[0] : null;
  } catch (error) {
    console.error(`Error fetching leave type with ID ${leaveTypeId}:`, error);
    return null;
  }
}

/**
 * Gets all leave types for a specific user, considering their permissions
 * @param userRfc - The RFC of the user
 * @returns Array of LeaveType objects available to the user
 */
export async function getLeaveTypesForUser(userRfc: string): Promise<LeaveType[]> {
  try {
    // You can add user-specific filtering logic here if needed
    // For now, we'll just return all leave types
    return fetchLeaveTypes();
  } catch (error) {
    console.error(`Error fetching leave types for user ${userRfc}:`, error);
    return [];
  }
}