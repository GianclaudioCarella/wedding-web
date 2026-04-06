-- Add room details columns
ALTER TABLE venue_rooms ADD COLUMN section TEXT;
ALTER TABLE venue_rooms ADD COLUMN amenities TEXT[] DEFAULT '{}';
ALTER TABLE venue_rooms ADD COLUMN extra_bed_type TEXT; -- 'supletoria', 'cuna', null
ALTER TABLE venue_rooms ADD COLUMN sort_order INT DEFAULT 0;
ALTER TABLE venue_rooms ADD COLUMN reserved_for TEXT; -- nullable, e.g. "Gian & Cat (Newlyweds)"

-- Create index for section grouping
CREATE INDEX idx_venue_rooms_section_sort ON venue_rooms(section, sort_order);
