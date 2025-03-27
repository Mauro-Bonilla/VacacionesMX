// lib/placeholder-data.ts
import { randomUUID } from 'crypto';

// Department Data
export const departments = [
  {
    id: '2bce0d8a-e0b8-4b6e-9dab-a92e8d7e0307',
    name: 'Administración',
  },
  {
    id: 'f85a2838-b01f-4240-bcb0-78f5a0093af4',
    name: 'Operaciones',
  },
];

// User Data
export const users = [
  {
    rfc: 'MEGS801205ABC',
    name: 'Ana Sánchez',
    email: 'ana.sanchez@company.mx',
    password: 'password123',
    hire_date: '2018-03-15',
    department_id: '2bce0d8a-e0b8-4b6e-9dab-a92e8d7e0307',
    is_admin: true,
    is_active: true
  },
  {
    rfc: 'RODJ870612XYZ',
    name: 'Juan Rodríguez',
    email: 'juan.rodriguez@company.mx',
    password: 'securepass456',
    hire_date: '2019-05-20',
    department_id: 'f85a2838-b01f-4240-bcb0-78f5a0093af4',
    is_admin: false,
    is_active: true
  },
  {
    rfc: 'GARL780924DEF',
    name: 'Luisa García',
    email: 'luisa.garcia@company.mx',
    password: 'luisa2023!',
    hire_date: '2020-01-10',
    department_id: 'f85a2838-b01f-4240-bcb0-78f5a0093af4',
    is_admin: false,
    is_active: true
  },
  {
    rfc: 'MAPC910305GHI',
    name: 'Carlos Martínez',
    email: 'carlos.martinez@company.mx',
    password: 'carlos123$',
    hire_date: '2021-08-01',
    department_id: '2bce0d8a-e0b8-4b6e-9dab-a92e8d7e0307',
    is_admin: false,
    is_active: true
  },
  {
    rfc: 'LOPR841117JKL',
    name: 'Patricia López',
    email: 'patricia.lopez@company.mx',
    password: 'patricia456!',
    hire_date: '2022-02-15',
    department_id: 'f85a2838-b01f-4240-bcb0-78f5a0093af4',
    is_admin: false,
    is_active: true
  },
  {
    rfc: 'FERF790628MNO',
    name: 'Roberto Fernández',
    email: 'roberto.fernandez@company.mx',
    password: 'roberto789#',
    hire_date: '2016-06-22',
    department_id: '2bce0d8a-e0b8-4b6e-9dab-a92e8d7e0307',
    is_admin: true,
    is_active: true
  },
  {
    rfc: 'DIAZ850714PQR',
    name: 'María Díaz',
    email: 'maria.diaz@company.mx',
    password: 'maria2023*',
    hire_date: '2023-01-05',
    department_id: 'f85a2838-b01f-4240-bcb0-78f5a0093af4',
    is_admin: false,
    is_active: false
  }
];

// Leave Types
export const leaveTypes = [
  {
    id: '3a7ec80a-d5d4-4f4a-a867-d9e438423347',
    name: 'Vacaciones Ordinarias',
    description: 'Periodo vacacional ordinario según la antigüedad del empleado',
    is_paid: true,
    requires_approval: true,
    max_days_per_year: null,
    max_days_per_request: 10,
    min_notice_days: 5,
    color_code: '#4CAF50'
  },
  {
    id: 'e64f2f7c-a592-4b3f-8c44-37a9f3e1ec38',
    name: 'Incapacidad',
    description: 'Ausencia por enfermedad o accidente con justificante médico',
    is_paid: true,
    requires_approval: true,
    max_days_per_year: 365,
    max_days_per_request: 30,
    min_notice_days: 0,
    color_code: '#F44336'
  },
  {
    id: '7bfd4f98-c678-4e2c-8b90-d9d6d7a76634',
    name: 'Fallecimiento Familiar',
    description: 'Permiso por fallecimiento de familiar directo',
    is_paid: true,
    requires_approval: true,
    max_days_per_year: 5,
    max_days_per_request: 5,
    min_notice_days: 0,
    color_code: '#9C27B0'
  },
  {
    id: '9d6e16e6-79e0-4a12-856d-64dbb8f45edd',
    name: 'Permiso Sin Goce',
    description: 'Permiso sin goce de sueldo',
    is_paid: false,
    requires_approval: true,
    max_days_per_year: 30,
    max_days_per_request: 10,
    min_notice_days: 5,
    color_code: '#FF9800'
  },
  {
    id: 'bd3dbb12-b51d-4ab5-a518-55b3f1b2d310',
    name: 'Matrimonio',
    description: 'Permiso por contraer matrimonio',
    is_paid: true,
    requires_approval: true,
    max_days_per_year: 5,
    max_days_per_request: 5,
    min_notice_days: 15,
    color_code: '#2196F3'
  },
  {
    id: 'c12d9e5a-1d3b-4a73-a9a3-a55ede9cc24a',
    name: 'Maternidad',
    description: 'Licencia por maternidad',
    is_paid: true,
    requires_approval: true,
    max_days_per_year: 84,
    max_days_per_request: 84,
    min_notice_days: 30,
    color_code: '#E91E63'
  },
  {
    id: 'e1f22b7a-8e65-4c59-8f28-48d8d7c87d16',
    name: 'Paternidad',
    description: 'Licencia por paternidad',
    is_paid: true,
    requires_approval: true,
    max_days_per_year: 5,
    max_days_per_request: 5,
    min_notice_days: 5,
    color_code: '#3F51B5'
  }
];

// Sample vacation requests
export const vacationRequests = [
  {
    id: randomUUID(),
    user_rfc: 'MEGS801205ABC',
    leave_type_id: '3a7ec80a-d5d4-4f4a-a867-d9e438423347', // Vacaciones Ordinarias
    start_date: '2024-07-15',
    end_date: '2024-07-26',
    total_days: 10,
    status: 'APPROVED',
    notes: 'Vacaciones de verano',
    created_at: '2024-06-01T00:00:00.000Z',
    approved_by: 'FERF790628MNO',
    approved_at: '2024-06-05T00:00:00.000Z',
    anniversary_year: 6
  },
  {
    id: randomUUID(),
    user_rfc: 'RODJ870612XYZ',
    leave_type_id: '3a7ec80a-d5d4-4f4a-a867-d9e438423347', // Vacaciones Ordinarias
    start_date: '2024-08-05',
    end_date: '2024-08-16',
    total_days: 10,
    status: 'PENDING',
    notes: 'Viaje familiar',
    created_at: '2024-06-20T00:00:00.000Z',
    approved_by: null,
    approved_at: null,
    anniversary_year: 5
  },
  {
    id: randomUUID(),
    user_rfc: 'LOPR841117JKL',
    leave_type_id: 'e64f2f7c-a592-4b3f-8c44-37a9f3e1ec38', // Incapacidad
    start_date: '2024-06-10',
    end_date: '2024-06-17',
    total_days: 7,
    status: 'APPROVED',
    notes: 'Recuperación por cirugía menor',
    created_at: '2024-06-10T00:00:00.000Z',
    approved_by: 'MEGS801205ABC',
    approved_at: '2024-06-10T00:00:00.000Z',
    anniversary_year: 2
  },
  {
    id: randomUUID(),
    user_rfc: 'GARL780924DEF',
    leave_type_id: '7bfd4f98-c678-4e2c-8b90-d9d6d7a76634', // Fallecimiento Familiar
    start_date: '2024-05-20',
    end_date: '2024-05-24',
    total_days: 5,
    status: 'APPROVED',
    notes: 'Fallecimiento de padre',
    created_at: '2024-05-20T00:00:00.000Z',
    approved_by: 'FERF790628MNO',
    approved_at: '2024-05-20T00:00:00.000Z',
    anniversary_year: 4
  },
  {
    id: randomUUID(),
    user_rfc: 'MAPC910305GHI',
    leave_type_id: 'bd3dbb12-b51d-4ab5-a518-55b3f1b2d310', // Matrimonio
    start_date: '2024-09-10',
    end_date: '2024-09-14',
    total_days: 5,
    status: 'PENDING',
    notes: 'Boda y luna de miel',
    created_at: '2024-06-15T00:00:00.000Z',
    approved_by: null,
    approved_at: null,
    anniversary_year: 3
  },
  {
    id: randomUUID(),
    user_rfc: 'FERF790628MNO',
    leave_type_id: '3a7ec80a-d5d4-4f4a-a867-d9e438423347', // Vacaciones Ordinarias
    start_date: '2024-12-20',
    end_date: '2024-12-31',
    total_days: 8,
    status: 'PENDING',
    notes: 'Vacaciones de fin de año',
    created_at: '2024-06-25T00:00:00.000Z',
    approved_by: null,
    approved_at: null,
    anniversary_year: 8
  },
  {
    id: randomUUID(),
    user_rfc: 'DIAZ850714PQR',
    leave_type_id: '9d6e16e6-79e0-4a12-856d-64dbb8f45edd', // Permiso Sin Goce
    start_date: '2024-10-01',
    end_date: '2024-10-05',
    total_days: 5,
    status: 'REJECTED',
    notes: 'Asuntos personales',
    created_at: '2024-06-10T00:00:00.000Z',
    approved_by: 'MEGS801205ABC',
    approved_at: '2024-06-15T00:00:00.000Z',
    anniversary_year: 1
  },
  {
    id: randomUUID(),
    user_rfc: 'GARL780924DEF',
    leave_type_id: 'c12d9e5a-1d3b-4a73-a9a3-a55ede9cc24a', // Maternidad
    start_date: '2024-08-01',
    end_date: '2024-10-23',
    total_days: 84,
    status: 'APPROVED',
    notes: 'Licencia de maternidad',
    created_at: '2024-06-01T00:00:00.000Z',
    approved_by: 'MEGS801205ABC',
    approved_at: '2024-06-05T00:00:00.000Z',
    anniversary_year: 4
  },
  {
    id: randomUUID(),
    user_rfc: 'RODJ870612XYZ',
    leave_type_id: 'e1f22b7a-8e65-4c59-8f28-48d8d7c87d16', // Paternidad
    start_date: '2024-07-10',
    end_date: '2024-07-14',
    total_days: 5,
    status: 'APPROVED',
    notes: 'Nacimiento de hijo',
    created_at: '2024-06-20T00:00:00.000Z',
    approved_by: 'FERF790628MNO',
    approved_at: '2024-06-22T00:00:00.000Z',
    anniversary_year: 5
  }
];