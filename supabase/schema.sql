-- FinTrack MVP schema + RLS for Supabase Postgres
-- This setup expects JWT sub to contain the auth provider user ID.

create extension if not exists pgcrypto;

do $$ begin
  create type group_role as enum ('owner', 'member');
exception when duplicate_object then null;
end $$;

 do $$ begin
  create type invitation_status as enum ('pending', 'accepted', 'declined');
exception when duplicate_object then null;
end $$;

 do $$ begin
  create type transaction_type as enum ('income', 'expense');
exception when duplicate_object then null;
end $$;

 do $$ begin
  create type transaction_visibility as enum ('personal', 'shared');
exception when duplicate_object then null;
end $$;

create table if not exists profiles (
  id text primary key,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);

create table if not exists groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by text not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups(id) on delete cascade,
  user_id text not null references profiles(id) on delete cascade,
  role group_role not null default 'member',
  created_at timestamptz not null default now(),
  unique (group_id, user_id)
);

create table if not exists invitations (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups(id) on delete cascade,
  invited_email text not null,
  invited_by text not null references profiles(id) on delete cascade,
  status invitation_status not null default 'pending',
  created_at timestamptz not null default now()
);

create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups(id) on delete cascade,
  user_id text not null references profiles(id) on delete cascade,
  type transaction_type not null,
  visibility transaction_visibility not null,
  amount numeric(12,2) not null,
  category text not null,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists idx_group_members_user_id on group_members(user_id);
create index if not exists idx_group_members_group_id on group_members(group_id);
create index if not exists idx_transactions_group_created_at on transactions(group_id, created_at desc);
create index if not exists idx_transactions_user_id on transactions(user_id);
create index if not exists idx_invitations_email_status on invitations(invited_email, status);

create or replace function public.current_user_id()
returns text
language sql
stable
as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (auth.jwt() ->> 'sub')
  );
$$;

alter table profiles enable row level security;
alter table groups enable row level security;
alter table group_members enable row level security;
alter table invitations enable row level security;
alter table transactions enable row level security;

-- Profiles: users can access only their own profile.
drop policy if exists "profiles_self_select" on profiles;
create policy "profiles_self_select" on profiles
for select using (id = public.current_user_id());

drop policy if exists "profiles_self_insert" on profiles;
create policy "profiles_self_insert" on profiles
for insert with check (id = public.current_user_id());

drop policy if exists "profiles_self_update" on profiles;
create policy "profiles_self_update" on profiles
for update using (id = public.current_user_id()) with check (id = public.current_user_id());

-- Groups: visible and editable only to members.
drop policy if exists "groups_member_select" on groups;
create policy "groups_member_select" on groups
for select using (
  exists (
    select 1
    from group_members gm
    where gm.group_id = groups.id and gm.user_id = public.current_user_id()
  )
);

drop policy if exists "groups_member_insert" on groups;
create policy "groups_member_insert" on groups
for insert with check (created_by = public.current_user_id());

drop policy if exists "groups_owner_update" on groups;
create policy "groups_owner_update" on groups
for update using (
  exists (
    select 1
    from group_members gm
    where gm.group_id = groups.id
      and gm.user_id = public.current_user_id()
      and gm.role = 'owner'
  )
);

-- Group members: only members can view. Owners can insert.
drop policy if exists "group_members_member_select" on group_members;
create policy "group_members_member_select" on group_members
for select using (
  exists (
    select 1
    from group_members gm
    where gm.group_id = group_members.group_id and gm.user_id = public.current_user_id()
  )
);

drop policy if exists "group_members_owner_insert" on group_members;
create policy "group_members_owner_insert" on group_members
for insert with check (
  exists (
    select 1
    from group_members gm
    where gm.group_id = group_members.group_id
      and gm.user_id = public.current_user_id()
      and gm.role = 'owner'
  )
  or user_id = public.current_user_id()
);

-- Invitations: group members can create and view invites in their groups.
drop policy if exists "invitations_member_select" on invitations;
create policy "invitations_member_select" on invitations
for select using (
  exists (
    select 1
    from group_members gm
    where gm.group_id = invitations.group_id and gm.user_id = public.current_user_id()
  )
);

drop policy if exists "invitations_member_insert" on invitations;
create policy "invitations_member_insert" on invitations
for insert with check (
  invited_by = public.current_user_id()
  and exists (
    select 1
    from group_members gm
    where gm.group_id = invitations.group_id and gm.user_id = public.current_user_id()
  )
);

drop policy if exists "invitations_email_update" on invitations;
create policy "invitations_email_update" on invitations
for update using (
  lower(invited_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
)
with check (
  lower(invited_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
);

-- Transactions:
-- 1) Members can insert in their own groups.
-- 2) Read access allows shared transactions in group + own personal transactions.
drop policy if exists "transactions_member_insert" on transactions;
create policy "transactions_member_insert" on transactions
for insert with check (
  user_id = public.current_user_id()
  and exists (
    select 1
    from group_members gm
    where gm.group_id = transactions.group_id and gm.user_id = public.current_user_id()
  )
);

drop policy if exists "transactions_member_select" on transactions;
create policy "transactions_member_select" on transactions
for select using (
  exists (
    select 1
    from group_members gm
    where gm.group_id = transactions.group_id and gm.user_id = public.current_user_id()
  )
  and (
    visibility = 'shared'
    or (visibility = 'personal' and user_id = public.current_user_id())
  )
);
