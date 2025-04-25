'use server';

import { revalidatePath } from 'next/cache';
import { getCurrentUserRfc } from '@/app/utils/get-current-user';
import postgres from 'postgres';

const sql = postgres(process.env.POSTGRES_URL!, { ssl: 'require' });

/**
 * Cancels a vacation request
 * @param requestId The ID of the request to cancel
 * @returns Object indicating success or failure with a message
 */
export async function cancelVacationRequest(requestId: string): Promise<{ 
  success: boolean; 
  message: string 
}> {
  try {
    // Get current user RFC
    const userRfc = await getCurrentUserRfc();
    
    if (!userRfc) {
      return {
        success: false,
        message: 'Usuario no autenticado'
      };
    }

    // First check if the request exists and belongs to the user
    const request = await sql`
      SELECT id, status, user_rfc 
      FROM vacation_requests 
      WHERE id = ${requestId} AND user_rfc = ${userRfc}
    `;

    if (request.length === 0) {
      return {
        success: false,
        message: 'Solicitud no encontrada o no pertenece al usuario'
      };
    }

    // Check if the request is already cancelled or rejected
    if (request[0].status === 'CANCELLED') {
      return {
        success: false,
        message: 'La solicitud ya está cancelada'
      };
    }

    if (request[0].status === 'REJECTED') {
      return {
        success: false,
        message: 'No se puede cancelar una solicitud rechazada'
      };
    }

    // Update the request status to CANCELLED
    await sql`
      UPDATE vacation_requests 
      SET status = 'CANCELLED', updated_at = CURRENT_TIMESTAMP 
      WHERE id = ${requestId} AND user_rfc = ${userRfc}
    `;

    // Revalidate the dashboard page to reflect changes
    revalidatePath('/dashboard');

    return {
      success: true,
      message: 'Solicitud cancelada exitosamente'
    };
  } catch (error) {
    console.error('Error cancelling vacation request:', error);
    return {
      success: false,
      message: 'Error al cancelar la solicitud'
    };
  }
}