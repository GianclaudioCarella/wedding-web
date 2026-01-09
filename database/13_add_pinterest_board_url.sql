-- Add pinterest_board_url column to user_settings table
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS pinterest_board_url TEXT;
