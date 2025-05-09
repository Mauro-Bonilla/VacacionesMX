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