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
      WHEN p_rest_days = 'SATURDAY_SUNDAY' THEN 'Sábado y domingo'
    END
  );
END;
$$ LANGUAGE plpgsql;