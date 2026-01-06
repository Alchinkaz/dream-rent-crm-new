-- Dream Rent Database Fix v3
-- Run this in Supabase SQL Editor

-- 1. Ensure extensions
create extension if not exists pgcrypto;

-- 2. Repair users table
create table if not exists users (
    id uuid primary key default gen_random_uuid(),
    email text unique not null,
    password_hash text not null,
    name text,
    avatar_url text,
    role text default 'user',
    company_id text references companies(id) on delete set null,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- 3. Repair payments table
do $$ 
begin
    if not exists (select 1 from information_schema.columns where table_name='payments' and column_name='responsible_user_id') then
        alter table payments add column responsible_user_id uuid;
    end if;
end $$;

-- Fix FK for payments -> users
alter table payments drop constraint if exists payments_responsible_user_id_fkey;
alter table payments add constraint payments_responsible_user_id_fkey 
foreign key (responsible_user_id) references users(id) on delete set null;

-- 4. Repair rental_history table
create table if not exists rental_history (
    id uuid primary key default gen_random_uuid(),
    rental_id text references rentals(id) on delete cascade,
    user_id uuid,
    action_type text not null,
    details text,
    old_value text,
    new_value text,
    created_at timestamptz default now()
);

-- Fix FK for rental_history -> users
alter table rental_history drop constraint if exists rental_history_user_id_fkey;
alter table rental_history add constraint rental_history_user_id_fkey 
foreign key (user_id) references users(id) on delete set null;

-- RLS
alter table rental_history enable row level security;
drop policy if exists "Allow all for authenticated" on rental_history;
create policy "Allow all for authenticated" on rental_history for all to authenticated using (true) with check (true);
drop policy if exists "Allow all for public anon" on rental_history;
create policy "Allow all for public anon" on rental_history for all to anon using (true) with check (true);

-- 5. Updated Login Function
create or replace function login(email_input text, password_input text)
returns json as $$
declare
    found_user users%rowtype;
begin
    select * into found_user from users where email = email_input;
    
    if found_user.id is not null and found_user.password_hash = crypt(password_input, found_user.password_hash) then
        return json_build_object(
            'id', found_user.id,
            'email', found_user.email,
            'name', found_user.name,
            'avatarUrl', found_user.avatar_url,
            'role', found_user.role,
            'companyId', found_user.company_id
        );
    else
        return null;
    end if;
end;
$$ language plpgsql security definer;
