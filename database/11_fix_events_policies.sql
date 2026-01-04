-- Drop existing policies if any
DROP POLICY IF EXISTS "Allow authenticated users to view events" ON events;
DROP POLICY IF EXISTS "Allow authenticated users to insert events" ON events;
DROP POLICY IF EXISTS "Allow authenticated users to update events" ON events;
DROP POLICY IF EXISTS "Allow authenticated users to delete events" ON events;

-- Create policies for authenticated users
CREATE POLICY "Allow authenticated users to view events"
ON events FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated users to insert events"
ON events FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update events"
ON events FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete events"
ON events FOR DELETE
TO authenticated
USING (true);
