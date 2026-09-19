ALTER TABLE seating_assignments DROP CONSTRAINT IF EXISTS seating_assignments_side_check;
ALTER TABLE seating_assignments ADD CONSTRAINT seating_assignments_side_check CHECK (side IN ('A', 'B', 'H'));
