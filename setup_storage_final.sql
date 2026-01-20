-- ==========================================
-- FINAL STORAGE SETUP FOR VEHICLES & DOCUMENTS
-- ==========================================

-- 1. Create the 'vehicles' bucket (used for transport photos, avatars, and docs)
-- We ensure the bucket is public so images can be accessed via URL.
insert into storage.buckets (id, name, public)
values ('vehicles', 'vehicles', true)
on conflict (id) do update set public = true;

-- 2. Enable Row Level Security (RLS) on storage.objects
alter table storage.objects enable row level security;

-- 3. Create Access Policies
-- These policies allow anyone to view files but only logged-in users to upload/modify them.

-- Policy: Allow Public Read Access
drop policy if exists "Public Access Vehicles" on storage.objects;
create policy "Public Access Vehicles"
  on storage.objects for select
  using ( bucket_id = 'vehicles' );

-- Policy: Allow Authenticated Upload
drop policy if exists "Admin Upload Vehicles" on storage.objects;
create policy "Admin Upload Vehicles"
  on storage.objects for insert
  with check ( bucket_id = 'vehicles' and auth.role() = 'authenticated' );

-- Policy: Allow Authenticated Update
drop policy if exists "Admin Update Vehicles" on storage.objects;
create policy "Admin Update Vehicles"
  on storage.objects for update
  using ( bucket_id = 'vehicles' and auth.role() = 'authenticated' );

-- Policy: Allow Authenticated Delete
drop policy if exists "Admin Delete Vehicles" on storage.objects;
create policy "Admin Delete Vehicles"
  on storage.objects for delete
  using ( bucket_id = 'vehicles' and auth.role() = 'authenticated' );
