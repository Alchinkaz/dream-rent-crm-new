-- ==========================================
-- AUTOMATIC CLIENT STATS CALCULATION
-- ==========================================

-- 1. Create Function to Recalculate Stats for a Given Client
create or replace function update_client_stats(target_client_id text)
returns void as $$
declare
    _total_amount numeric;
    _paid_amount numeric;
    _rental_count int;
    _overdue_count int;
begin
    -- Calculate Rental Stats
    select 
        coalesce(sum(amount), 0),
        count(id),
        count(case when status = 'overdue' then 1 end)
    into 
        _total_amount,
        _rental_count,
        _overdue_count
    from rentals
    where client_id = target_client_id;

    -- Calculate Payment Stats (Income - Expenses)
    select 
        coalesce(sum(case when type = 'income' then amount else -amount end), 0)
    into 
        _paid_amount
    from payments
    where client_id = target_client_id;

    -- Update Client Record
    update clients 
    set 
        total_amount = _total_amount,
        paid_amount = _paid_amount,
        debt_amount = _total_amount - _paid_amount,
        rental_count = _rental_count,
        overdue_count = _overdue_count,
        updated_at = now()
    where id = target_client_id;
end;
$$ language plpgsql security definer;

-- 2. Create Trigger Function for Rentals
create or replace function trigger_update_client_stats_from_rental()
returns trigger as $$
begin
    if (TG_OP = 'DELETE') then
        if OLD.client_id is not null then
            perform update_client_stats(OLD.client_id);
        end if;
    else
        if NEW.client_id is not null then
            perform update_client_stats(NEW.client_id);
        end if;
        -- If client changed, update old one too
        if (TG_OP = 'UPDATE' and OLD.client_id is not null and OLD.client_id <> NEW.client_id) then
            perform update_client_stats(OLD.client_id);
        end if;
    end if;
    return null;
end;
$$ language plpgsql;

-- 3. Create Trigger Function for Payments
create or replace function trigger_update_client_stats_from_payment()
returns trigger as $$
begin
    if (TG_OP = 'DELETE') then
        if OLD.client_id is not null then
            perform update_client_stats(OLD.client_id);
        end if;
    else
        if NEW.client_id is not null then
            perform update_client_stats(NEW.client_id);
        end if;
        if (TG_OP = 'UPDATE' and OLD.client_id is not null and OLD.client_id <> NEW.client_id) then
            perform update_client_stats(OLD.client_id);
        end if;
    end if;
    return null;
end;
$$ language plpgsql;

-- 4. Attach Triggers
drop trigger if exists on_rental_change_update_client_stats on rentals;
create trigger on_rental_change_update_client_stats
after insert or update or delete on rentals
for each row execute function trigger_update_client_stats_from_rental();

drop trigger if exists on_payment_change_update_client_stats on payments;
create trigger on_payment_change_update_client_stats
after insert or update or delete on payments
for each row execute function trigger_update_client_stats_from_payment();

-- 5. Run Initial Calculation for All Clients
do $$
declare
    r record;
begin
    for r in select id from clients loop
        perform update_client_stats(r.id);
    end loop;
end;
$$;
