-- Dream Rent: Setup for KazDream EV moto
-- This script adds the new company and its manager user.

-- 1. Update company type constraint (if it exists)
-- This logic assumes Supabase/PostgreSQL. Inline checks are often named like 'table_column_check'
DO $$ 
BEGIN 
    ALTER TABLE companies DROP CONSTRAINT IF EXISTS companies_type_check;
EXCEPTION 
    WHEN undefined_object THEN 
        NULL; 
END $$;

ALTER TABLE companies ADD CONSTRAINT companies_type_check CHECK (type IN ('cars', 'scoots', 'moto'));

-- 2. Insert the new company
INSERT INTO companies (id, name, email, type) 
VALUES ('evmoto', 'KazDream EV moto', 'info@evmoto.kz', 'moto')
ON CONFLICT (id) DO UPDATE SET 
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    type = EXCLUDED.type;

-- 3. Insert the manager user
-- Credentials:
-- Login: info@evmoto.kz
-- Password: Pl?GJI+5oJ,%Jq(r,
INSERT INTO users (email, password_hash, name, avatar_url, role, company_id)
VALUES (
    'info@evmoto.kz', 
    crypt('Pl?GJI+5oJ,%Jq(r,', gen_salt('bf')),
    'Менеджер 3',
    'https://ui-avatars.com/api/?name=M3&background=f59e0b&color=fff&bold=true',
    'manager',
    'evmoto'
)
ON CONFLICT (email) DO UPDATE SET 
    password_hash = crypt('Pl?GJI+5oJ,%Jq(r,', gen_salt('bf')),
    name = 'Менеджер 3',
    role = 'manager',
    company_id = 'evmoto';

-- 4. Initial verification (optional)
SELECT * FROM companies WHERE id = 'evmoto';
SELECT id, email, name, role, company_id FROM users WHERE email = 'info@evmoto.kz';
