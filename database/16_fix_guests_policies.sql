-- Enable RLS on guests table
ALTER TABLE guests ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Allow public access" ON guests;
DROP POLICY IF EXISTS "Allow authenticated users to view guests" ON guests;
DROP POLICY IF EXISTS "Allow authenticated users to insert guests" ON guests;
DROP POLICY IF EXISTS "Allow authenticated users to update guests" ON guests;
DROP POLICY IF EXISTS "Allow authenticated users to delete guests" ON guests;

-- Allow authenticated users (admin) to read guests
CREATE POLICY "Allow authenticated users to view guests"
ON guests FOR SELECT
TO authenticated
USING (true);

-- Allow authenticated users (admin) to insert guests
CREATE POLICY "Allow authenticated users to insert guests"
ON guests FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow authenticated users (admin) to update guests
CREATE POLICY "Allow authenticated users to update guests"
ON guests FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Allow authenticated users (admin) to delete guests
CREATE POLICY "Allow authenticated users to delete guests"
ON guests FOR DELETE
TO authenticated
USING (true);

-- Allow service role (from API) to access guests
CREATE POLICY "Allow service role to access guests"
ON guests FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
