-- Convert FAQ question and answer to JSONB for multi-language support

-- Add new JSONB columns
ALTER TABLE faq_items
  ADD COLUMN question_jsonb JSONB DEFAULT '{}',
  ADD COLUMN answer_jsonb JSONB DEFAULT '{}';

-- Migrate existing data (current data is assumed to be English)
UPDATE faq_items
SET
  question_jsonb = jsonb_build_object('en', question, 'pt', '', 'es', ''),
  answer_jsonb = jsonb_build_object('en', answer, 'pt', '', 'es', '')
WHERE question IS NOT NULL OR answer IS NOT NULL;

-- Drop old columns
ALTER TABLE faq_items
  DROP COLUMN question,
  DROP COLUMN answer;

-- Rename new columns to original names
ALTER TABLE faq_items
  RENAME COLUMN question_jsonb TO question;

ALTER TABLE faq_items
  RENAME COLUMN answer_jsonb TO answer;

-- Add NOT NULL constraint
ALTER TABLE faq_items
  ALTER COLUMN question SET NOT NULL,
  ALTER COLUMN answer SET DEFAULT '{}';
