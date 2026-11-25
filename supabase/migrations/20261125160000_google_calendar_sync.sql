create table if not exists public.hub_google_calendar_connections (
  user_id uuid primary key references auth.users (id) on delete cascade,
  encrypted_refresh_token text not null,
  time_zone text not null default 'UTC',
  last_synced_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.hub_google_calendar_connections enable row level security;

create table if not exists public.hub_google_calendar_oauth_states (
  state_hash text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  time_zone text not null default 'UTC',
  expires_at timestamptz not null
);

alter table public.hub_google_calendar_oauth_states enable row level security;

create table if not exists public.hub_google_calendar_deletions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  google_event_id text not null,
  created_at timestamptz not null default now(),
  processed_at timestamptz
);

create index if not exists hub_google_calendar_deletions_pending
  on public.hub_google_calendar_deletions (user_id, created_at)
  where processed_at is null;

alter table public.hub_google_calendar_deletions enable row level security;
create policy "Users can queue their own Google Calendar deletions"
  on public.hub_google_calendar_deletions
  for insert to authenticated
  with check (user_id = auth.uid());

grant all on public.hub_google_calendar_connections to service_role;
grant all on public.hub_google_calendar_oauth_states to service_role;
grant all on public.hub_google_calendar_deletions to service_role;
revoke all on public.hub_google_calendar_connections from anon, authenticated;
revoke all on public.hub_google_calendar_oauth_states from anon, authenticated;
revoke all on public.hub_google_calendar_deletions from anon, authenticated;
grant insert on public.hub_google_calendar_deletions to authenticated;

create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;
create extension if not exists supabase_vault with schema vault;

create or replace function public.hub_google_calendar_cron()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  function_url text;
  shared_secret text;
  service_key text;
begin
  select decrypted_secret into function_url
  from vault.decrypted_secrets
  where name = 'hub_google_calendar_function_url'
  limit 1;

  select decrypted_secret into shared_secret
  from vault.decrypted_secrets
  where name = 'hub_google_calendar_cron_secret'
  limit 1;

  select decrypted_secret into service_key
  from vault.decrypted_secrets
  where name = 'hub_google_calendar_service_key'
  limit 1;

  if coalesce(function_url, '') = '' or coalesce(shared_secret, '') = '' or coalesce(service_key, '') = '' then
    return;
  end if;

  perform net.http_post(
    url := function_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', service_key,
      'x-cron-secret', shared_secret
    ),
    body := '{"action":"cron"}'::jsonb
  );
end;
$$;
revoke all on function public.hub_google_calendar_cron() from public, anon, authenticated;

do $$
declare
  existing_job bigint;
begin
  select jobid into existing_job from cron.job where jobname = 'hub-google-calendar-sync';
  if existing_job is not null then
    perform cron.unschedule(existing_job);
  end if;
  perform cron.schedule(
    'hub-google-calendar-sync',
    '*/5 * * * *',
    'select public.hub_google_calendar_cron();'
  );
end;
$$;
