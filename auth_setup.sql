-- ==========================================
-- AUTHENTICATION SETUP (Custom Table)
-- ==========================================

-- 1. Enable pgcrypto for password hashing (required for crypt() and gen_salt())
create extension if not exists pgcrypto;

-- 2. Create users table if it doesn't exist
create table if not exists users (
    id uuid primary key default gen_random_uuid(),
    email text unique not null,
    password_hash text not null, -- Stores the hashed password, never plain text
    name text,
    avatar_url text,
    role text default 'user', -- 'admin', 'manager', etc.
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- 3. Insert the specific Admin User
-- Password: nE2@0wW1I|N[TK>*9VI
-- We use crypt() to hash the password before storing it. 
-- ON CONFLICT ensures we don't duplicate if run multiple times.
insert into users (email, password_hash, name, avatar_url, role)
values (
    'info@dreamrent.kz', 
    crypt('nE2@0wW1I|N[TK>*9VI', gen_salt('bf')), -- bf = Blowfish algorithm (bcrypt)
    'Admin',
    'https://ui-avatars.com/api/?name=Admin&background=0a0a0a&color=fff&bold=true',
    'admin'
)
on conflict (email) do update 
set password_hash = crypt('nE2@0wW1I|N[TK>*9VI', gen_salt('bf')),
    name = 'Admin';

-- 4. Secure Login Function (RPC)
-- This function runs on the database server. The frontend sends email/password,
-- and this function verifies them without exposing the hash to the network.
create or replace function login(email_input text, password_input text)
returns json as $$
declare
    found_user users%rowtype;
begin
    -- 1. Try to find the user by email
    select * into found_user from users where email = email_input;
    
    -- 2. Verify: User exists AND password hash matches the input
    if found_user.id is not null and found_user.password_hash = crypt(password_input, found_user.password_hash) then
        -- SUCCESS: Return user info (excluding private hash)
        return json_build_object(
            'id', found_user.id,
            'email', found_user.email,
            'name', found_user.name,
            'avatar_url', found_user.avatar_url,
            'role', found_user.role
        );
    else
        -- FAILURE: Return null (or you could raise an exception)
        return null;
    end if;
end;
$$ language plpgsql security definer;
