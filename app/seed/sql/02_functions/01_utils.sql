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