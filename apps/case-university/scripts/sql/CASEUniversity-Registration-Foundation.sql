-- ============================================================
-- CASE UNIVERSITY - REGISTRATION / PRODUCT MEMBERSHIP FOUNDATION
-- ============================================================
--
-- Purpose:
--   1. Track which CASE product(s) a University auth user belongs to.
--   2. Track the application that originated the user's University signup.
--   3. Backfill existing CASE University auth users.
--   4. Keep membership data service-role controlled.
--
-- Canonical product keys:
--   case_university
--   case_trades
--   case_journal
--   case_budget
--   case_signals
--
-- Run in the CASE University Supabase SQL Editor.
-- ============================================================

begin;

create extension if not exists pgcrypto;

create table if not exists public.case_product_memberships (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null
    references auth.users(id)
    on delete cascade,

  product_key text not null,

  source_product_key text not null
    default 'case_university',

  membership_status text not null
    default 'active',

  joined_at timestamptz not null
    default now(),

  last_seen_at timestamptz null,

  metadata jsonb not null
    default '{}'::jsonb,

  created_at timestamptz not null
    default now(),

  updated_at timestamptz not null
    default now(),

  constraint case_product_memberships_product_key_check
    check (
      product_key in (
        'case_university',
        'case_trades',
        'case_journal',
        'case_budget',
        'case_signals'
      )
    ),

  constraint case_product_memberships_source_product_key_check
    check (
      source_product_key in (
        'case_university',
        'case_trades',
        'case_journal',
        'case_budget',
        'case_signals'
      )
    ),

  constraint case_product_memberships_status_check
    check (
      membership_status in (
        'active',
        'inactive',
        'suspended'
      )
    ),

  constraint case_product_memberships_user_product_unique
    unique (
      user_id,
      product_key
    )
);

create index if not exists
  case_product_memberships_user_id_idx
on public.case_product_memberships (
  user_id
);

create index if not exists
  case_product_memberships_product_key_idx
on public.case_product_memberships (
  product_key
);

create index if not exists
  case_product_memberships_source_product_key_idx
on public.case_product_memberships (
  source_product_key
);

alter table
  public.case_product_memberships
enable row level security;

-- No browser-facing policies are intentionally created here.
-- The registration server action and Admin data layer use the
-- CASE University service-role client for membership writes/reads.

revoke all
on table public.case_product_memberships
from anon;

revoke all
on table public.case_product_memberships
from authenticated;

grant all
on table public.case_product_memberships
to service_role;

-- ------------------------------------------------------------
-- Backfill every existing University auth account.
--
-- If historical user metadata has a trusted source_product key,
-- preserve it. Otherwise classify the original source as
-- case_university.
-- ------------------------------------------------------------

insert into public.case_product_memberships (
  user_id,
  product_key,
  source_product_key,
  membership_status,
  joined_at,
  last_seen_at,
  metadata
)
select
  users.id,

  'case_university',

  case
    when
      coalesce(
        users.raw_user_meta_data ->> 'source_product',
        ''
      ) in (
        'case_university',
        'case_trades',
        'case_journal',
        'case_budget',
        'case_signals'
      )
    then
      users.raw_user_meta_data ->> 'source_product'
    else
      'case_university'
  end,

  'active',

  coalesce(
    users.created_at,
    now()
  ),

  users.last_sign_in_at,

  jsonb_build_object(
    'backfilled',
    true,
    'registration_method',
    coalesce(
      users.raw_app_meta_data ->> 'provider',
      'email'
    )
  )
from auth.users as users
on conflict (
  user_id,
  product_key
)
do update
set
  last_seen_at =
    excluded.last_seen_at,

  updated_at =
    now();

-- ------------------------------------------------------------
-- Verification
-- ------------------------------------------------------------

do $$
declare
  auth_user_count bigint;
  university_membership_count bigint;
begin
  select
    count(*)
  into
    auth_user_count
  from auth.users;

  select
    count(*)
  into
    university_membership_count
  from public.case_product_memberships
  where
    product_key = 'case_university';

  if
    university_membership_count <
    auth_user_count
  then
    raise exception
      'CASE University membership backfill incomplete. auth.users=%, memberships=%',
      auth_user_count,
      university_membership_count;
  end if;
end
$$;

commit;

select
  product_key,
  source_product_key,
  membership_status,
  count(*) as user_count
from public.case_product_memberships
group by
  product_key,
  source_product_key,
  membership_status
order by
  product_key,
  source_product_key,
  membership_status;
