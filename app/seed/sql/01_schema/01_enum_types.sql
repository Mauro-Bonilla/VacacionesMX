-- Leave Status Enum
CREATE TYPE leave_status AS ENUM (
  'PENDING',
  'APPROVED',
  'REJECTED',
  'CANCELLED',
  'COMPLETED'
);

-- Create holiday types enum
CREATE TYPE holiday_type AS ENUM (
  'OBLIGATORY',    -- Required by law
  'COMPANY'        -- Provided by company
);

-- Create rest day type enum
CREATE TYPE rest_day_type AS ENUM (
  'SUNDAY_ONLY',       -- Only Sunday off
  'SATURDAY_SUNDAY'    -- Both Saturday and Sunday off
);