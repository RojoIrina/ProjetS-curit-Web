-- CertiVerify Supabase schema, RLS, RPCs and Storage policies.
-- Run in the Supabase SQL editor or with: supabase db push

create extension if not exists "pgcrypto";

do $$ begin
  create type public.user_role as enum ('admin', 'student', 'verifier');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.module_status as enum ('enrolled', 'in_progress', 'completed');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.certificate_status as enum ('draft', 'signed', 'delivered', 'revoked');
exception when duplicate_object then null;
end $$;

create table if not exists public.institutions (
  id uuid primary key default gen_random_uuid(),
  name varchar(255) not null,
  domain varchar(255) not null unique,
  logo_url text,
  seal_text varchar(80) not null default 'CertiVerify Academy',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  institution_id uuid references public.institutions(id) on delete set null,
  email varchar(255) not null unique,
  full_name varchar(255) not null,
  role public.user_role not null default 'student',
  is_active boolean not null default true,
  student_private_ref uuid not null default gen_random_uuid(),
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.key_pairs (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  public_key_pem text not null,
  private_key_ref text not null,
  algorithm varchar(50) not null default 'HMAC-SHA256',
  key_size int not null default 256,
  is_active boolean not null default true,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.modules (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  title varchar(255) not null,
  description text,
  content text not null default '',
  credit_hours int not null default 0,
  "order" int not null default 0,
  duration int not null default 0,
  is_required boolean not null default true,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_modules (
  user_id uuid not null references public.users(id) on delete cascade,
  module_id uuid not null references public.modules(id) on delete cascade,
  status public.module_status not null default 'enrolled',
  completed_at timestamptz,
  primary key (user_id, module_id)
);

create table if not exists public.certificates (
  id uuid primary key default gen_random_uuid(),
  certificate_uid varchar(12) not null unique,
  student_id uuid not null references public.users(id) on delete restrict,
  institution_id uuid not null references public.institutions(id) on delete restrict,
  module_id uuid not null references public.modules(id) on delete restrict,
  issued_by uuid not null references public.users(id) on delete restrict,
  key_pair_id uuid references public.key_pairs(id),
  title varchar(500) not null,
  student_name varchar(255) not null,
  description text,
  document_hash varchar(128) not null,
  digital_signature text not null,
  canonical_data jsonb not null,
  media_path text,
  media_url text,
  status public.certificate_status not null default 'signed',
  issued_at timestamptz not null default now(),
  expires_at timestamptz,
  revoked_at timestamptz,
  revocation_reason text,
  created_at timestamptz not null default now(),
  constraint one_certificate_per_student_module unique (student_id, module_id)
);

create table if not exists public.verification_logs (
  id uuid primary key default gen_random_uuid(),
  certificate_id uuid references public.certificates(id) on delete set null,
  certificate_uid varchar(12),
  method varchar(30) not null default 'id_lookup',
  result varchar(30) not null,
  ip_address varchar(45),
  user_agent text,
  metadata jsonb,
  verified_at timestamptz not null default now()
);

create table if not exists public.audit_trail (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.users(id) on delete set null,
  action varchar(80) not null,
  entity varchar(80) not null,
  entity_id uuid,
  details jsonb,
  created_at timestamptz not null default now()
);

create index if not exists users_role_idx on public.users(role);
create index if not exists modules_institution_order_idx on public.modules(institution_id, "order");
create index if not exists certificates_uid_idx on public.certificates(certificate_uid);
create index if not exists certificates_student_idx on public.certificates(student_id);
create index if not exists certificates_module_idx on public.certificates(module_id);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists institutions_touch_updated_at on public.institutions;
create trigger institutions_touch_updated_at
before update on public.institutions
for each row execute function public.touch_updated_at();

drop trigger if exists users_touch_updated_at on public.users;
create trigger users_touch_updated_at
before update on public.users
for each row execute function public.touch_updated_at();

drop trigger if exists modules_touch_updated_at on public.modules;
create trigger modules_touch_updated_at
before update on public.modules
for each row execute function public.touch_updated_at();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.users
    where id = auth.uid()
      and role = 'admin'
      and is_active = true
  );
$$;

create or replace function public.current_institution_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select institution_id from public.users where id = auth.uid();
$$;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  default_institution uuid;
begin
  select id into default_institution
  from public.institutions
  where is_active = true
  order by created_at
  limit 1;

  insert into public.users (id, institution_id, email, full_name, role)
  values (
    new.id,
    default_institution,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'full_name', split_part(coalesce(new.email, 'Utilisateur'), '@', 1)),
    coalesce((new.raw_user_meta_data->>'role')::public.user_role, 'student')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();

create or replace function public.generate_certificate_uid()
returns text
language plpgsql
as $$
declare
  candidate text;
begin
  loop
    candidate := upper(substr(encode(gen_random_bytes(8), 'hex'), 1, 12));
    exit when not exists (select 1 from public.certificates where certificate_uid = candidate);
  end loop;
  return candidate;
end;
$$;

create or replace function public.issue_certificate_for_module(target_student_id uuid, target_module_id uuid)
returns public.certificates
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  student public.users%rowtype;
  module_row public.modules%rowtype;
  progress public.user_modules%rowtype;
  issuer uuid;
  uid text;
  canonical jsonb;
  canonical_text text;
  hash text;
  signature text;
  active_key uuid;
  cert public.certificates%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Authentification requise';
  end if;

  if auth.uid() <> target_student_id and not public.is_admin() then
    raise exception 'Acces interdit';
  end if;

  select * into student from public.users
  where id = target_student_id and role = 'student' and is_active = true;
  if not found then
    raise exception 'Etudiant introuvable ou inactif';
  end if;

  select * into module_row from public.modules
  where id = target_module_id and is_active = true;
  if not found then
    raise exception 'Module introuvable ou inactif';
  end if;

  if module_row.institution_id <> student.institution_id then
    raise exception 'Module et etudiant dans deux institutions differentes';
  end if;

  select * into progress from public.user_modules
  where user_id = target_student_id and module_id = target_module_id;
  if not found or progress.status <> 'completed' then
    raise exception 'Certificat refuse: le module doit etre completed';
  end if;

  select id into active_key from public.key_pairs
  where institution_id = student.institution_id and is_active = true
  order by created_at desc
  limit 1;

  issuer := case when public.is_admin() then auth.uid() else (
    select id from public.users
    where institution_id = student.institution_id and role = 'admin' and is_active = true
    order by created_at
    limit 1
  ) end;
  if issuer is null then
    raise exception 'Aucun administrateur actif disponible pour emettre le certificat';
  end if;

  uid := public.generate_certificate_uid();
  canonical := jsonb_build_object(
    'certificateUid', uid,
    'studentId', student.id,
    'studentName', student.full_name,
    'institutionId', student.institution_id,
    'moduleId', module_row.id,
    'title', module_row.title,
    'issuedAt', now()
  );
  canonical_text := canonical::text;
  hash := encode(digest(canonical_text, 'sha256'), 'hex');
  signature := encode(hmac(canonical_text, student.student_private_ref::text || ':' || module_row.id::text, 'sha256'), 'hex');

  insert into public.certificates (
    certificate_uid, student_id, institution_id, module_id, issued_by, key_pair_id,
    title, student_name, description, document_hash, digital_signature, canonical_data, status
  )
  values (
    uid, student.id, student.institution_id, module_row.id, issuer, active_key,
    module_row.title, student.full_name, module_row.description, hash, signature, canonical, 'signed'
  )
  returning * into cert;

  insert into public.audit_trail(actor_id, action, entity, entity_id, details)
  values (auth.uid(), 'certificate.issue', 'certificates', cert.id, jsonb_build_object('module_id', target_module_id));

  return cert;
end;
$$;

create or replace function public.verify_certificate(lookup_uid text)
returns table (
  valid boolean,
  result text,
  id uuid,
  certificate_uid text,
  student_name text,
  title text,
  institution_name text,
  institution_seal text,
  module_id uuid,
  document_hash text,
  digital_signature text,
  media_url text,
  issued_at timestamptz,
  expires_at timestamptz,
  revoked_at timestamptz,
  revocation_reason text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  cert public.certificates%rowtype;
  institution public.institutions%rowtype;
  verification_result text;
  is_valid boolean;
begin
  select * into cert
  from public.certificates
  where certificate_uid = upper(trim(lookup_uid))
  limit 1;

  if not found then
    insert into public.verification_logs(certificate_uid, result)
    values (upper(trim(lookup_uid)), 'not_found');

    return query select false, 'not_found', null::uuid, upper(trim(lookup_uid)), null::text, null::text,
      null::text, null::text, null::uuid, null::text, null::text, null::text,
      null::timestamptz, null::timestamptz, null::timestamptz, null::text;
    return;
  end if;

  select * into institution from public.institutions where institutions.id = cert.institution_id;

  if cert.revoked_at is not null or cert.status = 'revoked' then
    verification_result := 'revoked';
    is_valid := false;
  elsif cert.expires_at is not null and cert.expires_at < now() then
    verification_result := 'expired';
    is_valid := false;
  else
    verification_result := 'valid';
    is_valid := true;
  end if;

  insert into public.verification_logs(certificate_id, certificate_uid, result)
  values (cert.id, cert.certificate_uid, verification_result);

  return query select is_valid, verification_result, cert.id, cert.certificate_uid::text,
    cert.student_name::text, cert.title::text, institution.name::text, institution.seal_text::text,
    cert.module_id, cert.document_hash::text, cert.digital_signature::text, cert.media_url::text,
    cert.issued_at, cert.expires_at, cert.revoked_at, cert.revocation_reason;
end;
$$;

create or replace function public.attach_certificate_media(target_certificate_id uuid, target_media_path text, target_media_url text)
returns public.certificates
language plpgsql
security definer
set search_path = public
as $$
declare
  cert public.certificates%rowtype;
begin
  select * into cert from public.certificates where id = target_certificate_id;
  if not found then
    raise exception 'Certificat introuvable';
  end if;

  if cert.student_id <> auth.uid() and not public.is_admin() then
    raise exception 'Acces interdit';
  end if;

  update public.certificates
  set media_path = target_media_path,
      media_url = target_media_url
  where id = target_certificate_id
  returning * into cert;

  return cert;
end;
$$;

alter table public.institutions enable row level security;
alter table public.users enable row level security;
alter table public.key_pairs enable row level security;
alter table public.modules enable row level security;
alter table public.user_modules enable row level security;
alter table public.certificates enable row level security;
alter table public.verification_logs enable row level security;
alter table public.audit_trail enable row level security;

drop policy if exists "institutions authenticated read" on public.institutions;
create policy "institutions authenticated read" on public.institutions
for select to authenticated using (true);

drop policy if exists "institutions admin write" on public.institutions;
create policy "institutions admin write" on public.institutions
for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "users own profile read" on public.users;
create policy "users own profile read" on public.users
for select to authenticated using (id = auth.uid() or public.is_admin());

drop policy if exists "users admin insert" on public.users;
create policy "users admin insert" on public.users
for insert to authenticated with check (public.is_admin());

drop policy if exists "users own safe update" on public.users;
create policy "users own safe update" on public.users
for update to authenticated using (id = auth.uid() or public.is_admin())
with check (
  public.is_admin()
  or (id = auth.uid() and role = (select role from public.users where id = auth.uid()))
);

drop policy if exists "users admin delete" on public.users;
create policy "users admin delete" on public.users
for delete to authenticated using (public.is_admin());

drop policy if exists "modules authenticated read" on public.modules;
create policy "modules authenticated read" on public.modules
for select to authenticated using (is_active = true or public.is_admin());

drop policy if exists "modules admin write" on public.modules;
create policy "modules admin write" on public.modules
for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "user_modules own or admin read" on public.user_modules;
create policy "user_modules own or admin read" on public.user_modules
for select to authenticated using (user_id = auth.uid() or public.is_admin());

drop policy if exists "user_modules student enroll self" on public.user_modules;
create policy "user_modules student enroll self" on public.user_modules
for insert to authenticated with check (user_id = auth.uid() or public.is_admin());

drop policy if exists "user_modules own or admin update" on public.user_modules;
create policy "user_modules own or admin update" on public.user_modules
for update to authenticated using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());

drop policy if exists "certificates student own or admin read" on public.certificates;
create policy "certificates student own or admin read" on public.certificates
for select to authenticated using (student_id = auth.uid() or public.is_admin());

drop policy if exists "certificates admin write" on public.certificates;
create policy "certificates admin write" on public.certificates
for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "keypairs admin only" on public.key_pairs;
create policy "keypairs admin only" on public.key_pairs
for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "verification logs admin read" on public.verification_logs;
create policy "verification logs admin read" on public.verification_logs
for select to authenticated using (public.is_admin());

drop policy if exists "audit admin read" on public.audit_trail;
create policy "audit admin read" on public.audit_trail
for select to authenticated using (public.is_admin());

insert into public.institutions (id, name, domain, seal_text)
values ('00000000-0000-0000-0000-000000000001', 'CertiVerify Academy', 'certiverify.local', 'CV-ACADEMY-SEAL')
on conflict (id) do nothing;

insert into public.key_pairs (id, institution_id, public_key_pem, private_key_ref)
values (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  'Supabase HMAC public verification reference',
  'managed-by-supabase-rpc'
)
on conflict (id) do nothing;

insert into public.modules (id, institution_id, title, description, content, credit_hours, "order", duration, is_required)
values
  (
    '10000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    'Fondamentaux de la Cybersécurité',
    'Bases de la sécurité web, authentification et gestion des risques.',
    'Menaces OWASP, bonnes pratiques de mot de passe, isolation des sessions et principes Zero Trust.',
    8,
    1,
    90,
    true
  ),
  (
    '10000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000001',
    'Développement Web Moderne',
    'Construction d’applications React sécurisées avec API typées.',
    'Composants, routes protégées, appels API et gestion d’état côté client.',
    10,
    2,
    120,
    true
  ),
  (
    '10000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000001',
    'Vérification Cryptographique',
    'Hash, signature numérique, preuves visuelles et audit de certificats.',
    'SHA-256, HMAC, vérification publique par UID et journalisation des consultations.',
    12,
    3,
    150,
    true
  )
on conflict (id) do nothing;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('certificates_media', 'certificates_media', true, 5242880, array['image/png', 'image/jpeg'])
on conflict (id) do update set
  public = true,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "certificates media public read" on storage.objects;
create policy "certificates media public read" on storage.objects
for select to public using (bucket_id = 'certificates_media');

drop policy if exists "certificates media authenticated upload" on storage.objects;
create policy "certificates media authenticated upload" on storage.objects
for insert to authenticated with check (
  bucket_id = 'certificates_media'
  and (public.is_admin() or owner = auth.uid())
);

drop policy if exists "certificates media authenticated update" on storage.objects;
create policy "certificates media authenticated update" on storage.objects
for update to authenticated using (
  bucket_id = 'certificates_media'
  and (public.is_admin() or owner = auth.uid())
) with check (
  bucket_id = 'certificates_media'
  and (public.is_admin() or owner = auth.uid())
);

grant usage on schema public to anon, authenticated;
grant execute on function public.verify_certificate(text) to anon, authenticated;
grant execute on function public.issue_certificate_for_module(uuid, uuid) to authenticated;
grant execute on function public.attach_certificate_media(uuid, text, text) to authenticated;
