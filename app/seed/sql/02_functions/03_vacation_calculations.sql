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