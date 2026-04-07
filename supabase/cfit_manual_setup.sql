begin;

create extension if not exists pgcrypto;

create table if not exists public.tests (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  instructions text,
  time_limit_minutes numeric(5,2),
  passing_score integer,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.applicant_tests (
  id uuid primary key default gen_random_uuid(),
  applicant_id uuid not null references public.applicants(id) on delete cascade,
  test_id uuid not null references public.tests(id) on delete cascade,
  access_code text not null unique,
  status text not null default 'pending' check (status in ('pending', 'started', 'completed', 'expired')),
  score integer,
  score_percentage integer,
  total_points integer,
  answers jsonb,
  sent_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  expires_at timestamptz not null default (now() + interval '7 days')
);

create index if not exists idx_applicant_tests_applicant_id on public.applicant_tests(applicant_id);
create index if not exists idx_applicant_tests_access_code on public.applicant_tests(access_code);
create index if not exists idx_applicant_tests_status on public.applicant_tests(status);

alter table public.tests enable row level security;
alter table public.applicant_tests enable row level security;

drop policy if exists "tests_auth_all" on public.tests;
create policy "tests_auth_all"
on public.tests
for all
to authenticated
using (true)
with check (true);

drop policy if exists "tests_anon_select" on public.tests;
create policy "tests_anon_select"
on public.tests
for select
to anon
using (true);

drop policy if exists "applicant_tests_auth_all" on public.applicant_tests;
create policy "applicant_tests_auth_all"
on public.applicant_tests
for all
to authenticated
using (true)
with check (true);

drop policy if exists "applicant_tests_anon_select" on public.applicant_tests;
create policy "applicant_tests_anon_select"
on public.applicant_tests
for select
to anon
using (true);

drop policy if exists "applicant_tests_anon_update" on public.applicant_tests;
create policy "applicant_tests_anon_update"
on public.applicant_tests
for update
to anon
using (true)
with check (true);

insert into public.tests (
  title,
  description,
  instructions,
  time_limit_minutes,
  passing_score,
  is_active
)
select
  'Tes Intelegensi',
  'Culture Fair Intelligence Test Skala 3B berbasis 4 subtes.',
  'Instruksi kandidat dan soal di-load dari aset aplikasi.',
  12.5,
  null,
  true
where not exists (
  select 1 from public.tests where title = 'Tes Intelegensi'
);

commit;
