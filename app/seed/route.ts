import { promises as fs } from 'fs';
import path from 'path';
import postgres from 'postgres';
import bcrypt from 'bcryptjs';
import { departments, users, leaveTypes, vacationRequests } from './placeholder-data';

// Initialize database connection with SSL for production environments
const sql = postgres(process.env.POSTGRES_URL!, { 
  ssl: process.env.NODE_ENV === 'production' ? 'require' : false,
  max: 10, // Maximum number of connections
  idle_timeout: 30, // Close connections after 30 seconds of inactivity
  connect_timeout: 10, // Give up connecting after 10 seconds
});

/**
 * Combines all SQL files in the specified order and executes them as a single transaction
 */
async function setupDatabaseSchema() {
  try {
    console.log('Reading SQL files and setting up database schema...');
    
    // SQL file order based on dependencies
    const sqlFilePaths = [
      // Extensions
      'sql/00_extensions.sql',
      
      // Schema
      'sql/01_schema/01_enum_types.sql',
      'sql/01_schema/02_core_tables.sql',
      'sql/01_schema/03_event_tables.sql',
      'sql/01_schema/04_indexes.sql',
      'sql/01_schema/05_holidays.sql',
      
      // Functions
      'sql/02_functions/01_utils.sql',
      'sql/02_functions/02_leave_classification.sql',
      'sql/02_functions/03_vacation_calculations.sql',
      'sql/02_functions/04_event_management.sql',
      'sql/02_functions/05_balance_management.sql',
      'sql/02_functions/06_holiday_functions.sql',
      
      // Triggers
      'sql/03_triggers/01_vacation_triggers.sql',
      'sql/03_triggers/02_user_triggers.sql',
      
      // Procedures
      'sql/04_procedures/01_maintenance_procedures.sql',
      
      // Initialization
      'sql/05_initialization.sql',
    ];
    
    // Read each SQL file and combine them
    let combinedSql = '';
    
    for (const filePath of sqlFilePaths) {
      try {
        const fullPath = path.join(process.cwd(), 'app/seed', filePath);
        const fileContent = await fs.readFile(fullPath, 'utf-8');
        
        combinedSql += `-- File: ${filePath}\n`;
        combinedSql += fileContent;
        combinedSql += '\n\n';
        
        console.log(`✓ Added ${filePath}`);
      } catch (error) {
        console.warn(`⚠️ Warning: Could not read ${filePath}`, error);
      }
    }
    
    // Execute the combined SQL in a transaction
    console.log('Executing combined SQL as a transaction...');
    await sql.begin(async (sql) => {
      await sql.unsafe(combinedSql);
    });
    
    console.log('✅ Database schema setup complete');
    return true;
  } catch (error) {
    console.error('❌ Failed to set up database schema:', error);
    return false;
  }
}

/**
 * Seeds the database with departments from placeholder data
 */
async function seedDepartments() {
  try {
    console.log('Seeding departments...');
    
    for (const department of departments) {
      await sql`
        INSERT INTO departments (id, name)
        VALUES (${department.id}, ${department.name})
        ON CONFLICT (id) DO UPDATE
        SET name = EXCLUDED.name,
            updated_at = CURRENT_TIMESTAMP;
      `;
    }
    
    console.log(`✓ Added ${departments.length} departments`);
    return true;
  } catch (error) {
    console.error('❌ Failed to seed departments:', error);
    return false;
  }
}

/**
 * Seeds the database with users from placeholder data
 */
async function seedUsers() {
  try {
    console.log('Seeding users...');
    
    for (const user of users) {
      // Hash the password
      const hashedPassword = await bcrypt.hash(user.password, 10);
      
      // Insert or update the user
      await sql`
        INSERT INTO users (
          rfc, 
          name, 
          email, 
          password, 
          hire_date, 
          department_id, 
          is_admin, 
          is_active
        )
        VALUES (
          ${user.rfc}, 
          ${user.name}, 
          ${user.email}, 
          ${hashedPassword}, 
          ${user.hire_date}, 
          ${user.department_id}, 
          ${user.is_admin}, 
          ${user.is_active}
        )
        ON CONFLICT (rfc) DO UPDATE
        SET name = EXCLUDED.name,
            email = EXCLUDED.email,
            password = EXCLUDED.password,
            hire_date = EXCLUDED.hire_date,
            department_id = EXCLUDED.department_id,
            is_admin = EXCLUDED.is_admin,
            is_active = EXCLUDED.is_active,
            updated_at = CURRENT_TIMESTAMP;
      `;
    }
    
    console.log(`✓ Added ${users.length} users`);
    return true;
  } catch (error) {
    console.error('❌ Failed to seed users:', error);
    return false;
  }
}

/**
 * Seeds the database with leave types from placeholder data
 */
async function seedLeaveTypes() {
  try {
    console.log('Seeding leave types...');
    
    for (const leaveType of leaveTypes) {
      await sql`
        INSERT INTO leave_types (
          id,
          name,
          description,
          is_paid,
          requires_approval,
          max_days_per_year,
          max_days_per_request,
          min_notice_days,
          color_code
        )
        VALUES (
          ${leaveType.id},
          ${leaveType.name},
          ${leaveType.description},
          ${leaveType.is_paid},
          ${leaveType.requires_approval},
          ${leaveType.max_days_per_year},
          ${leaveType.max_days_per_request},
          ${leaveType.min_notice_days},
          ${leaveType.color_code}
        )
        ON CONFLICT (id) DO UPDATE
        SET name = EXCLUDED.name,
            description = EXCLUDED.description,
            is_paid = EXCLUDED.is_paid,
            requires_approval = EXCLUDED.requires_approval,
            max_days_per_year = EXCLUDED.max_days_per_year,
            max_days_per_request = EXCLUDED.max_days_per_request,
            min_notice_days = EXCLUDED.min_notice_days,
            color_code = EXCLUDED.color_code,
            updated_at = CURRENT_TIMESTAMP;
      `;
    }
    
    console.log(`✓ Added ${leaveTypes.length} leave types`);
    return true;
  } catch (error) {
    console.error('❌ Failed to seed leave types:', error);
    return false;
  }
}

/**
 * Seeds the database with vacation requests from placeholder data
 */
async function seedVacationRequests() {
  try {
    console.log('Seeding vacation requests...');
    
    for (const request of vacationRequests) {
      await sql`
        INSERT INTO vacation_requests (
          id,
          user_rfc,
          leave_type_id,
          start_date,
          end_date,
          status,
          notes,
          created_at,
          approved_by,
          approved_at,
          anniversary_year
        )
        VALUES (
          ${request.id},
          ${request.user_rfc},
          ${request.leave_type_id},
          ${request.start_date},
          ${request.end_date},
          ${request.status}::leave_status,
          ${request.notes},
          ${request.created_at},
          ${request.approved_by},
          ${request.approved_at},
          ${request.anniversary_year}
        )
        ON CONFLICT (user_rfc, leave_type_id, start_date, end_date) DO NOTHING;
      `;
    }
    
    console.log(`✓ Added ${vacationRequests.length} vacation requests`);
    return true;
  } catch (error) {
    console.error('❌ Failed to seed vacation requests:', error);
    return false;
  }
}

/**
 * Seeds the database with holidays for 2025
 */
async function seedHolidays() {
  try {
    console.log('Seeding holidays...');
    
    // Obligatory holidays
    const obligatoryHolidays = [
      { date: '2025-01-01', description: 'Año Nuevo' },
      { date: '2025-02-03', description: 'Aniversario de la Constitución Mexicana. En conmemoración del 5' },
      { date: '2025-03-17', description: 'Natalicio de Benito Juárez. En conmemoración del 21' },
      { date: '2025-05-01', description: 'Día del trabajo' },
      { date: '2025-09-16', description: 'Aniversario de la Independencia de México' },
      { date: '2025-11-17', description: 'Aniversario de la Revolución Mexicana. En conmemoración del 20' },
      { date: '2025-12-25', description: 'Navidad' },
      { date: '2026-01-01', description: 'Año nuevo' }
    ];
    
    // Company holidays
    const companyHolidays = [
      { date: '2025-04-17', description: 'Jueves Santo', full_day: true },
      { date: '2025-04-18', description: 'Viernes Santo', full_day: true },
      { date: '2025-05-10', description: 'Día de las madres', full_day: true },
      { date: '2025-12-24', description: 'Noche buena', full_day: false, work_until: '14:00' },
      { date: '2025-12-31', description: 'Fin de año', full_day: false, work_until: '14:00' }
    ];
    
    // Insert obligatory holidays
    for (const holiday of obligatoryHolidays) {
      await sql`
        INSERT INTO holidays (
          id,
          holiday_date,
          description,
          type,
          full_day
        )
        VALUES (
          ${randomUUID()},
          ${holiday.date},
          ${holiday.description},
          ${'OBLIGATORY'}::holiday_type,
          ${true}
        )
        ON CONFLICT (holiday_date) DO NOTHING;
      `;
    }
    
    // Insert company holidays
    for (const holiday of companyHolidays) {
      await sql`
        INSERT INTO holidays (
          id,
          holiday_date,
          description,
          type,
          full_day,
          work_until
        )
        VALUES (
          ${randomUUID()},
          ${holiday.date},
          ${holiday.description},
          ${'COMPANY'}::holiday_type,
          ${holiday.full_day},
          ${holiday.work_until || null}
        )
        ON CONFLICT (holiday_date) DO NOTHING;
      `;
    }
    
    console.log(`✓ Added ${obligatoryHolidays.length + companyHolidays.length} holidays`);
    return true;
  } catch (error) {
    console.error('❌ Failed to seed holidays:', error);
    return false;
  }
}

/**
 * Initialize vacation balances for all users
 */
async function initializeVacationBalances() {
  try {
    console.log('Initializing vacation balances...');
    
    // Run the stored procedure to ensure all users have vacation balances
    await sql`SELECT ensure_current_year_balances();`;
    
    console.log('✓ Initialized vacation balances for all users');
    return true;
  } catch (error) {
    console.error('❌ Failed to initialize vacation balances:', error);
    return false;
  }
}

/**
 * Main handler for the /seed route
 * Performs all database initialization in sequence
 */
export async function GET() {
  try {
    console.log('🚀 Starting database initialization...');
    
    // Setup database schema
    const schemaSuccess = await setupDatabaseSchema();
    if (!schemaSuccess) {
      return Response.json({ 
        success: false, 
        error: 'Failed to set up database schema' 
      }, { status: 500 });
    }
    
    // Seed all data
    const departmentsSuccess = await seedDepartments();
    const usersSuccess = await seedUsers();
    const leaveTypesSuccess = await seedLeaveTypes();
    const holidaysSuccess = await seedHolidays();
    const vacationRequestsSuccess = await seedVacationRequests();
    
    // Initialize vacation balances
    const balancesSuccess = await initializeVacationBalances();
    
    // Check if all operations were successful
    const allSuccessful = departmentsSuccess && 
                          usersSuccess && 
                          leaveTypesSuccess && 
                          holidaysSuccess &&
                          vacationRequestsSuccess && 
                          balancesSuccess;
    
    if (!allSuccessful) {
      return Response.json({ 
        success: false, 
        error: 'Some database initialization operations failed. Check server logs for details.' 
      }, { status: 500 });
    }
    
    console.log('✅ Database initialization completed successfully!');
    
    // Return success response
    return Response.json({ 
      success: true, 
      message: 'Database initialized successfully with schema and data'
    });
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    
    return Response.json({ 
      success: false,
      error: 'Database initialization failed',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  } finally {
    // Close the database connection
    try {
      await sql.end({ timeout: 5 });
      console.log('Database connection closed');
    } catch (e) {
      console.warn('Warning: Failed to close database connection properly:', e);
    }
  }
}

/**
 * Helper function to generate a random UUID
 * Used for generating IDs for holidays
 */
function randomUUID(): string {
  return crypto.randomUUID();
}