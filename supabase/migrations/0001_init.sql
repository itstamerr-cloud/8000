-- ============================================================
-- 8000 — Account targeting & field-sales distribution
-- Full schema, functions, RLS and hardening (already applied
-- to the Supabase project "8000"). Kept here for reproducibility.
-- ============================================================

create extension if not exists pgcrypto;

-- 1) accounts
create table accounts (
  id uuid primary key default gen_random_uuid(),
  seq integer not null,                       -- original file order (sequential distribution)
  name text not null,
  sector text,
  phone text,
  region text,
  status text not null default 'new',         -- new | distributed
  created_at timestamptz default now()
);
create unique index accounts_seq_idx on accounts(seq);
create index accounts_status_seq_idx on accounts(status, seq);

-- 2) employees
create table employees (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  token text not null unique,                 -- personal-link secret
  phone text,
  active boolean not null default true,
  created_at timestamptz default now()
);

-- 3) groups (5 accounts that move together)
create table groups (
  id uuid primary key default gen_random_uuid(),
  number serial,
  created_at timestamptz default now()
);

-- 4) group members
create table group_accounts (
  group_id uuid references groups(id) on delete cascade,
  account_id uuid references accounts(id) on delete cascade,
  primary key (group_id, account_id)
);

-- 5) assignments (one row = a group assigned to an employee on a day = a hop)
create table assignments (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups(id) on delete cascade,
  employee_id uuid not null references employees(id),
  day integer not null,
  assigned_date date not null default current_date,
  created_at timestamptz default now(),
  unique (group_id, employee_id)              -- no employee retries the same group
);
create unique index assignments_emp_day_idx on assignments(employee_id, day); -- cap: one group per employee per day

-- 6) attempts (per-account response within an assignment)
create table attempts (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references assignments(id) on delete cascade,
  account_id uuid not null references accounts(id),
  group_id uuid not null references groups(id),
  employee_id uuid not null references employees(id),
  day integer not null,
  status text not null default 'pending',     -- pending|no_answer|interested|not_interested|callback
  note text default '',
  updated_at timestamptz default now()
);
create index attempts_emp_day_idx on attempts(employee_id, day);
create index attempts_account_idx on attempts(account_id);

-- ---------- daily distribution ----------
create or replace function distribute_day(p_day integer)
returns jsonb language plpgsql security definer
set search_path = public, pg_temp as $$
declare
  v_emp record; v_group uuid; v_assignment uuid; v_ids uuid[];
  v_groups int := 0; v_accts int := 0;
begin
  if exists (select 1 from assignments where day = p_day) then
    raise exception 'اليوم % موزّع مسبقاً', p_day;
  end if;

  for v_emp in select id from employees where active = true order by created_at loop
    select array_agg(id) into v_ids
      from (select id from accounts where status = 'new' order by seq limit 5) s;
    if v_ids is null then exit; end if;

    insert into groups default values returning id into v_group;
    insert into assignments(group_id, employee_id, day)
      values (v_group, v_emp.id, p_day) returning id into v_assignment;
    insert into group_accounts(group_id, account_id)
      select v_group, a from unnest(v_ids) a;
    insert into attempts(assignment_id, account_id, group_id, employee_id, day)
      select v_assignment, a, v_group, v_emp.id, p_day from unnest(v_ids) a;
    update accounts set status = 'distributed' where id = any(v_ids);

    v_groups := v_groups + 1; v_accts := v_accts + array_length(v_ids,1);
  end loop;

  return jsonb_build_object('groups', v_groups, 'accounts', v_accts, 'day', p_day);
end; $$;

-- ---------- group redistribution ----------
create or replace function redistribute_group(p_group uuid, p_employee uuid, p_day integer)
returns uuid language plpgsql security definer
set search_path = public, pg_temp as $$
declare v_assignment uuid; v_ids uuid[];
begin
  if exists (select 1 from assignments where group_id = p_group and employee_id = p_employee) then
    raise exception 'هذا الموظف جرّب المجموعة من قبل';
  end if;
  if exists (select 1 from assignments where employee_id = p_employee and day = p_day) then
    raise exception 'الموظف لديه مجموعة في هذا اليوم';
  end if;

  insert into assignments(group_id, employee_id, day)
    values (p_group, p_employee, p_day) returning id into v_assignment;
  select array_agg(account_id) into v_ids from group_accounts where group_id = p_group;
  insert into attempts(assignment_id, account_id, group_id, employee_id, day)
    select v_assignment, a, p_group, p_employee, p_day from unnest(v_ids) a;
  return v_assignment;
end; $$;

-- ---------- RLS ----------
alter table accounts        enable row level security;
alter table employees       enable row level security;
alter table groups          enable row level security;
alter table group_accounts  enable row level security;
alter table assignments     enable row level security;
alter table attempts        enable row level security;

create policy admin_all on accounts       for all to authenticated using (true) with check (true);
create policy admin_all on employees      for all to authenticated using (true) with check (true);
create policy admin_all on groups         for all to authenticated using (true) with check (true);
create policy admin_all on group_accounts for all to authenticated using (true) with check (true);
create policy admin_all on assignments    for all to authenticated using (true) with check (true);
create policy admin_all on attempts       for all to authenticated using (true) with check (true);
-- anon has no policy = no direct reads. Employee access is server-side via service_role only.

-- ---------- hardening: admin-only RPC execution ----------
revoke execute on function public.distribute_day(integer) from public, anon;
revoke execute on function public.redistribute_group(uuid, uuid, integer) from public, anon;
grant execute on function public.distribute_day(integer) to authenticated, service_role;
grant execute on function public.redistribute_group(uuid, uuid, integer) to authenticated, service_role;
