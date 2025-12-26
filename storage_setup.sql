-- ==========================================
-- STORAGE SETUP
-- ==========================================

-- 1. Create the 'vehicles' bucket for storing images
-- We use ON CONFLICT to avoid errors if it already exists.
insert into storage.buckets (id, name, public)
values ('vehicles', 'vehicles', true)
on conflict (id) do update set public = true;

-- 2. Enable Row Level Security (RLS) on storage.objects
-- This is usually enabled by default, but good to ensure.
alter table storage.objects enable row level security;

-- 3. Create Access Policies
-- NOTE: We drop existing policies first to avoid "policy already exists" errors during re-runs.

-- Policy: Public Read Access
-- Anyone (even unauthenticated) can view vehicle images.
drop policy if exists "Public Access Vehicles" on storage.objects;
create policy "Public Access Vehicles"
  on storage.objects for select
  using ( bucket_id = 'vehicles' );

-- Policy: Admin Upload Access
-- Only authenticated users (admins) can upload images.
drop policy if exists "Admin Upload Vehicles" on storage.objects;
create policy "Admin Upload Vehicles"
  on storage.objects for insert
  with check ( bucket_id = 'vehicles' and auth.role() = 'authenticated' );

-- Policy: Admin Update Access
drop policy if exists "Admin Update Vehicles" on storage.objects;
create policy "Admin Update Vehicles"
  on storage.objects for update
  using ( bucket_id = 'vehicles' and auth.role() = 'authenticated' );

-- Policy: Admin Delete Access
drop policy if exists "Admin Delete Vehicles" on storage.objects;
create policy "Admin Delete Vehicles"
  on storage.objects for delete
  using ( bucket_id = 'vehicles' and auth.role() = 'authenticated' );
