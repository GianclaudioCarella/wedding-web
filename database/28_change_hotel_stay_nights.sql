-- Change hotel stay nights from thursday/friday/saturday to friday/saturday/sunday

-- Rename thursday_night column to sunday_night
ALTER TABLE guest_stay_requests
RENAME COLUMN thursday_night TO sunday_night;

-- Update the column comment if it exists
COMMENT ON COLUMN guest_stay_requests.sunday_night IS 'Guest staying Sunday night';
