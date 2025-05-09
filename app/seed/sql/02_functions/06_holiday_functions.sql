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