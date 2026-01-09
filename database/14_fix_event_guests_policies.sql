-- Enable RLS on event_guests table if not already enabled
ALTER TABLE event_guests ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Allow authenticated users to view event guests" ON event_guests;
DROP POLICY IF EXISTS "Allow authenticated users to insert event guests" ON event_guests;
DROP POLICY IF EXISTS "Allow authenticated users to update event guests" ON event_guests;
DROP POLICY IF EXISTS "Allow authenticated users to delete event guests" ON event_guests;

-- Create policies for authenticated users to manage event_guests
CREATE POLICY "Allow authenticated users to view event guests"
ON event_guests FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated users to insert event guests"
ON event_guests FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update event guests"
ON event_guests FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete event guests"
ON event_guests FOR DELETE
TO authenticated
USING (true);
