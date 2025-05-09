-- Create holidays table
CREATE TABLE IF NOT EXISTS holidays (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  holiday_date DATE NOT NULL,
  description VARCHAR(255) NOT NULL,
  type holiday_type NOT NULL,
  full_day BOOLEAN DEFAULT TRUE,  -- FALSE for partial days (like Dec 24/31)
  work_until TIME DEFAULT NULL,    -- Time until when work is required on partial days
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create unique index to prevent duplicate holiday dates
CREATE UNIQUE INDEX IF NOT EXISTS idx_holiday_date ON holidays(holiday_date);

-- Create view to easily see upcoming holidays
CREATE OR REPLACE VIEW upcoming_holidays AS
SELECT 
  holiday_date,
  description,
  type,
  full_day,
  work_until,
  CASE 
    WHEN type = 'OBLIGATORY' THEN 'Obligatorio por ley'
    WHEN type = 'COMPANY' THEN 'Otorgado por la empresa'
  END AS holiday_type_desc,
  CASE
    WHEN full_day THEN 'Día completo'
    ELSE 'Día parcial (Trabajo hasta ' || to_char(work_until, 'HH24:MI') || ')'
  END AS day_type
FROM 
  holidays
WHERE 
  holiday_date >= CURRENT_DATE
ORDER BY 
  holiday_date;