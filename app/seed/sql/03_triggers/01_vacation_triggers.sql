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