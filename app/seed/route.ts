import bcrypt from 'bcryptjs';
import postgres from 'postgres';
import { users, departments, leaveTypes, vacationRequests } from './placeholder-data';

const sql = postgres(process.env.POSTGRES_URL!, { ssl: 'require' });

// Create extension for UUID
async function createExtensions() {
  await sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`;
}

// Create system tables for logging and notifications
async function createSystemTables() {
  // System logs for tracking important system events
  await sql`
    CREATE TABLE IF NOT EXISTS system_logs (
      id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
      event_type VARCHAR(50) NOT NULL,
      description TEXT,
      related_rfc VARCHAR(13),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;
  
  // Automatic notification table
  await sql`
    CREATE TABLE IF NOT EXISTS notifications (
      id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
      user_rfc VARCHAR(13) REFERENCES users(rfc),
      title VARCHAR(255) NOT NULL,
      message TEXT NOT NULL,
      is_read BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;
  
  // Daily checks table for automated processes
  await sql`
    CREATE TABLE IF NOT EXISTS daily_checks (
      id SERIAL PRIMARY KEY,
      check_date DATE UNIQUE DEFAULT CURRENT_DATE,
      last_run TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;
  
  // Initialize the daily check table if empty
  await sql`
    INSERT INTO daily_checks (id, check_date)
    SELECT 1, CURRENT_DATE
    WHERE NOT EXISTS (SELECT 1 FROM daily_checks WHERE id = 1);
  `;
}

// Create departments table
async function seedDepartments() {
  await sql`
    CREATE TABLE IF NOT EXISTS departments (
      id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const insertedDepartments = await Promise.all(
    departments.map(
      (department) => sql`
        INSERT INTO departments (id, name)
        VALUES (${department.id}, ${department.name})
        ON CONFLICT (id) DO NOTHING;
      `,
    ),
  );

  return insertedDepartments;
}

// Create users table with RFC as primary key
async function seedUsers() {
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      rfc VARCHAR(13) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL UNIQUE,
      password TEXT NOT NULL,
      hire_date DATE NOT NULL,
      department_id UUID NOT NULL REFERENCES departments(id),
      is_admin BOOLEAN DEFAULT FALSE,
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const insertedUsers = await Promise.all(
    users.map(async (user) => {
      const hashedPassword = await bcrypt.hash(user.password, 10);
      return sql`
        INSERT INTO users (rfc, name, email, password, hire_date, department_id, is_admin, is_active)
        VALUES (${user.rfc}, ${user.name}, ${user.email}, ${hashedPassword}, ${user.hire_date}, ${user.department_id}, ${user.is_admin}, ${user.is_active})
        ON CONFLICT (rfc) DO NOTHING;
      `;
    }),
  );

  return insertedUsers;
}

// Create leave types table
async function seedLeaveTypes() {
  await sql`
    CREATE TABLE IF NOT EXISTS leave_types (
      id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      description TEXT,
      is_paid BOOLEAN DEFAULT TRUE,
      requires_approval BOOLEAN DEFAULT TRUE,
      max_days_per_year INT,
      max_days_per_request INT,
      min_notice_days INT DEFAULT 0,
      color_code VARCHAR(7) DEFAULT '#3498db',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const insertedLeaveTypes = await Promise.all(
    leaveTypes.map(
      (type) => sql`
        INSERT INTO leave_types (id, name, description, is_paid, requires_approval, max_days_per_request)
        VALUES (${type.id}, ${type.name}, ${type.description}, ${type.is_paid}, ${type.requires_approval}, ${type.max_days_per_request})
        ON CONFLICT (id) DO NOTHING;
      `,
    ),
  );

  return insertedLeaveTypes;
}

// Create leave_events table for tracking event-based leaves
async function createLeaveEventsTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS leave_events (
      id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
      user_rfc VARCHAR(13) REFERENCES users(rfc) NOT NULL,
      leave_type_id UUID REFERENCES leave_types(id) NOT NULL,
      event_date DATE NOT NULL,
      description TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_rfc, leave_type_id, event_date)
    );
  `;
  
  return true;
}

// Create vacation_balances table for explicit balance tracking
async function createVacationBalancesTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS vacation_balances (
      id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
      user_rfc VARCHAR(13) REFERENCES users(rfc) NOT NULL,
      leave_type_id UUID REFERENCES leave_types(id) NOT NULL,
      applicable_year INT,
      anniversary_year INT NOT NULL,
      period_start DATE NOT NULL,
      period_end DATE NOT NULL,
      entitled_days DECIMAL(5,1) NOT NULL,
      used_days DECIMAL(5,1) NOT NULL DEFAULT 0,
      pending_days DECIMAL(5,1) NOT NULL DEFAULT 0,
      is_event_based BOOLEAN DEFAULT FALSE,
      event_id UUID,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_rfc, leave_type_id, anniversary_year)
    );
  `;
  
  // Create indexes for better performance
  await sql`
    CREATE INDEX IF NOT EXISTS idx_vacation_balances_user_type_year 
    ON vacation_balances(user_rfc, leave_type_id, anniversary_year);
  `;
  
  await sql`
    CREATE INDEX IF NOT EXISTS idx_vacation_balances_applicable_year 
    ON vacation_balances(applicable_year);
  `;
  
  await sql`
    CREATE INDEX IF NOT EXISTS idx_vacation_balances_period 
    ON vacation_balances(period_start, period_end);
  `;
  
  return true;
}

// Create vacation requests table with enum type
async function seedVacationRequests() {
  // First create enum type for status
  await sql`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'leave_status') THEN
        CREATE TYPE leave_status AS ENUM (
          'PENDING',
          'APPROVED',
          'REJECTED',
          'CANCELLED',
          'COMPLETED'
        );
      END IF;
    END
    $$;
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS vacation_requests (
      id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
      user_rfc VARCHAR(13) REFERENCES users(rfc) NOT NULL,
      leave_type_id UUID REFERENCES leave_types(id) NOT NULL,
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      status leave_status NOT NULL DEFAULT 'PENDING',
      notes TEXT,
      balance_at_request DECIMAL(5,1),
      rejection_reason TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      approved_by VARCHAR(13) REFERENCES users(rfc),
      approved_at TIMESTAMP,
      anniversary_year INT,
      UNIQUE(user_rfc, leave_type_id, start_date, end_date)
    );
  `;
  
  // Create indexes for better performance
  await sql`
    CREATE INDEX IF NOT EXISTS idx_vacation_requests_user 
    ON vacation_requests(user_rfc);
  `;
  
  await sql`
    CREATE INDEX IF NOT EXISTS idx_vacation_requests_status 
    ON vacation_requests(status);
  `;
  
  await sql`
    CREATE INDEX IF NOT EXISTS idx_vacation_requests_dates 
    ON vacation_requests(start_date, end_date);
  `;
  
  await sql`
    CREATE INDEX IF NOT EXISTS idx_vacation_requests_anniversary 
    ON vacation_requests(anniversary_year);
  `;
  
  // Insert sample vacation requests if provided
  if (vacationRequests && vacationRequests.length > 0) {
    const insertedRequests = await Promise.all(
      vacationRequests.map(
        (request) => sql`
          INSERT INTO vacation_requests (
            id, 
            user_rfc, 
            leave_type_id, 
            start_date, 
            end_date, 
            total_days, 
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
            ${request.total_days}, 
            ${request.status}::leave_status, 
            ${request.notes}, 
            ${request.created_at}, 
            ${request.approved_by}, 
            ${request.approved_at},
            ${request.anniversary_year}
          )
          ON CONFLICT (user_rfc, leave_type_id, start_date, end_date) DO NOTHING;
        `,
      ),
    );
    
    return insertedRequests;
  }
  
  return true;
}

// Create all the necessary functions for leave management
async function createLeaveFunctions() {
  // Function to classify leave types by their handling method
  await sql`
    CREATE OR REPLACE FUNCTION get_leave_type_classification(p_leave_type_name TEXT) 
    RETURNS TEXT AS $$
    BEGIN
      CASE p_leave_type_name
        WHEN 'Matrimonio' THEN RETURN 'ONE_TIME';
        WHEN 'Maternidad' THEN RETURN 'EVENT_REPEATABLE';
        WHEN 'Paternidad' THEN RETURN 'EVENT_REPEATABLE';
        ELSE RETURN 'ANNUAL';
      END CASE;
    END;
    $$ LANGUAGE plpgsql IMMUTABLE;
  `;
  
  // Function to calculate vacation days based on years of service (LFT Article 76)
  await sql`
    CREATE OR REPLACE FUNCTION calculate_vacation_days(years_of_service INT) 
    RETURNS DECIMAL AS $$
    BEGIN
      -- Vacation policy as specified
      IF years_of_service = 0 THEN -- First period (6 months to 1 year)
        RETURN 12;
      ELSIF years_of_service = 1 THEN 
        RETURN 14;
      ELSIF years_of_service = 2 THEN
        RETURN 16;
      ELSIF years_of_service = 3 THEN
        RETURN 18;
      ELSIF years_of_service = 4 THEN
        RETURN 20;
      ELSIF years_of_service BETWEEN 5 AND 9 THEN
        RETURN 22;
      ELSIF years_of_service BETWEEN 10 AND 14 THEN
        RETURN 24;
      ELSIF years_of_service BETWEEN 15 AND 19 THEN
        RETURN 26;
      ELSIF years_of_service >= 20 THEN
        RETURN 28;
      ELSE
        RETURN 0; -- Not eligible yet
      END IF;
    END;
    $$ LANGUAGE plpgsql IMMUTABLE;
  `;
  
  // Function to check if an employee has already used a one-time leave
  await sql`
    CREATE OR REPLACE FUNCTION has_used_one_time_leave(p_user_rfc VARCHAR(13), p_leave_type_id UUID) 
    RETURNS BOOLEAN AS $$
    BEGIN
      RETURN EXISTS (
        SELECT 1 FROM leave_events
        WHERE user_rfc = p_user_rfc AND leave_type_id = p_leave_type_id
      );
    END;
    $$ LANGUAGE plpgsql;
  `;
  
  // Register a leave event and return the ID
  await sql`
    CREATE OR REPLACE FUNCTION register_leave_event(
      p_user_rfc VARCHAR(13),
      p_leave_type_id UUID,
      p_event_date DATE,
      p_description TEXT DEFAULT NULL
    ) RETURNS UUID AS $$
    DECLARE
      v_event_id UUID;
    BEGIN
      INSERT INTO leave_events (user_rfc, leave_type_id, event_date, description)
      VALUES (p_user_rfc, p_leave_type_id, p_event_date, p_description)
      RETURNING id INTO v_event_id;
      
      RETURN v_event_id;
    END;
    $$ LANGUAGE plpgsql;
  `;
  
  // Create and insert a leave balance record
  await sql`
    CREATE OR REPLACE FUNCTION create_leave_balance(
      p_user_rfc VARCHAR(13),
      p_leave_type_id UUID,
      p_leave_type_name VARCHAR(255),
      p_anniversary_year INT,
      p_period_start DATE,
      p_period_end DATE,
      p_entitled_days DECIMAL,
      p_is_event_based BOOLEAN DEFAULT FALSE,
      p_event_id UUID DEFAULT NULL
    ) RETURNS VOID AS $$
    DECLARE
      v_applicable_year INT;
      v_classification TEXT;
    BEGIN
      -- Skip if balance already exists for this anniversary year and leave type
      IF EXISTS (
        SELECT 1 FROM vacation_balances 
        WHERE user_rfc = p_user_rfc 
        AND leave_type_id = p_leave_type_id 
        AND anniversary_year = p_anniversary_year
      ) THEN
        RETURN;
      END IF;
      
      -- Get the classification of this leave type
      v_classification := get_leave_type_classification(p_leave_type_name);
      
      -- Set applicable_year based on leave type classification
      IF v_classification IN ('ONE_TIME', 'EVENT_REPEATABLE') THEN
        v_applicable_year := NULL; -- NULL for event-based leaves
      ELSE
        v_applicable_year := EXTRACT(YEAR FROM p_period_start)::INT;
      END IF;
      
      -- Insert the new balance
      INSERT INTO vacation_balances (
        user_rfc, leave_type_id, applicable_year, anniversary_year, 
        period_start, period_end, entitled_days, used_days, pending_days,
        is_event_based, event_id
      ) VALUES (
        p_user_rfc, p_leave_type_id, v_applicable_year, p_anniversary_year,
        p_period_start, p_period_end, p_entitled_days, 0, 0,
        p_is_event_based, p_event_id
      );
      
      -- Create notification
      INSERT INTO notifications (user_rfc, title, message)
      VALUES (
        p_user_rfc,
        'Nueva asignación de ' || p_leave_type_name,
        'Se te han asignado ' || p_entitled_days || ' días de ' || p_leave_type_name || 
        ' para el periodo ' || to_char(p_period_start, 'DD/MM/YYYY') || 
        ' al ' || to_char(p_period_end, 'DD/MM/YYYY')
      );
    END;
    $$ LANGUAGE plpgsql;
  `;
  
  // Create leave balances for a specific anniversary year
  await sql`
    CREATE OR REPLACE FUNCTION create_vacation_balance_for_year(
      p_user_rfc VARCHAR(13), 
      p_anniversary_year INT
    ) RETURNS VOID AS $$
    DECLARE
      v_leave_type RECORD;
      v_hire_date DATE;
      v_period_start DATE;
      v_period_end DATE;
      v_entitled_days DECIMAL;
      v_classification TEXT;
      v_current_year INT := EXTRACT(YEAR FROM CURRENT_DATE)::INT;
    BEGIN
      -- Get user's hire date
      SELECT hire_date INTO v_hire_date 
      FROM users 
      WHERE rfc = p_user_rfc;
      
      IF v_hire_date IS NULL THEN
        RAISE EXCEPTION 'User not found';
      END IF;
      
      -- Calculate period dates - this is now calculated once for all leave types
      IF p_anniversary_year = 0 THEN
        -- First period (6 months to 1 year)
        v_period_start := v_hire_date + INTERVAL '6 months';
        v_period_end := v_hire_date + INTERVAL '1 year' - INTERVAL '1 day';
      ELSE
        -- Full year periods
        v_period_start := v_hire_date + ((p_anniversary_year) * INTERVAL '1 year');
        v_period_end := v_hire_date + ((p_anniversary_year + 1) * INTERVAL '1 year') - INTERVAL '1 day';
      END IF;
      
      -- First, process Vacaciones Ordinarias to create the base period
      FOR v_leave_type IN SELECT id, name, max_days_per_year FROM leave_types WHERE name = 'Vacaciones Ordinarias' LOOP
        -- Regular vacation calculation based on seniority - Art. 76 LFT
        v_entitled_days := calculate_vacation_days(p_anniversary_year);
        
        -- Create the balance if days > 0
        IF v_entitled_days > 0 THEN
          PERFORM create_leave_balance(
            p_user_rfc, v_leave_type.id, v_leave_type.name, p_anniversary_year,
            v_period_start, v_period_end, v_entitled_days, FALSE, NULL
          );
        END IF;
      END LOOP;
      
      -- Then process other leave types, using the same period dates
      FOR v_leave_type IN SELECT id, name, max_days_per_year FROM leave_types WHERE name != 'Vacaciones Ordinarias' LOOP
        -- Get leave type classification
        v_classification := get_leave_type_classification(v_leave_type.name);
        
        -- Handle different leave types, all using the same period dates
        CASE v_leave_type.name
          WHEN 'Incapacidad' THEN
            -- Medical leave - Art. 42, 43 LFT
            IF v_leave_type.max_days_per_year IS NOT NULL THEN
              v_entitled_days := v_leave_type.max_days_per_year;
            ELSE
              v_entitled_days := 364; -- Default max per year
            END IF;
            
            PERFORM create_leave_balance(
              p_user_rfc, v_leave_type.id, v_leave_type.name, p_anniversary_year,
              v_period_start, v_period_end, v_entitled_days, FALSE, NULL
            );
            
          WHEN 'Fallecimiento Familiar' THEN
            -- Bereavement leave
            v_entitled_days := COALESCE(v_leave_type.max_days_per_year, 5);
            
            PERFORM create_leave_balance(
              p_user_rfc, v_leave_type.id, v_leave_type.name, p_anniversary_year,
              v_period_start, v_period_end, v_entitled_days, FALSE, NULL
            );
            
          WHEN 'Permiso Sin Goce' THEN
            -- Unpaid leave
            v_entitled_days := COALESCE(v_leave_type.max_days_per_year, 5);
            
            PERFORM create_leave_balance(
              p_user_rfc, v_leave_type.id, v_leave_type.name, p_anniversary_year,
              v_period_start, v_period_end, v_entitled_days, FALSE, NULL
            );
            
          WHEN 'Matrimonio' THEN
            -- Only create if the user doesn't already have one for this anniversary year
            IF NOT EXISTS (
              SELECT 1 
              FROM vacation_balances
              WHERE user_rfc = p_user_rfc
              AND leave_type_id = v_leave_type.id
              AND anniversary_year = p_anniversary_year
            ) THEN
              v_entitled_days := COALESCE(v_leave_type.max_days_per_year, 5);
              
              PERFORM create_leave_balance(
                p_user_rfc, v_leave_type.id, v_leave_type.name, p_anniversary_year,
                v_period_start, v_period_end, v_entitled_days, TRUE, NULL
              );
            END IF;
            
          WHEN 'Maternidad' THEN
            -- Only create if the user doesn't already have one for this anniversary year
            IF NOT EXISTS (
              SELECT 1 
              FROM vacation_balances
              WHERE user_rfc = p_user_rfc
              AND leave_type_id = v_leave_type.id
              AND anniversary_year = p_anniversary_year
            ) THEN
              v_entitled_days := 84; -- 12 weeks
              
              PERFORM create_leave_balance(
                p_user_rfc, v_leave_type.id, v_leave_type.name, p_anniversary_year,
                v_period_start, v_period_end, v_entitled_days, TRUE, NULL
              );
            END IF;
            
          WHEN 'Paternidad' THEN
            -- Only create if the user doesn't already have one for this anniversary year
            IF NOT EXISTS (
              SELECT 1 
              FROM vacation_balances
              WHERE user_rfc = p_user_rfc
              AND leave_type_id = v_leave_type.id
              AND anniversary_year = p_anniversary_year
            ) THEN
              v_entitled_days := 5; -- 5 days
              
              PERFORM create_leave_balance(
                p_user_rfc, v_leave_type.id, v_leave_type.name, p_anniversary_year,
                v_period_start, v_period_end, v_entitled_days, TRUE, NULL
              );
            END IF;
            
          ELSE
            -- For any other leave types
            IF v_leave_type.max_days_per_year IS NOT NULL THEN
              v_entitled_days := v_leave_type.max_days_per_year;
              
              PERFORM create_leave_balance(
                p_user_rfc, v_leave_type.id, v_leave_type.name, p_anniversary_year,
                v_period_start, v_period_end, v_entitled_days, FALSE, NULL
              );
            END IF;
        END CASE;
      END LOOP;
    END;
    $$ LANGUAGE plpgsql;
  `;
  
  // Function to create all required balances for a user
  await sql`
    CREATE OR REPLACE FUNCTION create_all_missing_vacation_balances(p_user_rfc VARCHAR(13)) 
    RETURNS VOID AS $$
    DECLARE
      v_current_date DATE := CURRENT_DATE;
      v_current_year INT := EXTRACT(YEAR FROM CURRENT_DATE)::INT;
      v_hire_date DATE;
      v_years_of_service INT;
      v_months_of_service DECIMAL;
      v_max_anniversary_year INT;
      v_next_anniversary_date DATE;
      v_latest_anniversary_year INT;
    BEGIN
      -- Get user's hire date
      SELECT hire_date INTO v_hire_date 
      FROM users 
      WHERE rfc = p_user_rfc;
      
      IF v_hire_date IS NULL THEN
        RETURN; -- Skip if user not found
      END IF;
      
      -- Calculate service time
      v_years_of_service := EXTRACT(YEAR FROM AGE(v_current_date, v_hire_date));
      v_months_of_service := EXTRACT(YEAR FROM AGE(v_current_date, v_hire_date)) * 12 + 
                             EXTRACT(MONTH FROM AGE(v_current_date, v_hire_date));
      
      -- Determine maximum anniversary year
      IF v_months_of_service < 6 THEN
        RETURN; -- Not eligible yet
      ELSIF v_months_of_service >= 6 AND v_months_of_service < 12 THEN
        v_max_anniversary_year := 0; -- First partial year
      ELSE
        v_max_anniversary_year := FLOOR(v_months_of_service / 12)::INT;
      END IF;
      
      -- Find the latest anniversary year already created
      SELECT COALESCE(MAX(anniversary_year), -1) INTO v_latest_anniversary_year
      FROM vacation_balances
      WHERE user_rfc = p_user_rfc
      AND leave_type_id = (SELECT id FROM leave_types WHERE name = 'Vacaciones Ordinarias' LIMIT 1)
      AND NOT is_event_based;
      
      -- Create only missing anniversary years (optimization)
      FOR i IN (v_latest_anniversary_year + 1)..v_max_anniversary_year LOOP
        PERFORM create_vacation_balance_for_year(p_user_rfc, i);
      END LOOP;
      
      -- Check if we need to pre-create the upcoming balance for current year
      v_next_anniversary_date := v_hire_date + ((v_max_anniversary_year + 1) * INTERVAL '1 year');
      
      IF EXTRACT(YEAR FROM v_next_anniversary_date) = v_current_year AND 
         v_next_anniversary_date > v_current_date THEN
        -- Create the next anniversary year if it falls in current year
        PERFORM create_vacation_balance_for_year(p_user_rfc, v_max_anniversary_year + 1);
      END IF;
    END;
    $$ LANGUAGE plpgsql;
  `;
  
  // Function to handle event-based leave requests
  await sql`
    CREATE OR REPLACE FUNCTION create_event_based_leave_balance(
      p_user_rfc VARCHAR(13),
      p_leave_type_id UUID,
      p_start_date DATE,
      p_end_date DATE,
      p_description TEXT DEFAULT NULL
    ) RETURNS UUID AS $$
    DECLARE
      v_leave_type_name VARCHAR(255);
      v_entitled_days DECIMAL;
      v_anniversary_year INT;
      v_balance_id UUID;
      v_event_id UUID;
      v_hire_date DATE;
      v_classification TEXT;
    BEGIN
      -- Get leave type name and hire date
      SELECT name INTO v_leave_type_name FROM leave_types WHERE id = p_leave_type_id;
      SELECT hire_date INTO v_hire_date FROM users WHERE rfc = p_user_rfc;
      
      -- Get classification
      v_classification := get_leave_type_classification(v_leave_type_name);
      
      -- Check if this is a one-time event that's already been used
      IF v_classification = 'ONE_TIME' AND has_used_one_time_leave(p_user_rfc, p_leave_type_id) THEN
        RAISE EXCEPTION 'El empleado ya ha utilizado su permiso de %', v_leave_type_name;
      END IF;
      
      -- Calculate anniversary year
      v_anniversary_year := EXTRACT(YEAR FROM AGE(p_start_date, v_hire_date));
      
      -- Determine entitled days based on leave type
      CASE v_leave_type_name
        WHEN 'Maternidad' THEN
          v_entitled_days := 84; -- 12 weeks (Art. 170 LFT)
        WHEN 'Paternidad' THEN
          v_entitled_days := 5;  -- 5 days (Art. 132 Section XXVII Bis LFT)
        WHEN 'Matrimonio' THEN
          v_entitled_days := 5;  -- Commonly 5 days by policy
        ELSE
          v_entitled_days := (p_end_date - p_start_date + 1)::DECIMAL;
      END CASE;
      
      -- Register the event
      v_event_id := register_leave_event(p_user_rfc, p_leave_type_id, p_start_date, p_description);
      
      -- Check if balance already exists for this user/leave_type/anniversary_year
      IF EXISTS (
        SELECT 1 FROM vacation_balances
        WHERE user_rfc = p_user_rfc
        AND leave_type_id = p_leave_type_id
        AND anniversary_year = v_anniversary_year
      ) THEN
        -- Update existing record
        UPDATE vacation_balances
        SET period_start = p_start_date,
            period_end = p_end_date,
            entitled_days = v_entitled_days,
            pending_days = v_entitled_days,
            is_event_based = TRUE,
            event_id = v_event_id,
            updated_at = CURRENT_TIMESTAMP
        WHERE user_rfc = p_user_rfc
        AND leave_type_id = p_leave_type_id
        AND anniversary_year = v_anniversary_year
        RETURNING id INTO v_balance_id;
      ELSE
        -- Create new record
        INSERT INTO vacation_balances (
          user_rfc, leave_type_id, applicable_year, anniversary_year,
          period_start, period_end, entitled_days, used_days, pending_days,
          is_event_based, event_id
        ) VALUES (
          p_user_rfc, p_leave_type_id, NULL, v_anniversary_year,
          p_start_date, p_end_date, v_entitled_days, 0, v_entitled_days,
          TRUE, v_event_id
        ) RETURNING id INTO v_balance_id;
      END IF;
      
      -- Create notification
      INSERT INTO notifications (user_rfc, title, message)
      VALUES (
        p_user_rfc,
        'Solicitud de ' || v_leave_type_name || ' registrada',
        'Se ha registrado una solicitud de ' || v_leave_type_name || 
        ' del ' || to_char(p_start_date, 'DD/MM/YYYY') || 
        ' al ' || to_char(p_end_date, 'DD/MM/YYYY') || 
        ' por ' || v_entitled_days || ' días.'
      );
      
      RETURN v_balance_id;
    END;
    $ LANGUAGE plpgsql;
  `;
  
  // Function to handle vacation request changes
  await sql`
    CREATE OR REPLACE FUNCTION update_vacation_balances_on_request() 
    RETURNS TRIGGER AS $
    DECLARE
      v_leave_type_name VARCHAR(255);
      v_anniversary_year INT;
      v_days_difference DECIMAL;
      v_classification TEXT;
      v_balance_id UUID;
      v_event_id UUID;
    BEGIN
      -- Get leave type info
      SELECT name INTO v_leave_type_name
      FROM leave_types
      WHERE id = NEW.leave_type_id;
      
      -- Get classification
      v_classification := get_leave_type_classification(v_leave_type_name);
      
      -- Calculate request days
      v_days_difference := (NEW.end_date - NEW.start_date + 1)::DECIMAL;
      
      -- Handle new request
      IF TG_OP = 'INSERT' THEN
        IF v_classification IN ('ONE_TIME', 'EVENT_REPEATABLE') THEN
          -- Create event-based balance
          v_balance_id := create_event_based_leave_balance(
            NEW.user_rfc, NEW.leave_type_id, NEW.start_date, NEW.end_date,
            CASE 
              WHEN v_leave_type_name = 'Matrimonio' THEN 'Permiso por matrimonio'
              WHEN v_leave_type_name = 'Maternidad' THEN 'Permiso por maternidad'
              WHEN v_leave_type_name = 'Paternidad' THEN 'Permiso por paternidad'
              ELSE NEW.notes
            END
          );
          
          -- Store reference to balance
          NEW.notes := COALESCE(NEW.notes, '') || ' | Balance ID: ' || v_balance_id::TEXT;
          
          -- Calculate anniversary year
          IF NEW.anniversary_year IS NULL THEN
            SELECT EXTRACT(YEAR FROM AGE(NEW.start_date, hire_date))::INT INTO NEW.anniversary_year
            FROM users
            WHERE rfc = NEW.user_rfc;
          END IF;
        ELSE
          -- Regular leave - find anniversary year if not provided
          IF NEW.anniversary_year IS NULL THEN
            SELECT anniversary_year INTO v_anniversary_year
            FROM vacation_balances
            WHERE user_rfc = NEW.user_rfc
            AND leave_type_id = NEW.leave_type_id
            AND NEW.start_date BETWEEN period_start AND period_end
            AND NOT is_event_based
            LIMIT 1;
            
            -- If not found, use most recent
            IF v_anniversary_year IS NULL THEN
              SELECT MAX(anniversary_year) INTO v_anniversary_year
              FROM vacation_balances
              WHERE user_rfc = NEW.user_rfc
              AND leave_type_id = NEW.leave_type_id
              AND NOT is_event_based;
            END IF;
            
            NEW.anniversary_year := v_anniversary_year;
          END IF;
          
          -- Update balance based on status
          IF NEW.status = 'PENDING' THEN
            -- Add to pending days
            UPDATE vacation_balances
            SET pending_days = pending_days + v_days_difference,
                updated_at = CURRENT_TIMESTAMP
            WHERE user_rfc = NEW.user_rfc
            AND leave_type_id = NEW.leave_type_id
            AND anniversary_year = NEW.anniversary_year
            AND NOT is_event_based;
          ELSIF NEW.status = 'APPROVED' THEN
            -- Add to used days
            UPDATE vacation_balances
            SET used_days = used_days + v_days_difference,
                updated_at = CURRENT_TIMESTAMP
            WHERE user_rfc = NEW.user_rfc
            AND leave_type_id = NEW.leave_type_id
            AND anniversary_year = NEW.anniversary_year
            AND NOT is_event_based;
          END IF;
          
          -- Store current balance for reference
          SELECT pending_days + used_days INTO NEW.balance_at_request
          FROM vacation_balances
          WHERE user_rfc = NEW.user_rfc
          AND leave_type_id = NEW.leave_type_id
          AND anniversary_year = NEW.anniversary_year
          AND NOT is_event_based;
        END IF;
      
      -- Handle updates to existing requests
      ELSIF TG_OP = 'UPDATE' THEN
        IF v_classification IN ('ONE_TIME', 'EVENT_REPEATABLE') THEN
          -- Extract balance ID from notes
          IF NEW.notes LIKE '%Balance ID: %' THEN
            v_balance_id := (regexp_matches(NEW.notes, 'Balance ID: ([0-9a-f-]+)', 'i'))[1]::UUID;
            
            -- Get event ID if available
            SELECT event_id INTO v_event_id 
            FROM vacation_balances 
            WHERE id = v_balance_id;
            
            -- Handle status changes
            IF OLD.status = 'PENDING' AND NEW.status = 'APPROVED' THEN
              -- Approved - update balance
              UPDATE vacation_balances
              SET pending_days = 0,
                  used_days = entitled_days,
                  updated_at = CURRENT_TIMESTAMP
              WHERE id = v_balance_id;
              
            ELSIF OLD.status = 'PENDING' AND (NEW.status = 'REJECTED' OR NEW.status = 'CANCELLED') THEN
              -- Rejected - delete balance and event if rejected
              DELETE FROM vacation_balances WHERE id = v_balance_id;
              
              IF NEW.status = 'REJECTED' AND v_event_id IS NOT NULL 
                 AND v_classification = 'ONE_TIME' THEN
                -- For one-time events, remove the event record on rejection so it can be used again
                DELETE FROM leave_events WHERE id = v_event_id;
              END IF;
              
            ELSIF OLD.status = 'APPROVED' AND NEW.status = 'CANCELLED' THEN
              -- Cancelled after approval - reset balance and remove event for one-time leaves
              UPDATE vacation_balances
              SET used_days = 0, pending_days = 0,
                  updated_at = CURRENT_TIMESTAMP
              WHERE id = v_balance_id;
              
              IF v_classification = 'ONE_TIME' AND v_event_id IS NOT NULL THEN
                -- For one-time events, remove on cancellation so it can be used again
                DELETE FROM leave_events WHERE id = v_event_id;
              END IF;
            END IF;
          END IF;
        ELSE
          -- Regular leave balance updates
          CASE 
            WHEN OLD.status = 'PENDING' AND NEW.status = 'APPROVED' THEN
              -- Move from pending to used
              UPDATE vacation_balances
              SET pending_days = pending_days - v_days_difference,
                  used_days = used_days + v_days_difference,
                  updated_at = CURRENT_TIMESTAMP
              WHERE user_rfc = NEW.user_rfc
              AND leave_type_id = NEW.leave_type_id
              AND anniversary_year = NEW.anniversary_year
              AND NOT is_event_based;
              
            WHEN OLD.status = 'PENDING' AND (NEW.status = 'REJECTED' OR NEW.status = 'CANCELLED') THEN
              -- Remove from pending
              UPDATE vacation_balances
              SET pending_days = pending_days - v_days_difference,
                  updated_at = CURRENT_TIMESTAMP
              WHERE user_rfc = NEW.user_rfc
              AND leave_type_id = NEW.leave_type_id
              AND anniversary_year = NEW.anniversary_year
              AND NOT is_event_based;
              
            WHEN OLD.status = 'APPROVED' AND NEW.status = 'CANCELLED' THEN
              -- Remove from used
              UPDATE vacation_balances
              SET used_days = used_days - v_days_difference,
                  updated_at = CURRENT_TIMESTAMP
              WHERE user_rfc = NEW.user_rfc
              AND leave_type_id = NEW.leave_type_id
              AND anniversary_year = NEW.anniversary_year
              AND NOT is_event_based;
          END CASE;
        END IF;
      END IF;
      
      RETURN NEW;
    END;
    $ LANGUAGE plpgsql;
  `;
  
  // Function to ensure all users have balances for the current year
  await sql`
    CREATE OR REPLACE FUNCTION ensure_current_year_balances() 
    RETURNS VOID AS $
    DECLARE
      user_record RECORD;
    BEGIN
      FOR user_record IN 
        SELECT rfc 
        FROM users 
        WHERE is_active = TRUE
      LOOP
        PERFORM create_all_missing_vacation_balances(user_record.rfc);
      END LOOP;
    END;
    $ LANGUAGE plpgsql;
  `;
  
  // Function to fix existing data
  await sql`
    CREATE OR REPLACE FUNCTION fix_existing_balances() 
    RETURNS VOID AS $
    DECLARE
      v_leave_type RECORD;
      v_classification TEXT;
    BEGIN
      -- Process each leave type individually for clarity
      FOR v_leave_type IN SELECT id, name FROM leave_types LOOP
        v_classification := get_leave_type_classification(v_leave_type.name);
        
        IF v_classification IN ('ONE_TIME', 'EVENT_REPEATABLE') THEN
          -- Set event-based leaves to NULL applicable_year
          UPDATE vacation_balances
          SET applicable_year = NULL,
              is_event_based = TRUE
          WHERE leave_type_id = v_leave_type.id;
        ELSE
          -- For annual leaves, set to year of period_start
          UPDATE vacation_balances
          SET applicable_year = EXTRACT(YEAR FROM period_start)::INT,
              is_event_based = FALSE
          WHERE leave_type_id = v_leave_type.id;
        END IF;
      END LOOP;
    END;
    $ LANGUAGE plpgsql;
  `;
  
  // Main trigger for user changes
  await sql`
    CREATE OR REPLACE FUNCTION check_user_vacation_balances() 
    RETURNS TRIGGER AS $
    BEGIN
      IF NEW.is_active THEN
        PERFORM create_all_missing_vacation_balances(NEW.rfc);
      END IF;
      RETURN NEW;
    END;
    $ LANGUAGE plpgsql;
  `;
  
  // Function for daily anniversary check
  await sql`
    CREATE OR REPLACE FUNCTION process_daily_anniversaries() 
    RETURNS TRIGGER AS $
    BEGIN
      PERFORM ensure_current_year_balances();
      RETURN NEW;
    END;
    $ LANGUAGE plpgsql;
  `;
  
  return true;
}

// Create all triggers needed for the leave management system
async function createLeaveTriggers() {
  // User trigger for balance creation
  await sql`
    DROP TRIGGER IF EXISTS check_user_vacation_balances_trigger ON users;
    
    CREATE TRIGGER check_user_vacation_balances_trigger
    AFTER INSERT OR UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION check_user_vacation_balances();
  `;
  
  // Vacation request trigger
  await sql`
    DROP TRIGGER IF EXISTS update_vacation_balances_on_request_trigger ON vacation_requests;
    
    CREATE TRIGGER update_vacation_balances_on_request_trigger
    BEFORE INSERT OR UPDATE ON vacation_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_vacation_balances_on_request();
  `;
  
  // Daily check trigger
  await sql`
    DROP TRIGGER IF EXISTS daily_anniversary_check_trigger ON daily_checks;
    
    CREATE TRIGGER daily_anniversary_check_trigger
    AFTER INSERT OR UPDATE ON daily_checks
    FOR EACH ROW
    EXECUTE FUNCTION process_daily_anniversaries();
  `;
  
  return true;
}

// Function to initialize the leave management system
async function initializeLeaveManagement() {
  // Run the fix for existing data if needed
  await sql`SELECT fix_existing_balances()`;
  
  // Create missing balances for all employees
  await sql`SELECT ensure_current_year_balances()`;
  
  return true;
}

// Next.js API route handler - must use named exports
export async function GET() {
  try {
    // Create base structure
    await createExtensions();
    await createSystemTables();
    
    // Execute in sequence to respect foreign key constraints
    await seedDepartments();
    await seedUsers();
    await seedLeaveTypes();
    await createLeaveEventsTable();
    await createVacationBalancesTable();
    await seedVacationRequests();
    
    // Create functions and triggers
    await createLeaveFunctions();
    await createLeaveTriggers();
    
    // Initialize the system
    await initializeLeaveManagement();
    
    return Response.json({ message: 'Database seeded successfully' });
  } catch (error) {
    console.error('Error seeding database:', error);
    return Response.json({ error }, { status: 500 });
  }
}