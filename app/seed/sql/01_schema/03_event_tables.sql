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