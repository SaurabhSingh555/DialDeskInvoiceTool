-- ============================================================================
-- DialDesk Invoice Automation Portal — Supabase Schema
-- ----------------------------------------------------------------------------
-- HOW TO USE:
--   1. Open your Supabase project -> SQL Editor -> New Query.
--   2. Paste this entire file and click "Run".
--   3. Create a Storage bucket named "invoices" (Storage -> New bucket ->
--      name: invoices, Public: OFF). The storage policies below will apply.
--
-- This file creates:
--   * smtp_config
--   * cc_configuration
--   * client_templates
--   * invoice_history
--   * crm_settings
-- With: UUID primary keys, created_at defaults, updated_at trigger,
--       indexes, RLS disabled, storage policies for the "invoices" bucket.
-- ============================================================================

-- Required for gen_random_uuid()
create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- Generic updated_at trigger function
-- ----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ============================================================================
-- TABLE: smtp_config
-- ============================================================================
create table if not exists public.smtp_config (
  id                uuid primary key default gen_random_uuid(),
  smtp_host         text        not null default '',
  smtp_port         integer     not null default 587,
  username          text        not null default '',
  password_encrypted text       not null default '',
  sender_email      text        not null default '',
  sender_name       text        not null default 'DialDesk Operations',
  tls_enabled       boolean     not null default true,
  ssl_enabled       boolean     not null default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

drop trigger if exists trg_smtp_config_updated_at on public.smtp_config;
create trigger trg_smtp_config_updated_at
  before update on public.smtp_config
  for each row execute function public.set_updated_at();

-- ============================================================================
-- TABLE: cc_configuration
-- ============================================================================
create table if not exists public.cc_configuration (
  id          uuid primary key default gen_random_uuid(),
  email       text        not null,
  enabled     boolean     not null default true,
  created_at  timestamptz not null default now()
);

create index if not exists idx_cc_configuration_enabled on public.cc_configuration (enabled);
create unique index if not exists uq_cc_configuration_email on public.cc_configuration (email);

-- ============================================================================
-- TABLE: client_templates
-- ============================================================================
create table if not exists public.client_templates (
  id                uuid primary key default gen_random_uuid(),
  client_id         text        not null,
  client_name       text        not null,
  client_email      text        not null default '',
  subject_template  text        not null default 'Invoice for {{client_name}} — {{month}} {{year}}',
  email_template    text        not null default '',
  signature         text        not null default '',
  cc_override       text        not null default '',        -- comma separated emails
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create unique index if not exists uq_client_templates_client_id on public.client_templates (client_id);
create index if not exists idx_client_templates_client_name on public.client_templates (client_name);

drop trigger if exists trg_client_templates_updated_at on public.client_templates;
create trigger trg_client_templates_updated_at
  before update on public.client_templates
  for each row execute function public.set_updated_at();

-- ============================================================================
-- TABLE: invoice_history
-- ============================================================================
create table if not exists public.invoice_history (
  id            uuid primary key default gen_random_uuid(),
  client_id     text        not null default '',
  client_name   text        not null default '',
  invoice_name  text        not null default '',
  storage_path  text        not null default '',
  storage_url   text        not null default '',
  sent_to       text        not null default '',
  cc            text        not null default '',            -- comma separated
  subject       text        not null default '',
  email_body    text        not null default '',
  status        text        not null default 'pending',     -- sent | failed | retrying | pending
  error_message text        not null default '',
  sent_at       timestamptz,
  created_at    timestamptz not null default now()
);

create index if not exists idx_invoice_history_client_id on public.invoice_history (client_id);
create index if not exists idx_invoice_history_status on public.invoice_history (status);
create index if not exists idx_invoice_history_created_at on public.invoice_history (created_at desc);

-- ============================================================================
-- TABLE: crm_settings
-- ============================================================================
create table if not exists public.crm_settings (
  id            uuid primary key default gen_random_uuid(),
  crm_email     text        not null default '',
  crm_password  text        not null default '',
  last_token    text        not null default '',
  last_sync     timestamptz,
  auto_sync     boolean     not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

drop trigger if exists trg_crm_settings_updated_at on public.crm_settings;
create trigger trg_crm_settings_updated_at
  before update on public.crm_settings
  for each row execute function public.set_updated_at();

-- ============================================================================
-- RLS: DISABLED (backend uses the service role key)
-- ============================================================================
alter table public.smtp_config       disable row level security;
alter table public.cc_configuration  disable row level security;
alter table public.client_templates  disable row level security;
alter table public.invoice_history   disable row level security;
alter table public.crm_settings      disable row level security;

-- ============================================================================
-- STORAGE POLICIES for the "invoices" bucket
-- (bucket itself is created from the Storage UI; keep it PRIVATE)
-- The backend uses the service role key which bypasses RLS, but these policies
-- allow signed-URL access and anon reads to be tightly controlled.
-- ============================================================================
insert into storage.buckets (id, name, public)
values ('invoices', 'invoices', false)
on conflict (id) do nothing;

-- Allow service role full access (service key bypasses RLS anyway; explicit for clarity)
drop policy if exists "invoices_service_all" on storage.objects;
create policy "invoices_service_all"
  on storage.objects for all
  to service_role
  using (bucket_id = 'invoices')
  with check (bucket_id = 'invoices');

-- Optional: allow authenticated reads (not used with no-auth UI, kept for future)
drop policy if exists "invoices_auth_read" on storage.objects;
create policy "invoices_auth_read"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'invoices');

-- ============================================================================
-- Seed a single empty config row for smtp/crm so the UI has something to edit
-- ============================================================================
insert into public.smtp_config (smtp_host) 
select ''
where not exists (select 1 from public.smtp_config);

insert into public.crm_settings (crm_email, crm_password)
select '', ''
where not exists (select 1 from public.crm_settings);

-- Done.
