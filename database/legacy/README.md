# Legacy SQL migrations (historical, frozen)

These files are **historical only**. They were applied by hand in the Supabase
SQL editor, have duplicate numbers (`11_`, `16_`, `32_`, no `19_`) and
`supabase-migrations/28..30` collide with `28..30` here.

They have been consolidated into the single baseline
`supabase/migrations/20261016000000_baseline.sql`. Do not run or edit these
files; create new changes with `supabase migration new <name>`.

Replay order used to derive the baseline:

1. `01` … `28_change_hotel_stay_nights.sql` (version order, `11_fix_events_policies`
   before `11_fix_rsvp_links`, `16_add_anthropic…` before `16_fix_guests…`)
2. `supabase-migrations/28_split_notes_fields.sql`, `29_add_room_details.sql`
3. `29_create_email_campaigns_table.sql` … `33_add_checklist_item_notes.sql`

Seed files (`22_` hotel rows, `24_seed_faqs`, `supabase-migrations/30_seed_rooms`)
were excluded from the baseline and moved to `supabase/fixtures/tenant1/`.
Note: `22_` uses `ON CONFLICT (name)` but no migration creates a unique
constraint on `external_accommodations.name`, so it fails on a clean database.

`README.legacy-setup.md` is the old manual setup guide, kept for reference.
