-- Indexes for vacation balances
CREATE INDEX IF NOT EXISTS idx_vacation_balances_user_type_year ON vacation_balances(user_rfc, leave_type_id, anniversary_year);
CREATE INDEX IF NOT EXISTS idx_vacation_balances_applicable_year ON vacation_balances(applicable_year);
CREATE INDEX IF NOT EXISTS idx_vacation_balances_period ON vacation_balances(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_vacation_balances_user ON vacation_balances(user_rfc);
CREATE INDEX IF NOT EXISTS idx_vacation_balances_anniversary ON vacation_balances(anniversary_year);
CREATE INDEX IF NOT EXISTS idx_vacation_balances_type ON vacation_balances(leave_type_id);

-- Indexes for vacation events
CREATE INDEX IF NOT EXISTS idx_vacation_events ON leave_events(user_rfc, leave_type_id);

-- Indexes for vacation requests
CREATE INDEX IF NOT EXISTS idx_vacation_requests_user ON vacation_requests(user_rfc);
CREATE INDEX IF NOT EXISTS idx_vacation_requests_status ON vacation_requests(status);
CREATE INDEX IF NOT EXISTS idx_vacation_requests_dates ON vacation_requests(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_vacation_requests_anniversary ON vacation_requests(anniversary_year);