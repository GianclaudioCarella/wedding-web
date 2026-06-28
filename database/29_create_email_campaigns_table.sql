create table if not exists email_campaigns (
  id              uuid default gen_random_uuid() primary key,
  subject         text not null,
  body            text not null,
  recipient_filter text not null default 'all',
  recipient_count  integer not null default 0,
  failed_count     integer not null default 0,
  recipient_names  text,
  sent_at          timestamptz default now(),
  sent_by          text
);

alter table email_campaigns enable row level security;

create policy "Service role full access on email_campaigns"
  on email_campaigns for all
  using (true)
  with check (true);
