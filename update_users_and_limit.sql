-- Add company_id to users table
alter table users add column if not exists company_id text references companies(id) on delete set null;

-- Update Admin user (has access to all companies, so company_id stays null)
update users set role = 'admin' where email = 'info@dreamrent.kz';

-- Insert Manager 1 (Scoots)
-- Password: n6H]eEg9A4/3!?gc
insert into users (email, password_hash, name, avatar_url, role, company_id)
values (
    'info@kazdreamscoots.kz', 
    crypt('n6H]eEg9A4/3!?gc', gen_salt('bf')),
    'Менеджер Scoots',
    'https://ui-avatars.com/api/?name=MS&background=4f46e5&color=fff&bold=true',
    'manager',
    'scoots'
)
on conflict (email) do update 
set password_hash = crypt('n6H]eEg9A4/3!?gc', gen_salt('bf')),
    name = 'Менеджер Scoots',
    role = 'manager',
    company_id = 'scoots';

-- Insert Manager 2 (Cars)
-- Password: Pl?GJI+5oJ,%Jq(r
insert into users (email, password_hash, name, avatar_url, role, company_id)
values (
    'info@kazdreamcars.kz', 
    crypt('Pl?GJI+5oJ,%Jq(r', gen_salt('bf')),
    'Менеджер Cars',
    'https://ui-avatars.com/api/?name=MC&background=10b981&color=fff&bold=true',
    'manager',
    'cars'
)
on conflict (email) do update 
set password_hash = crypt('Pl?GJI+5oJ,%Jq(r', gen_salt('bf')),
    name = 'Менеджер Cars',
    role = 'manager',
    company_id = 'cars';

-- Update login function to return company_id
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
            'role', found_user.role,
            'company_id', found_user.company_id
        );
    else
        -- FAILURE: Return null
        return null;
    end if;
end;
$$ language plpgsql security definer;
