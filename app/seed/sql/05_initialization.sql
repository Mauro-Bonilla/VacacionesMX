-- Initialize the daily check table if empty
INSERT INTO daily_checks (id, check_date)
SELECT 1, CURRENT_DATE
WHERE NOT EXISTS (SELECT 1 FROM daily_checks WHERE id = 1);

-- Run the fix for existing data
SELECT fix_existing_balances();

-- Create missing balances for all employees including event-based leave placeholders
SELECT ensure_current_year_balances();

-- Insert the holidays
-- Obligatory holidays
INSERT INTO holidays (holiday_date, description, type, full_day) VALUES
('2025-01-01', 'Año Nuevo', 'OBLIGATORY', TRUE),
('2025-02-03', 'Aniversario de la Constitución Mexicana. En conmemoración del 5', 'OBLIGATORY', TRUE),
('2025-03-17', 'Natalicio de Benito Juárez. En conmemoración del 21', 'OBLIGATORY', TRUE),
('2025-05-01', 'Día del trabajo', 'OBLIGATORY', TRUE),
('2025-09-16', 'Aniversario de la Independencia de México', 'OBLIGATORY', TRUE),
('2025-11-17', 'Aniversario de la Revolución Mexicana. En conmemoración del 20', 'OBLIGATORY', TRUE),
('2025-12-25', 'Navidad', 'OBLIGATORY', TRUE),
('2026-01-01', 'Año nuevo', 'OBLIGATORY', TRUE)
ON CONFLICT (holiday_date) DO NOTHING;

-- Company provided holidays
INSERT INTO holidays (holiday_date, description, type, full_day, work_until) VALUES
('2025-04-17', 'Jueves Santo', 'COMPANY', TRUE, NULL),
('2025-04-18', 'Viernes Santo', 'COMPANY', TRUE, NULL),
('2025-05-10', 'Día de las madres', 'COMPANY', TRUE, NULL),
('2025-12-24', 'Noche buena', 'COMPANY', FALSE, '14:00'),
('2025-12-31', 'Fin de año', 'COMPANY', FALSE, '14:00')
ON CONFLICT (holiday_date) DO NOTHING;