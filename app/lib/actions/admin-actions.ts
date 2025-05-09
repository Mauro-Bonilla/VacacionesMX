'use server';

import { revalidatePath } from 'next/cache';
import { getCurrentUserRfc } from '@/app/utils/get-current-user';
import postgres from 'postgres';

const sql = postgres(process.env.POSTGRES_URL!, { ssl: 'require' });

/**
 * Fetch all pending vacation requests for admin approval
 * @returns Array of vacation requests with user details
 */
export async function fetchPendingVacationRequests() {
  try {
    // Get current user RFC
    const userRfc = await getCurrentUserRfc();
    
    if (!userRfc) {
      return {
        success: false,
        message: 'Usuario no autenticado',
        requests: []
      };
    }

    // Check if user is admin
    const [user] = await sql`
      SELECT is_admin FROM users WHERE rfc = ${userRfc}
    `;

    if (!user || !user.is_admin) {
      return {
        success: false,
        message: 'No tienes permisos para ver esta información',
        requests: []
      };
    }

    // Fetch all pending requests with user and leave type details
    const requests = await sql`
      SELECT 
        vr.id,
        vr.user_rfc,
        u.name as user_name,
        u.department_id,
        d.name as department_name,
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
        vr.anniversary_year,
        vr.balance_at_request
      FROM 
        vacation_requests vr
      JOIN 
        users u ON vr.user_rfc = u.rfc
      JOIN 
        leave_types lt ON vr.leave_type_id = lt.id
      JOIN 
        departments d ON u.department_id = d.id
      WHERE 
        vr.status = 'PENDING'
      ORDER BY 
        vr.created_at DESC
    `;

    return {
      success: true,
      message: 'Solicitudes cargadas exitosamente',
      requests
    };
  } catch (error) {
    console.error('Error fetching pending vacation requests:', error);
    return {
      success: false,
      message: 'Error al cargar las solicitudes',
      requests: []
    };
  }
}

/**
 * Approves a vacation request
 * @param requestId The ID of the request to approve
 * @returns Object indicating success or failure with a message
 */
export async function approveVacationRequest(requestId: string): Promise<{ 
  success: boolean; 
  message: string 
}> {
  try {
    // Get current user RFC
    const adminRfc = await getCurrentUserRfc();
    
    if (!adminRfc) {
      return {
        success: false,
        message: 'Usuario no autenticado'
      };
    }

    // Check if user is admin
    const [user] = await sql`
      SELECT is_admin FROM users WHERE rfc = ${adminRfc}
    `;

    if (!user || !user.is_admin) {
      return {
        success: false,
        message: 'No tienes permisos para aprobar solicitudes'
      };
    }

    // Check if the request exists and is in PENDING status
    const [request] = await sql`
      SELECT id, status 
      FROM vacation_requests 
      WHERE id = ${requestId}
    `;

    if (!request) {
      return {
        success: false,
        message: 'Solicitud no encontrada'
      };
    }

    if (request.status !== 'PENDING') {
      return {
        success: false,
        message: 'La solicitud ya no está pendiente de aprobación'
      };
    }

    // Update the request status to APPROVED
    await sql`
      UPDATE vacation_requests 
      SET 
        status = 'APPROVED', 
        approved_by = ${adminRfc}, 
        approved_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP 
      WHERE id = ${requestId}
    `;

    // Revalidate the dashboard page to reflect changes
    revalidatePath('/dashboard/admin');
    revalidatePath('/dashboard');

    return {
      success: true,
      message: 'Solicitud aprobada exitosamente'
    };
  } catch (error) {
    console.error('Error approving vacation request:', error);
    return {
      success: false,
      message: 'Error al aprobar la solicitud'
    };
  }
}

/**
 * Rejects a vacation request
 * @param requestId The ID of the request to reject
 * @param rejectionReason The reason for rejection
 * @returns Object indicating success or failure with a message
 */
export async function rejectVacationRequest(
  requestId: string, 
  rejectionReason: string
): Promise<{ 
  success: boolean; 
  message: string 
}> {
  try {
    // Get current user RFC
    const adminRfc = await getCurrentUserRfc();
    
    if (!adminRfc) {
      return {
        success: false,
        message: 'Usuario no autenticado'
      };
    }

    // Check if user is admin
    const [user] = await sql`
      SELECT is_admin FROM users WHERE rfc = ${adminRfc}
    `;

    if (!user || !user.is_admin) {
      return {
        success: false,
        message: 'No tienes permisos para rechazar solicitudes'
      };
    }

    // Validate rejection reason
    if (!rejectionReason || rejectionReason.trim() === '') {
      return {
        success: false,
        message: 'Debes proporcionar un motivo de rechazo'
      };
    }

    // Check if the request exists and is in PENDING status
    const [request] = await sql`
      SELECT id, status 
      FROM vacation_requests 
      WHERE id = ${requestId}
    `;

    if (!request) {
      return {
        success: false,
        message: 'Solicitud no encontrada'
      };
    }

    if (request.status !== 'PENDING') {
      return {
        success: false,
        message: 'La solicitud ya no está pendiente de aprobación'
      };
    }

    // Update the request status to REJECTED
    await sql`
      UPDATE vacation_requests 
      SET 
        status = 'REJECTED', 
        approved_by = ${adminRfc}, 
        approved_at = CURRENT_TIMESTAMP,
        rejection_reason = ${rejectionReason},
        updated_at = CURRENT_TIMESTAMP 
      WHERE id = ${requestId}
    `;

    // Revalidate the dashboard page to reflect changes
    revalidatePath('/dashboard/admin');
    revalidatePath('/dashboard');

    return {
      success: true,
      message: 'Solicitud rechazada exitosamente'
    };
  } catch (error) {
    console.error('Error rejecting vacation request:', error);
    return {
      success: false,
      message: 'Error al rechazar la solicitud'
    };
  }
}

/**
 * Fetch request details by ID
 * @param requestId The ID of the request to fetch
 * @returns The request details with user and leave type information
 */
export async function fetchRequestDetails(requestId: string) {
  try {
    // Get current user RFC
    const userRfc = await getCurrentUserRfc();
    
    if (!userRfc) {
      return {
        success: false,
        message: 'Usuario no autenticado',
        request: null
      };
    }

    // Check if user is admin
    const [user] = await sql`
      SELECT is_admin FROM users WHERE rfc = ${userRfc}
    `;

    if (!user || !user.is_admin) {
      return {
        success: false,
        message: 'No tienes permisos para ver esta información',
        request: null
      };
    }

    // Fetch request details
    const [request] = await sql`
      SELECT 
        vr.id,
        vr.user_rfc,
        u.name as user_name,
        u.email as user_email,
        u.hire_date,
        d.name as department_name,
        vr.leave_type_id,
        lt.name as leave_type_name,
        lt.color_code,
        lt.is_paid,
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
        users u ON vr.user_rfc = u.rfc
      JOIN 
        leave_types lt ON vr.leave_type_id = lt.id
      JOIN 
        departments d ON u.department_id = d.id
      LEFT JOIN
        users approver ON vr.approved_by = approver.rfc
      WHERE 
        vr.id = ${requestId}
    `;

    if (!request) {
      return {
        success: false,
        message: 'Solicitud no encontrada',
        request: null
      };
    }

    // Format dates consistently
    const formattedRequest = {
      ...request,
      start_date_string: request.start_date.toISOString().split('T')[0],
      end_date_string: request.end_date.toISOString().split('T')[0],
      hire_date_string: request.hire_date.toISOString().split('T')[0],
      created_at_string: request.created_at.toISOString(),
      approved_at_string: request.approved_at ? request.approved_at.toISOString() : null
    };

    return {
      success: true,
      message: 'Detalles de solicitud cargados exitosamente',
      request: formattedRequest
    };
  } catch (error) {
    console.error('Error fetching request details:', error);
    return {
      success: false,
      message: 'Error al cargar los detalles de la solicitud',
      request: null
    };
  }
}