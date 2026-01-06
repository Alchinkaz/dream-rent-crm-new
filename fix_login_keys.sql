-- Dream Rent User Role Update
-- Use camelCase keys in JSON to match TypeScript interfaces

create or replace function login(email_input text, password_input text)
returns json as $$
declare
    found_user users%rowtype;
begin
    -- 1. Try to find the user by email
    select * into found_user from users where email = email_input;
    
    -- 2. Verify: User exists AND password hash matches the input
    if found_user.id is not null and found_user.password_hash = crypt(password_input, found_user.password_hash) then
        -- SUCCESS: Return user info (excluding private hash) with camelCase keys
        return json_build_object(
            'id', found_user.id,
            'email', found_user.email,
            'name', found_user.name,
            'avatarUrl', found_user.avatar_url,
            'role', found_user.role,
            'companyId', found_user.company_id
        );
    else
        -- FAILURE: Return null
        return null;
    end if;
end;
$$ language plpgsql security definer;
