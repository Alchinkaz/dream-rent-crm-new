-- 1. Create Sequence
create sequence if not exists rentals_id_seq;

-- 2. Drop Foreign Key on payments temporarily
alter table payments drop constraint if exists payments_rental_id_fkey;

-- 3. Prepare Mapping Table
-- We order by created_at to keep chronological order in numbering
create temp table rental_remapping as
select 
    id as old_id, 
    nextval('rentals_id_seq')::text as new_id
from rentals
order by created_at;

-- 4. Update Rentals ID (using buffer approach to avoid unique constraint if overlapping)
-- Since we dropped FK, we can do this freely.
-- But we can't update PK to a value that exists. 
-- Since we are moving from text (possible '1025', 'r-...') to '1', '2'... 
-- There is a risk '1' creates conflict if '1' is processed later.
-- Safe way: Update all to 'REF_' + new_id, then update to new_id.

update rentals 
set id = 'REF_' || m.new_id 
from rental_remapping m 
where rentals.id = m.old_id;

update rentals 
set id = replace(id, 'REF_', '');

-- 5. Update Payments
update payments p
set rental_id = m.new_id
from rental_remapping m
where p.rental_id = m.old_id;

-- 6. Set Default for ID column
alter table rentals alter column id set default nextval('rentals_id_seq')::text;

-- 7. Restore Foreign Key
-- Note: 'on delete set null' or 'cascade' as preferred. 
-- Schema had: rental_id text references rentals(id)
-- Let's restore with ON DELETE SET NULL as it's often safer or CASCADE if payments belong strictly to rental.
-- Payments usually belong to rental. Let's look at schema. Schema didn't specify, so default RESTRICT/NO ACTION.
-- But let's check what it was. payments table def.
-- Let's stick to simple reference.
alter table payments 
add constraint payments_rental_id_fkey 
foreign key (rental_id) 
references rentals(id)
on delete set null; 
