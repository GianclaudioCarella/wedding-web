-- Create planning_tasks table for wedding planning calendar
CREATE TABLE IF NOT EXISTS planning_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  start_month INTEGER NOT NULL CHECK (start_month >= 1 AND start_month <= 12),
  end_month INTEGER NOT NULL CHECK (end_month >= 1 AND end_month <= 12),
  year INTEGER NOT NULL CHECK (year >= 2024 AND year <= 2035),
  color TEXT NOT NULL DEFAULT '#3B82F6',
  position INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'done')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE,

  -- Ensure end_month is >= start_month for same-year tasks
  CONSTRAINT valid_month_range CHECK (end_month >= start_month)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_planning_tasks_year ON planning_tasks(year);
CREATE INDEX IF NOT EXISTS idx_planning_tasks_status ON planning_tasks(status);
CREATE INDEX IF NOT EXISTS idx_planning_tasks_position ON planning_tasks(position);

-- Enable Row Level Security
ALTER TABLE planning_tasks ENABLE ROW LEVEL SECURITY;

-- Policy for authenticated users (admin access)
CREATE POLICY "Allow authenticated access to planning_tasks"
  ON planning_tasks
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Create trigger for updating updated_at timestamp
CREATE OR REPLACE FUNCTION update_planning_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER planning_tasks_updated_at
  BEFORE UPDATE ON planning_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_planning_tasks_updated_at();
