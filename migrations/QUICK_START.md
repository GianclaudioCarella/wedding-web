# Quick Migration Reference

## 🚀 For Production Deployment

### Step 1: Run the Database Migration

**Option A: Supabase Dashboard (Recommended)**
1. Go to https://app.supabase.com
2. Select your project
3. Click "SQL Editor" in the left sidebar
4. Copy the entire contents of `migrations/change_attending_to_text.sql`
5. Paste into the SQL editor
6. Click "Run" (or press Cmd/Ctrl + Enter)
7. Wait for "Success. No rows returned" message

**Option B: Command Line**
```bash
psql "postgresql://[user]:[password]@[host]:[port]/[database]" \
  -f migrations/change_attending_to_text.sql
```

### Step 2: Verify the Migration

Run this query to confirm:
```sql
-- Check column type
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'rsvp_responses' AND column_name = 'attending';

-- Expected: data_type = 'text', is_nullable = 'NO'
```

### Step 3: Deploy the Application

```bash
# If using Vercel or similar
git push origin main

# The updated code will automatically deploy
```

### Step 4: Test in Production

1. Visit your RSVP page
2. Check that the dropdown shows all three options:
   - Yes, I'll be there!
   - Sorry, I can't make it
   - Perhaps
3. Submit a test RSVP with each option to verify

## ⚠️ Important Notes

- **Backup First**: Always backup your database before running migrations
- **Downtime**: This migration should take < 1 second for most databases
- **Existing Data**: All existing responses are preserved and converted
- **Rollback Available**: See `MIGRATION_GUIDE.md` if you need to rollback

## 📊 What Changed

| Before | After |
|--------|-------|
| Column Type: `BOOLEAN` | Column Type: `TEXT` |
| Values: `true`, `false` | Values: `'yes'`, `'no'`, `'perhaps'` |
| Options: Yes, No | Options: Yes, No, Perhaps |

## 🆘 Troubleshooting

**Error: "column attending already exists"**
- The migration may have already run. Check with:
  ```sql
  SELECT data_type FROM information_schema.columns 
  WHERE table_name = 'rsvp_responses' AND column_name = 'attending';
  ```

**Error: "permission denied"**
- Ensure you're using an account with `ALTER TABLE` permissions
- In Supabase, use the service role or dashboard SQL editor

**Need to rollback?**
- See the rollback section in `MIGRATION_GUIDE.md`
- Note: Rollback will convert 'perhaps' responses to 'no'

## 📞 Support

If you encounter issues:
1. Check the full `MIGRATION_GUIDE.md` for detailed troubleshooting
2. Verify your database permissions
3. Check Supabase logs for error details
4. Ensure no other processes are modifying the table during migration
