-- Dream Rent Rental History Setup

-- 1. Create rental_history table
create table if not exists rental_history (
    id uuid primary key default gen_random_uuid(),
    rental_id text references rentals(id) on delete cascade,
    user_id uuid references users(id) on delete set null,
    action_type text not null, -- 'status_change', 'payment', 'comment', 'creation'
    details text, -- Human readable description
    old_value text,
    new_value text,
    created_at timestamptz default now()
);

-- 2. Enable RLS
alter table rental_history enable row level security;

-- 3. Policies
create policy "Allow all for authenticated" on rental_history for all to authenticated using (true) with check (true);
create policy "Allow all for public anon" on rental_history for all to anon using (true) with check (true);

-- 4. Update payments table to be more explicit about relationship
-- (It already has responsible_user_id uuid, but let's make sure it's linked to our users table)
-- Note: If responsible_user_id was intended for auth.users, we might need a join or keep it as is.
-- Our 'users' table id is also uuid, so we are good.
