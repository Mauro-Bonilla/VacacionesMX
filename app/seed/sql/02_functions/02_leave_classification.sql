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