-- Departments
CREATE TABLE IF NOT EXISTS departments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Users (with new rest_days attribute)
CREATE TABLE IF NOT EXISTS users (
  rfc VARCHAR(13) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password TEXT NOT NULL,
  hire_date DATE NOT NULL,
  department_id UUID NOT NULL REFERENCES departments(id),
  is_admin BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  rest_days rest_day_type DEFAULT 'SUNDAY_ONLY', -- New column for rest days
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Leave Types
CREATE TABLE IF NOT EXISTS leave_types (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  is_paid BOOLEAN DEFAULT TRUE,
  requires_approval BOOLEAN DEFAULT TRUE,
  max_days_per_year INT,
  max_days_per_request INT,
  min_notice_days INT DEFAULT 0,
  color_code VARCHAR(7) DEFAULT '#3498db',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Vacation Requests
CREATE TABLE IF NOT EXISTS vacation_requests (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_rfc VARCHAR(13) REFERENCES users(rfc) NOT NULL,
  leave_type_id UUID REFERENCES leave_types(id) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status leave_status NOT NULL DEFAULT 'PENDING',
  notes TEXT,
  balance_at_request DECIMAL(5,1),
  rejection_reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  approved_by VARCHAR(13) REFERENCES users(rfc),
  approved_at TIMESTAMP,
  anniversary_year INT,
  UNIQUE(user_rfc, leave_type_id, start_date, end_date)
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_rfc VARCHAR(13) REFERENCES users(rfc) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Vacation Balance Table for explicit balance tracking
CREATE TABLE IF NOT EXISTS vacation_balances (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_rfc VARCHAR(13) REFERENCES users(rfc) NOT NULL,
  leave_type_id UUID REFERENCES leave_types(id) NOT NULL,
  applicable_year INT,
  anniversary_year INT NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  entitled_days DECIMAL(5,1) NOT NULL,
  used_days DECIMAL(5,1) NOT NULL DEFAULT 0,
  pending_days DECIMAL(5,1) NOT NULL DEFAULT 0,
  is_event_based BOOLEAN DEFAULT FALSE,
  event_id UUID,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_rfc, leave_type_id, anniversary_year)
);