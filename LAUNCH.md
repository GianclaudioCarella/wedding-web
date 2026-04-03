# Launch Checklist

## 🔴 Pre-launch blockers
Nothing can go out without these.

- [x] Invitation sending flow — admin bulk send → Resend email → unique guest link
- [x] Conditional viewing — reverted to DB logic (timeline events, accommodation)
- [x] Confirmation page — styled to match invite/RSVP pages
- [x] Smooth scroll — `html { scroll-behavior: smooth }` in globals.css
- [x] Mobile QA — hotel 2×2 grid fixed, FAQ section padding fixed
- [ ] Set up sending domain in Resend (currently using onboarding@resend.dev sandbox)
- [ ] Update email designs — invitation + confirmation emails to match site aesthetic

---

## 🟡 Before invitations go out
Guests will see these.

- [ ] Real content — venue name/address, FAQ answers, hotel suggestions, Google Maps link, honeymoon fund link, contact email, real images
- [ ] pt/es locale pages — still old design + save-the-date GIF
- [x] RSVP update flow — confirmation email with "View invitation" + "Edit RSVP" links ✓
- [ ] RSVP deadline — lock form after a set date so guests can't change response

---

## 🟠 Admin & operations
Needed to manage responses once invitations are live.

- [x] RSVP details in admin guests view — dietary, stay nights, +1, notes all visible
- [ ] RSVP dashboard — at-a-glance yes/no/maybe counts per event
- [ ] Email notifications — alert to Gian & Cat when an RSVP is submitted
- [x] Content management — FAQ admin section (Supabase table + CRUD)
- [x] Content management — Hotels/Accommodation admin section (Supabase table + CRUD)
- [ ] Guest list CSV import

---

## 🔵 Longer term
Post-launch, closer to the date.

- [ ] Seating plan / table allocation tool
- [ ] Post-wedding photo & media sharing
- [ ] Built-in email composer in admin (send/manage emails without leaving the platform) — nice to have, currently uses Resend externally

---

## ✅ Done
- [x] Invite page design (`/invite?guest=TOKEN`)
- [x] RSVP form (`/rsvp?guest=TOKEN`) — per-event, dietary, stay nights, +1
- [x] FAB navigation with smooth anchor links
- [x] Admin: events management
- [x] Scroll-progress timeline
- [x] Venue + accommodation section
- [x] Registry section
- [x] FAQ section with contact
- [x] RSVP CTA section
