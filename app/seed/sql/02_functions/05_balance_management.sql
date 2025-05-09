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