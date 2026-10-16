-- Rename existing notes column to save_the_date_notes
ALTER TABLE guests RENAME COLUMN notes TO save_the_date_notes;

-- Create new notes column for internal admin notes
ALTER TABLE guests ADD COLUMN notes TEXT;
