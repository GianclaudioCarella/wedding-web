-- Create venue_rooms table
CREATE TABLE IF NOT EXISTS venue_rooms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  room_type TEXT NOT NULL DEFAULT 'private',
  capacity INT DEFAULT 2,
  floor TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create guest_room_assignments table
CREATE TABLE IF NOT EXISTS guest_room_assignments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES venue_rooms(id) ON DELETE CASCADE,
  guest_id UUID NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
  bed_label TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create external_accommodations table
CREATE TABLE IF NOT EXISTS external_accommodations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  url TEXT,
  price_range TEXT,
  distance_from_venue TEXT,
  image_url TEXT,
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create site_content table
CREATE TABLE IF NOT EXISTS site_content (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value TEXT,
  content_type TEXT,
  label TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create faq_items table
CREATE TABLE IF NOT EXISTS faq_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  question TEXT NOT NULL,
  answer TEXT,
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create registry_items table
CREATE TABLE IF NOT EXISTS registry_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  url TEXT,
  store_name TEXT,
  price DECIMAL(10,2),
  currency TEXT DEFAULT 'EUR',
  image_url TEXT,
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  is_claimed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create transport_options table
CREATE TABLE IF NOT EXISTS transport_options (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  direction TEXT NOT NULL DEFAULT 'to_venue',
  departure_location TEXT,
  departure_time TIME,
  return_time TIME,
  capacity INT,
  notes TEXT,
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create guest_transport table
CREATE TABLE IF NOT EXISTS guest_transport (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  guest_id UUID NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
  transport_option_id UUID NOT NULL REFERENCES transport_options(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create rsvp_responses table
CREATE TABLE IF NOT EXISTS rsvp_responses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  guest_id UUID NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  dietary_requirements TEXT[],
  dietary_notes TEXT,
  notes TEXT,
  responded_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(guest_id, event_id)
);

-- Create guest_stay_requests table
CREATE TABLE IF NOT EXISTS guest_stay_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  guest_id UUID NOT NULL UNIQUE REFERENCES guests(id) ON DELETE CASCADE,
  thursday_night BOOLEAN DEFAULT false,
  friday_night BOOLEAN DEFAULT false,
  saturday_night BOOLEAN DEFAULT false,
  notes TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create guest_events table
CREATE TABLE IF NOT EXISTS guest_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  guest_id UUID NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(guest_id, event_id)
);

-- Enable RLS on all new tables
ALTER TABLE venue_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE guest_room_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE external_accommodations ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE faq_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE registry_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE transport_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE guest_transport ENABLE ROW LEVEL SECURITY;
ALTER TABLE rsvp_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE guest_stay_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE guest_events ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for authenticated users (admin)
CREATE POLICY "Allow authenticated users to read venue_rooms"
ON venue_rooms FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to manage venue_rooms"
ON venue_rooms FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update venue_rooms"
ON venue_rooms FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete venue_rooms"
ON venue_rooms FOR DELETE TO authenticated USING (true);

-- Guest room assignments policies
CREATE POLICY "Allow authenticated users to read guest_room_assignments"
ON guest_room_assignments FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to manage guest_room_assignments"
ON guest_room_assignments FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update guest_room_assignments"
ON guest_room_assignments FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete guest_room_assignments"
ON guest_room_assignments FOR DELETE TO authenticated USING (true);

-- External accommodations policies
CREATE POLICY "Allow authenticated users to read external_accommodations"
ON external_accommodations FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow anon to read external_accommodations"
ON external_accommodations FOR SELECT TO anon USING (is_active = true);

CREATE POLICY "Allow authenticated users to manage external_accommodations"
ON external_accommodations FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update external_accommodations"
ON external_accommodations FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete external_accommodations"
ON external_accommodations FOR DELETE TO authenticated USING (true);

-- Site content policies
CREATE POLICY "Allow authenticated users to read site_content"
ON site_content FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow anon to read site_content"
ON site_content FOR SELECT TO anon USING (true);

CREATE POLICY "Allow authenticated users to manage site_content"
ON site_content FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update site_content"
ON site_content FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- FAQ items policies
CREATE POLICY "Allow authenticated users to read faq_items"
ON faq_items FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow anon to read faq_items"
ON faq_items FOR SELECT TO anon USING (is_active = true);

CREATE POLICY "Allow authenticated users to manage faq_items"
ON faq_items FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update faq_items"
ON faq_items FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete faq_items"
ON faq_items FOR DELETE TO authenticated USING (true);

-- Registry items policies
CREATE POLICY "Allow authenticated users to read registry_items"
ON registry_items FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow anon to read registry_items"
ON registry_items FOR SELECT TO anon USING (is_active = true);

CREATE POLICY "Allow authenticated users to manage registry_items"
ON registry_items FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update registry_items"
ON registry_items FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete registry_items"
ON registry_items FOR DELETE TO authenticated USING (true);

-- Transport options policies
CREATE POLICY "Allow authenticated users to read transport_options"
ON transport_options FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow anon to read transport_options"
ON transport_options FOR SELECT TO anon USING (is_active = true);

CREATE POLICY "Allow authenticated users to manage transport_options"
ON transport_options FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update transport_options"
ON transport_options FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete transport_options"
ON transport_options FOR DELETE TO authenticated USING (true);

-- Guest transport policies
CREATE POLICY "Allow authenticated users to read guest_transport"
ON guest_transport FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to manage guest_transport"
ON guest_transport FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete guest_transport"
ON guest_transport FOR DELETE TO authenticated USING (true);

-- RSVP responses policies
CREATE POLICY "Allow authenticated users to read rsvp_responses"
ON rsvp_responses FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow service role to insert rsvp_responses"
ON rsvp_responses FOR INSERT TO service_role WITH CHECK (true);

CREATE POLICY "Allow service role to update rsvp_responses"
ON rsvp_responses FOR UPDATE TO service_role USING (true) WITH CHECK (true);

-- Guest stay requests policies
CREATE POLICY "Allow authenticated users to read guest_stay_requests"
ON guest_stay_requests FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow service role to insert guest_stay_requests"
ON guest_stay_requests FOR INSERT TO service_role WITH CHECK (true);

CREATE POLICY "Allow service role to update guest_stay_requests"
ON guest_stay_requests FOR UPDATE TO service_role USING (true) WITH CHECK (true);

-- Guest events policies
CREATE POLICY "Allow authenticated users to read guest_events"
ON guest_events FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to manage guest_events"
ON guest_events FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete guest_events"
ON guest_events FOR DELETE TO authenticated USING (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_guest_room_assignments_room_id ON guest_room_assignments(room_id);
CREATE INDEX IF NOT EXISTS idx_guest_room_assignments_guest_id ON guest_room_assignments(guest_id);
CREATE INDEX IF NOT EXISTS idx_guest_transport_guest_id ON guest_transport(guest_id);
CREATE INDEX IF NOT EXISTS idx_guest_transport_option_id ON guest_transport(transport_option_id);
CREATE INDEX IF NOT EXISTS idx_rsvp_responses_guest_id ON rsvp_responses(guest_id);
CREATE INDEX IF NOT EXISTS idx_rsvp_responses_event_id ON rsvp_responses(event_id);
CREATE INDEX IF NOT EXISTS idx_guest_events_guest_id ON guest_events(guest_id);
CREATE INDEX IF NOT EXISTS idx_guest_events_event_id ON guest_events(event_id);
