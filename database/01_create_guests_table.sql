-- Create guests table for wedding RSVP system
CREATE TABLE IF NOT EXISTS guests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  language TEXT DEFAULT 'en' CHECK (language IN ('en', 'pt')),
  total_guests INTEGER DEFAULT 1 NOT NULL,
  attending TEXT CHECK (attending IN ('yes', 'no', 'perhaps')),
  notes TEXT CHECK (length(notes) <= 500),
  save_the_date_sent BOOLEAN DEFAULT FALSE,
  rsvp_link TEXT GENERATED ALWAYS AS (
    CASE 
      WHEN language = 'pt' THEN 'https://giancat.com/pt?guest=' || id
      ELSE 'https://giancat.com/?guest=' || id
    END
  ) STORED,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE
);

-- Create index on email for faster lookups (optional but recommended)
CREATE INDEX IF NOT EXISTS idx_guests_email ON guests(email);

-- Enable Row Level Security (RLS) if needed
-- ALTER TABLE guests ENABLE ROW LEVEL SECURITY;

-- Example policy: allow anonymous users to insert/update (adjust based on your needs)
-- CREATE POLICY "Allow public access" ON guests FOR ALL USING (true);
