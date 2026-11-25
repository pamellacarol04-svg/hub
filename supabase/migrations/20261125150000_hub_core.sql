create table public.hub_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind text not null,
  parent_id uuid,
  title text not null default '',
  body text,
  day text,
  "at" text,
  at2 text,
  amount numeric,
  num numeric,
  status text,
  cat text,
  url text,
  position integer not null default 0,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  foreign key (parent_id, user_id)
    references public.hub_items (id, user_id) on delete cascade
);

create index hub_items_user_created on public.hub_items (user_id, created_at);
create index hub_items_user_parent on public.hub_items (user_id, parent_id);

create table public.hub_photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  item_id uuid not null,
  path text not null,
  thumb text,
  mime text not null,
  name text,
  w integer,
  h integer,
  bytes bigint not null default 0,
  caption text,
  day text,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  foreign key (item_id, user_id)
    references public.hub_items (id, user_id) on delete cascade
);

create index hub_photos_user_position on public.hub_photos (user_id, position);
create index hub_photos_item on public.hub_photos (item_id);

create table public.hub_settings (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  display_name text,
  alter_ego text,
  intention text,
  intention_day text,
  theme text not null default 'powder',
  low_stim boolean not null default false,
  calm boolean not null default false,
  decor boolean not null default true,
  sound boolean not null default true,
  currency text not null default 'USD',
  monthly_budget numeric,
  board_year integer,
  week_start smallint not null default 1 check (week_start in (0, 1)),
  tour_done boolean not null default false,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create or replace function public.hub_set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = pg_catalog.now();
  return new;
end;
$$;

create trigger hub_items_set_updated_at
  before update on public.hub_items
  for each row execute function public.hub_set_updated_at();

create trigger hub_settings_set_updated_at
  before update on public.hub_settings
  for each row execute function public.hub_set_updated_at();

alter table public.hub_items enable row level security;
alter table public.hub_photos enable row level security;
alter table public.hub_settings enable row level security;

revoke all on public.hub_items, public.hub_photos, public.hub_settings from anon, authenticated;
grant select, insert, update, delete on public.hub_items, public.hub_photos, public.hub_settings to authenticated;

create policy "Users manage their own HUB items"
  on public.hub_items for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "Users manage their own HUB photos"
  on public.hub_photos for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "Users manage their own HUB settings"
  on public.hub_settings for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'hub',
  'hub',
  false,
  8388608,
  array['image/webp', 'image/jpeg', 'application/pdf']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy "Users manage their own HUB files"
  on storage.objects for all to authenticated
  using (
    bucket_id = 'hub'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  )
  with check (
    bucket_id = 'hub'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

create or replace function public.hub_max_photos()
returns integer
language sql
stable
set search_path = ''
as $$
  select 500 where auth.uid() is not null;
$$;

revoke all on function public.hub_max_photos() from public, anon;
grant execute on function public.hub_max_photos() to authenticated;
