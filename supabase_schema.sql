-- Dream Rent Supabase Schema

-- Enable necessary extensions
create extension if not exists "uuid-ossp";

-- 1. ENUMS
create type client_rating as enum ('trusted', 'caution', 'blacklist');
create type client_channel as enum ('website', 'whatsapp', 'telegram', 'instagram', 'phone', 'recommendation', 'old_client');
create type vehicle_status as enum ('available', 'rented', 'maintenance');
create type vehicle_condition as enum ('new', 'good', 'broken');
create type rental_status as enum ('incoming', 'rented', 'completed', 'cancelled', 'overdue', 'booked', 'emergency', 'archive');
create type payment_status as enum ('paid', 'partially', 'pending');

-- 2. TABLES

-- Companies (already partially defined in App.tsx)
create table companies (
    id text primary key, -- 'cars', 'scoots'
    name text not null,
    email text,
    type text check (type in ('cars', 'scoots')),
    created_at timestamptz default now()
);

-- Clients
create table clients (
    id text primary key, -- Slugs like 'c1', 's1'
    company_id text references companies(id) on delete cascade,
    name text not null,
    phone text,
    avatar text,
    rating client_rating default 'trusted',
    emergency_contacts jsonb default '[]'::jsonb,
    documents jsonb default '[]'::jsonb,
    channel client_channel default 'website',
    rental_count int default 0,
    total_amount numeric(15, 2) default 0,
    paid_amount numeric(15, 2) default 0,
    debt_amount numeric(15, 2) default 0,
    overdue_count int default 0,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- Vehicles
create table vehicles (
    id text primary key, -- Slugs like 'v1', 's1'
    company_id text references companies(id) on delete cascade,
    name text not null,
    plate text not null,
    image text,
    status vehicle_status default 'available',
    tech_passport text,
    vin text,
    color text,
    mileage text, -- or numeric
    condition vehicle_condition default 'good',
    insurance_date text, -- or date
    inspection_date text, -- or date
    tariffs jsonb default '[]'::jsonb,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- Rentals
create table rentals (
    id text primary key, -- Slugs like '1024', '5501'
    company_id text references companies(id) on delete cascade,
    client_id text references clients(id) on delete set null,
    vehicle_id text references vehicles(id) on delete set null,
    status rental_status default 'incoming',
    start_date timestamptz,
    end_date timestamptz,
    amount numeric(15, 2) default 0,
    payment_status payment_status default 'pending',
    debt numeric(15, 2) default 0,
    fine numeric(15, 2) default 0,
    deposit numeric(15, 2) default 0,
    comment text,
    tariff_id text,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- Payments / Transactions
create type transaction_type as enum ('income', 'expense');
create type payment_method as enum ('cash', 'bank');

create table payments (
    id text primary key, -- Slugs like 'pay-001'
    company_id text references companies(id) on delete cascade,
    rental_id text references rentals(id) on delete set null,
    client_id text references clients(id) on delete set null,
    amount numeric(15, 2) not null,
    type transaction_type default 'income',
    method payment_method default 'cash',
    comment text,
    responsible_user_id uuid, -- Keeping this as uuid because it refers to Supabase Auth users
    created_at timestamptz default now()
);

-- 3. UPDATED_AT TRIGGER
create or replace function handle_updated_at()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

create trigger set_clients_updated_at before update on clients for each row execute procedure handle_updated_at();
create trigger set_vehicles_updated_at before update on vehicles for each row execute procedure handle_updated_at();
create trigger set_rentals_updated_at before update on rentals for each row execute procedure handle_updated_at();

-- 4. ROW LEVEL SECURITY (RLS)
-- For a simple CRM, we might enable RLS but allow authenticated access
-- or even public access if it's a demo, but let's do properly with auth.

alter table companies enable row level security;
alter table clients enable row level security;
alter table vehicles enable row level security;
alter table rentals enable row level security;
alter table payments enable row level security;

-- Policies (Simplified: Allow all access for authenticated users)
create policy "Allow all for authenticated" on companies for all to authenticated using (true) with check (true);
create policy "Allow all for authenticated" on clients for all to authenticated using (true) with check (true);
create policy "Allow all for authenticated" on vehicles for all to authenticated using (true) with check (true);
create policy "Allow all for authenticated" on rentals for all to authenticated using (true) with check (true);
create policy "Allow all for authenticated" on payments for all to authenticated using (true) with check (true);

-- Also allow public access for now if the user is using the anon key without login flow
create policy "Allow all for public anon" on companies for all to anon using (true) with check (true);
create policy "Allow all for public anon" on clients for all to anon using (true) with check (true);
create policy "Allow all for public anon" on vehicles for all to anon using (true) with check (true);
create policy "Allow all for public anon" on rentals for all to anon using (true) with check (true);
create policy "Allow all for public anon" on payments for all to anon using (true) with check (true);

-- 5. INITIAL DATA
insert into companies (id, name, email, type) values 
('cars', 'KazDream Cars', 'info@dreamrent.kz', 'cars'),
('scoots', 'KazDream Scoots', 'info@dreamrent.kz', 'scoots')
on conflict (id) do nothing;
