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