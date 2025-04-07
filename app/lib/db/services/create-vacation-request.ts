import postgres from 'postgres';

const sql = postgres(process.env.POSTGRES_URL!, { ssl: 'require' });

interface VacationRequestData {
  leave_type_id: string;
  start_date: Date;
  end_date: Date;
  notes?: string;
}

/**
 * Creates a new vacation request in the database
 * @param requestData - The vacation request data
 * @param userRfc - The RFC of the user making the request
 * @returns Object indicating success/failure and a message
 */
export async function createVacationRequest(
  requestData: VacationRequestData,
  userRfc: string
): Promise<{ success: boolean; message: string }> {
  try {
    // Validate request data
    if (!requestData.leave_type_id || !requestData.start_date || !requestData.end_date) {
      return {
        success: false,
        message: 'Datos de solicitud incompletos'
      };
    }

    // Calculate start and end dates in the correct format
    const startDate = new Date(requestData.start_date);
    const endDate = new Date(requestData.end_date);

    // Insert the vacation request
    await sql`
      INSERT INTO vacation_requests (
        user_rfc,
        leave_type_id,
        start_date,
        end_date,
        status,
        notes
      ) VALUES (
        ${userRfc},
        ${requestData.leave_type_id},
        ${startDate},
        ${endDate},
        ${'PENDING'},
        ${requestData.notes || null}
      )
    `;

    return {
      success: true,
      message: 'Solicitud creada exitosamente'
    };
  } catch (error: any) {
    console.error('Error creating vacation request:', error);

    // Handle unique constraint violations
    if (error.code === '23505') {
      return {
        success: false,
        message: 'Ya existe una solicitud para este período'
      };
    }

    // Handle foreign key violations
    if (error.code === '23503') {
      return {
        success: false,
        message: 'Tipo de ausencia inválido o usuario no encontrado'
      };
    }

    return {
      success: false,
      message: 'Error al crear la solicitud: ' + (error.message || 'Error desconocido')
    };
  }
}