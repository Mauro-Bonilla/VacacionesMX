-- Combined SQL Migration Script

-- Extensions
-- Create extension for UUID generation if not exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Schema Files
-- Leave Status Enum
CREATE TYPE leave_status AS ENUM (
  'PENDING',
  'APPROVED',
  'REJECTED',
  'CANCELLED',
  'COMPLETED'
);

-- Create holiday types enum
CREATE TYPE holiday_type AS ENUM (
  'OBLIGATORY',    -- Required by law
  'COMPANY'        -- Provided by company
);

-- Create rest day type enum
CREATE TYPE rest_day_type AS ENUM (
  'SUNDAY_ONLY',       -- Only Sunday off
  'SATURDAY_SUNDAY'    -- Both Saturday and Sunday off
);

-- Departments
CREATE TABLE IF NOT EXISTS departments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Users (with new rest_days attribute)
CREATE TABLE IF NOT EXISTS users (
  rfc VARCHAR(13) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password TEXT NOT NULL,
  hire_date DATE NOT NULL,
  department_id UUID NOT NULL REFERENCES departments(id),
  is_admin BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  rest_days rest_day_type DEFAULT 'SUNDAY_ONLY', -- New column for rest days
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Leave Types
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

-- Vacation Requests
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

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_rfc VARCHAR(13) REFERENCES users(rfc) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Vacation Balance Table for explicit balance tracking
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

-- Create event registry table if it doesn't exist
CREATE TABLE IF NOT EXISTS leave_events (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_rfc VARCHAR(13) REFERENCES users(rfc) NOT NULL,
  leave_type_id UUID REFERENCES leave_types(id) NOT NULL,
  event_date DATE NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_rfc, leave_type_id, event_date)
);

-- Create daily check table if it doesn't exist
CREATE TABLE IF NOT EXISTS daily_checks (
  id SERIAL PRIMARY KEY,
  check_date DATE UNIQUE DEFAULT CURRENT_DATE,
  last_run TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for vacation balances
CREATE INDEX IF NOT EXISTS idx_vacation_balances_user_type_year ON vacation_balances(user_rfc, leave_type_id, anniversary_year);
CREATE INDEX IF NOT EXISTS idx_vacation_balances_applicable_year ON vacation_balances(applicable_year);
CREATE INDEX IF NOT EXISTS idx_vacation_balances_period ON vacation_balances(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_vacation_balances_user ON vacation_balances(user_rfc);
CREATE INDEX IF NOT EXISTS idx_vacation_balances_anniversary ON vacation_balances(anniversary_year);
CREATE INDEX IF NOT EXISTS idx_vacation_balances_type ON vacation_balances(leave_type_id);

-- Indexes for vacation events
CREATE INDEX IF NOT EXISTS idx_vacation_events ON leave_events(user_rfc, leave_type_id);

-- Indexes for vacation requests
CREATE INDEX IF NOT EXISTS idx_vacation_requests_user ON vacation_requests(user_rfc);
CREATE INDEX IF NOT EXISTS idx_vacation_requests_status ON vacation_requests(status);
CREATE INDEX IF NOT EXISTS idx_vacation_requests_dates ON vacation_requests(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_vacation_requests_anniversary ON vacation_requests(anniversary_year);

-- Create holidays table
CREATE TABLE IF NOT EXISTS holidays (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  holiday_date DATE NOT NULL,
  description VARCHAR(255) NOT NULL,
  type holiday_type NOT NULL,
  full_day BOOLEAN DEFAULT TRUE,  -- FALSE for partial days (like Dec 24/31)
  work_until TIME DEFAULT NULL,    -- Time until when work is required on partial days
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create unique index to prevent duplicate holiday dates
CREATE UNIQUE INDEX IF NOT EXISTS idx_holiday_date ON holidays(holiday_date);

-- Create view to easily see upcoming holidays
CREATE OR REPLACE VIEW upcoming_holidays AS
SELECT 
  holiday_date,
  description,
  type,
  full_day,
  work_until,
  CASE 
    WHEN type = 'OBLIGATORY' THEN 'Obligatorio por ley'
    WHEN type = 'COMPANY' THEN 'Otorgado por la empresa'
  END AS holiday_type_desc,
  CASE
    WHEN full_day THEN 'Día completo'
    ELSE 'Día parcial (Trabajo hasta ' || to_char(work_until, 'HH24:MI') || ')'
  END AS day_type
FROM 
  holidays
WHERE 
  holiday_date >= CURRENT_DATE
ORDER BY 
  holiday_date;

-- Function Files
-- Function to calculate vacation days based on years of service (LFT Article 76)
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

-- Function to classify leave types by their handling method
CREATE OR REPLACE FUNCTION get_leave_type_classification(p_leave_type_name TEXT) 
RETURNS TEXT AS $$
BEGIN
    RETURN 'ANNUAL';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to check if an employee has already used a one-time leave
CREATE OR REPLACE FUNCTION has_used_one_time_leave(p_user_rfc VARCHAR(13), p_leave_type_id UUID) 
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM leave_events
    WHERE user_rfc = p_user_rfc AND leave_type_id = p_leave_type_id
  );
END;
$$ LANGUAGE plpgsql;

-- Function to check if a date is a weekend based on user's rest day settings
CREATE OR REPLACE FUNCTION is_weekend(check_date DATE, p_user_rfc VARCHAR(13) DEFAULT NULL) 
RETURNS BOOLEAN AS $$
DECLARE
  v_rest_days rest_day_type;
  v_day_of_week INTEGER;
BEGIN
  v_day_of_week := EXTRACT(DOW FROM check_date);
  
  -- If user is provided, check their specific rest day settings
  IF p_user_rfc IS NOT NULL THEN
    SELECT rest_days INTO v_rest_days FROM users WHERE rfc = p_user_rfc;
    
    IF v_rest_days = 'SATURDAY_SUNDAY' THEN
      -- 0 is Sunday, 6 is Saturday in PostgreSQL's DOW function
      RETURN v_day_of_week IN (0, 6);
    ELSE -- Default to SUNDAY_ONLY
      RETURN v_day_of_week = 0;
    END IF;
  ELSE
    -- Default behavior if no user specified - only Sunday is weekend
    RETURN v_day_of_week = 0;
  END IF;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to check if a date is a holiday
CREATE OR REPLACE FUNCTION is_holiday(check_date DATE)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM holidays
    WHERE holiday_date = check_date
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to check if a date should be counted as a vacation day
CREATE OR REPLACE FUNCTION is_countable_vacation_day(check_date DATE, p_user_rfc VARCHAR(13) DEFAULT NULL)
RETURNS BOOLEAN AS $$
BEGIN
  -- Return false if the date is a weekend (based on user settings) or a holiday
  RETURN NOT (is_weekend(check_date, p_user_rfc) OR is_holiday(check_date));
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to count actual vacation days excluding weekends and holidays
CREATE OR REPLACE FUNCTION count_vacation_days(start_date DATE, end_date DATE, p_user_rfc VARCHAR(13) DEFAULT NULL) 
RETURNS INTEGER AS $$
DECLARE
  v_current_date DATE := start_date;
  vacation_days INTEGER := 0;
BEGIN
  WHILE v_current_date <= end_date LOOP
    IF is_countable_vacation_day(v_current_date, p_user_rfc) THEN
      vacation_days := vacation_days + 1;
    END IF;
    v_current_date := v_current_date + INTERVAL '1 day';
  END LOOP;
  
  RETURN vacation_days;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to calculate business days between two dates
CREATE OR REPLACE FUNCTION business_days_between(start_date DATE, end_date DATE, p_user_rfc VARCHAR(13) DEFAULT NULL)
RETURNS INTEGER AS $$
BEGIN
  RETURN count_vacation_days(start_date, end_date, p_user_rfc);
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to calculate working days between two dates with detailed breakdown
CREATE OR REPLACE FUNCTION calculate_working_days(
  start_date DATE,
  end_date DATE,
  p_user_rfc VARCHAR(13) DEFAULT NULL,
  leave_type_id UUID DEFAULT NULL
) RETURNS TABLE (
  result_start_date DATE,
  result_end_date DATE,
  calendar_days INT,
  working_days INT,
  holidays INT,
  weekends INT
) AS $$
DECLARE
  v_current_date DATE := start_date;
  v_calendar_days INT := 0;
  v_working_days INT := 0;
  v_holidays INT := 0;
  v_weekends INT := 0;
BEGIN
  v_calendar_days := (end_date - start_date + 1);
  
  WHILE v_current_date <= end_date LOOP
    IF is_weekend(v_current_date, p_user_rfc) THEN
      v_weekends := v_weekends + 1;
    ELSIF is_holiday(v_current_date) THEN
      v_holidays := v_holidays + 1;
    ELSE
      v_working_days := v_working_days + 1;
    END IF;
    
    v_current_date := v_current_date + INTERVAL '1 day';
  END LOOP;
  
  RETURN QUERY
  SELECT
    start_date,
    end_date,
    v_calendar_days,
    v_working_days,
    v_holidays,
    v_weekends;
END;
$$ LANGUAGE plpgsql STABLE;

-- Register a leave event and return the ID
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

-- Function to handle event-based leave requests
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
      v_entitled_days := count_vacation_days(p_start_date, p_end_date, p_user_rfc);
  END CASE;
  
  -- Register the event
  v_event_id := register_leave_event(p_user_rfc, p_leave_type_id, p_start_date, p_description);
  
  -- Check if balance already exists for this user/leave_type/anniversary_year
  IF EXISTS (
    SELECT 1 FROM vacation_balances
    WHERE user_rfc = p_user_rfc
    AND leave_type_id = p_leave_type_id
    AND anniversary_year = v_anniversary_year
    AND is_event_based = TRUE
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
    AND is_event_based = TRUE
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
$$ LANGUAGE plpgsql;

-- Create and insert a leave balance record
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

-- Create leave balances for a specific anniversary year
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

-- Function to create all required balances for a user
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

-- Function to get all holidays for a given year
CREATE OR REPLACE FUNCTION get_holidays_for_year(year_param INT)
RETURNS TABLE (
  holiday_date DATE,
  description VARCHAR(255),
  type holiday_type,
  full_day BOOLEAN,
  is_weekend BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    h.holiday_date,
    h.description,
    h.type,
    h.full_day,
    is_weekend(h.holiday_date) AS is_weekend
  FROM 
    holidays h
  WHERE 
    EXTRACT(YEAR FROM h.holiday_date) = year_param
  ORDER BY 
    h.holiday_date;
END;
$$ LANGUAGE plpgsql;

-- Update existing vacation requests to recalculate their impact on balances
CREATE OR REPLACE FUNCTION recalculate_existing_vacation_requests()
RETURNS INTEGER AS $$
DECLARE
  rec RECORD;
  v_business_days DECIMAL;
  v_requests_updated INTEGER := 0;
BEGIN
  -- Update each active vacation request
  FOR rec IN 
    SELECT id, user_rfc, leave_type_id, start_date, end_date, status, anniversary_year
    FROM vacation_requests
    WHERE status IN ('PENDING', 'APPROVED')
  LOOP
    -- Calculate actual business days (excluding weekends and holidays)
    v_business_days := count_vacation_days(rec.start_date, rec.end_date, rec.user_rfc);
    
    -- First reset the balance
    IF rec.status = 'PENDING' THEN
      UPDATE vacation_balances
      SET pending_days = GREATEST(0, pending_days - v_business_days),
          updated_at = CURRENT_TIMESTAMP
      WHERE user_rfc = rec.user_rfc
      AND leave_type_id = rec.leave_type_id
      AND anniversary_year = rec.anniversary_year
      AND NOT is_event_based;
    ELSIF rec.status = 'APPROVED' THEN
      UPDATE vacation_balances
      SET used_days = GREATEST(0, used_days - v_business_days),
          updated_at = CURRENT_TIMESTAMP
      WHERE user_rfc = rec.user_rfc
      AND leave_type_id = rec.leave_type_id
      AND anniversary_year = rec.anniversary_year
      AND NOT is_event_based;
    END IF;
    
    -- Now add the correct amount
    v_business_days := count_vacation_days(rec.start_date, rec.end_date, rec.user_rfc);
    
    IF rec.status = 'PENDING' THEN
      UPDATE vacation_balances
      SET pending_days = pending_days + v_business_days,
          updated_at = CURRENT_TIMESTAMP
      WHERE user_rfc = rec.user_rfc
      AND leave_type_id = rec.leave_type_id
      AND anniversary_year = rec.anniversary_year
      AND NOT is_event_based;
    ELSIF rec.status = 'APPROVED' THEN
      UPDATE vacation_balances
      SET used_days = used_days + v_business_days,
          updated_at = CURRENT_TIMESTAMP
      WHERE user_rfc = rec.user_rfc
      AND leave_type_id = rec.leave_type_id
      AND anniversary_year = rec.anniversary_year
      AND NOT is_event_based;
    END IF;
    
    v_requests_updated := v_requests_updated + 1;
  END LOOP;
  
  RETURN v_requests_updated;
END;
$$ LANGUAGE plpgsql;

-- Trigger Files
-- Function to handle vacation request changes
CREATE OR REPLACE FUNCTION update_vacation_balances_on_request() 
RETURNS TRIGGER AS $$
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
  
  -- Calculate request days - use function that accounts for user rest days
  v_days_difference := count_vacation_days(NEW.start_date, NEW.end_date, NEW.user_rfc);
  
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
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS update_vacation_balances_on_request_trigger ON vacation_requests;
CREATE TRIGGER update_vacation_balances_on_request_trigger
BEFORE INSERT OR UPDATE ON vacation_requests
FOR EACH ROW
EXECUTE FUNCTION update_vacation_balances_on_request();

-- Main trigger for user changes
CREATE OR REPLACE FUNCTION check_user_vacation_balances() 
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_active THEN
    PERFORM create_all_missing_vacation_balances(NEW.rfc);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function for daily anniversary check
CREATE OR REPLACE FUNCTION process_daily_anniversaries() 
RETURNS TRIGGER AS $$
BEGIN
  PERFORM ensure_current_year_balances();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create user trigger
DROP TRIGGER IF EXISTS check_user_vacation_balances_trigger ON users;
CREATE TRIGGER check_user_vacation_balances_trigger
AFTER INSERT OR UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION check_user_vacation_balances();

-- Create the daily check trigger
DROP TRIGGER IF EXISTS daily_anniversary_check_trigger ON daily_checks;
CREATE TRIGGER daily_anniversary_check_trigger
AFTER INSERT OR UPDATE ON daily_checks
FOR EACH ROW
EXECUTE FUNCTION process_daily_anniversaries();

-- Procedure Files
-- Function to ensure all users have balances for the current year
CREATE OR REPLACE FUNCTION ensure_current_year_balances() 
RETURNS VOID AS $$
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
$$ LANGUAGE plpgsql;

-- Function to fix existing data
CREATE OR REPLACE FUNCTION fix_existing_balances() 
RETURNS VOID AS $$
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
$$ LANGUAGE plpgsql;

-- Function to update user rest days setting and recalculate vacation days
CREATE OR REPLACE FUNCTION update_user_rest_days(
  p_user_rfc VARCHAR(13),
  p_rest_days rest_day_type
) RETURNS VOID AS $$
BEGIN
  -- Update the user's rest day setting
  UPDATE users
  SET rest_days = p_rest_days,
      updated_at = CURRENT_TIMESTAMP
  WHERE rfc = p_user_rfc;
  
  -- Recalculate any pending or future vacation requests
  PERFORM recalculate_existing_vacation_requests();
  
  -- Create notification about the change
  INSERT INTO notifications (user_rfc, title, message)
  VALUES (
    p_user_rfc,
    'Actualización de días de descanso',
    'Tu configuración de días de descanso ha sido actualizada a: ' || 
    CASE 
      WHEN p_rest_days = 'SUNDAY_ONLY' THEN 'Solo domingo'
      WHEN p_rest_days = 'SATURDAY_SUNDAY' THEN 'SÃ¡bado y domingo'
    END
  );
END;
$$ LANGUAGE plpgsql;

-- Initialization
-- Initialize the daily check table if empty
INSERT INTO daily_checks (id, check_date)
SELECT 1, CURRENT_DATE
WHERE NOT EXISTS (SELECT 1 FROM daily_checks WHERE id = 1);

-- Run the fix for existing data
SELECT fix_existing_balances();

-- Create missing balances for all employees including event-based leave placeholders
SELECT ensure_current_year_balances();

-- Insert the holidays
-- Obligatory holidays
INSERT INTO holidays (holiday_date, description, type, full_day) VALUES
('2025-01-01', 'Año Nuevo', 'OBLIGATORY', TRUE),
('2025-02-03', 'Aniversario de la Constitución Mexicana. En conmemoración del 5', 'OBLIGATORY', TRUE),
('2025-03-17', 'Natalicio de Benito JuÃ¡rez. En conmemoración del 21', 'OBLIGATORY', TRUE),
('2025-05-01', 'Día del trabajo', 'OBLIGATORY', TRUE),
('2025-09-16', 'Aniversario de la Independencia de MÃ©xico', 'OBLIGATORY', TRUE),
('2025-11-17', 'Aniversario de la Revolución Mexicana. En conmemoración del 20', 'OBLIGATORY', TRUE),
('2025-12-25', 'Navidad', 'OBLIGATORY', TRUE),
('2026-01-01', 'Año nuevo', 'OBLIGATORY', TRUE)
ON CONFLICT (holiday_date) DO NOTHING;

-- Company provided holidays
INSERT INTO holidays (holiday_date, description, type, full_day, work_until) VALUES
('2025-04-17', 'Jueves Santo', 'COMPANY', TRUE, NULL),
('2025-04-18', 'Viernes Santo', 'COMPANY', TRUE, NULL),
('2025-05-10', 'Día de las madres', 'COMPANY', TRUE, NULL),
('2025-12-24', 'Noche buena', 'COMPANY', FALSE, '14:00'),
('2025-12-31', 'Fin de año', 'COMPANY', FALSE, '14:00')
ON CONFLICT (holiday_date) DO NOTHING;
