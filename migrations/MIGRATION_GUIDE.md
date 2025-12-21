# Database Migration Guide

## Overview
This migration changes the `attending` field in the `rsvp_responses` table from a BOOLEAN to TEXT type, adding support for a third option: "perhaps".

## Migration Steps

### Option 1: Using Supabase Dashboard (Recommended)

1. Log in to your Supabase Dashboard
2. Navigate to your project
3. Go to the **SQL Editor** section
4. Copy the contents of `migrations/change_attending_to_text.sql`
5. Paste it into the SQL editor
6. Click **Run** to execute the migration
7. Verify the migration was successful by running:
   ```sql
   SELECT attending, COUNT(*) FROM rsvp_responses GROUP BY attending;
   ```

### Option 2: Using psql Command Line

If you have direct database access via `psql`:

```bash
psql "your-connection-string-here" -f migrations/change_attending_to_text.sql
```

## What This Migration Does

1. **Creates a temporary column** (`attending_new`) with TEXT type
2. **Migrates existing data**:
   - Converts `TRUE` → `'yes'`
   - Converts `FALSE` → `'no'`
3. **Drops the old boolean column**
4. **Renames the new column** to `attending`
5. **Adds constraints**:
   - NOT NULL constraint
   - CHECK constraint to ensure only valid values: 'yes', 'no', 'perhaps'

## Safety Features

- The migration is wrapped in a `BEGIN`/`COMMIT` transaction
- If any step fails, the entire migration will be rolled back
- Existing data is preserved and converted appropriately

## Rollback (if needed)

If you need to rollback this migration, run:

```sql
BEGIN;

-- Create temporary boolean column
ALTER TABLE rsvp_responses 
ADD COLUMN attending_old BOOLEAN;

-- Convert text back to boolean
UPDATE rsvp_responses
SET attending_old = CASE 
  WHEN attending = 'yes' THEN TRUE
  WHEN attending IN ('no', 'perhaps') THEN FALSE
  ELSE FALSE
END;

-- Drop text column
ALTER TABLE rsvp_responses 
DROP COLUMN attending;

-- Rename boolean column
ALTER TABLE rsvp_responses 
RENAME COLUMN attending_old TO attending;

-- Add NOT NULL constraint
ALTER TABLE rsvp_responses 
ALTER COLUMN attending SET NOT NULL;

COMMIT;
```

**Note**: Rollback will lose the distinction between 'no' and 'perhaps' responses, converting both to `FALSE`.

## Verification

After running the migration, verify it worked correctly:

```sql
-- Check column type
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'rsvp_responses' AND column_name = 'attending';

-- Check data distribution
SELECT attending, COUNT(*) as count
FROM rsvp_responses
GROUP BY attending
ORDER BY count DESC;
```

Expected output for column type:
- `column_name`: attending
- `data_type`: text
- `is_nullable`: NO

## Post-Migration

After successfully running the migration:
1. Deploy the updated application code
2. Test the RSVP form to ensure all three options work correctly
3. Monitor for any errors in your application logs

## Support

If you encounter any issues during migration, please check:
- Your database connection has sufficient permissions
- No other processes are modifying the `rsvp_responses` table during migration
- You have a recent backup of your database
