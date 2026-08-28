-- Seating chart: tables and per-seat guest assignments

CREATE TABLE IF NOT EXISTS seating_tables (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  seats_per_side INT NOT NULL DEFAULT 6,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS seating_assignments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  table_id UUID NOT NULL REFERENCES seating_tables(id) ON DELETE CASCADE,
  side TEXT NOT NULL CHECK (side IN ('A', 'B')),
  position INT NOT NULL,
  guest_id UUID NOT NULL UNIQUE REFERENCES guests(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(table_id, side, position)
);

ALTER TABLE seating_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE seating_assignments ENABLE ROW LEVEL SECURITY;

-- Seating tables policies
CREATE POLICY "Allow authenticated users to read seating_tables"
ON seating_tables FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to manage seating_tables"
ON seating_tables FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update seating_tables"
ON seating_tables FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete seating_tables"
ON seating_tables FOR DELETE TO authenticated USING (true);

-- Seating assignments policies
CREATE POLICY "Allow authenticated users to read seating_assignments"
ON seating_assignments FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to manage seating_assignments"
ON seating_assignments FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update seating_assignments"
ON seating_assignments FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete seating_assignments"
ON seating_assignments FOR DELETE TO authenticated USING (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_seating_assignments_table_id ON seating_assignments(table_id);
CREATE INDEX IF NOT EXISTS idx_seating_assignments_guest_id ON seating_assignments(guest_id);
