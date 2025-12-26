-- Dream Rent Seed Data (using slugs/IDs from mock data)

-- 1. CLEANUP
-- drop table if exists payments, rentals, vehicles, clients cascade;
-- recreate them if needed by running supabase_schema.sql first

-- 2. CLIENTS
-- Car Clients
insert into clients (id, company_id, name, phone, avatar, rating, channel, rental_count, total_amount, paid_amount, debt_amount, emergency_contacts, documents)
values 
('c1', 'cars', 'Александр Иванов', '+7 (777) 123-45-67', 'https://ui-avatars.com/api/?name=Alexander+Ivanov&background=e2e8f0&color=475569', 'trusted', 'instagram', 0, 1250000, 1250000, 0, 
 '[{"name": "Светлана Иванова", "phone": "+7 (701) 111-22-33", "avatar": "https://ui-avatars.com/api/?name=Svetlana+Ivanova&background=fce7f3&color=db2777"}]'::jsonb,
 '[{"type": "id_card", "number": "123456789", "iin": "900101300456", "images": ["https://images.unsplash.com/photo-1549923746-c502d488b3ea?auto=format&fit=crop&q=80&w=600&h=400"], "dateOfBirth": "1990-01-01", "issueDate": "2020-05-15", "expiryDate": "2030-05-15", "issuedBy": "МВД РК"}]'::jsonb),

('c2', 'cars', 'Мария Смирнова', '+7 (777) 987-65-43', 'https://ui-avatars.com/api/?name=Maria+Smirnova&background=fce7f3&color=db2777', 'caution', 'whatsapp', 0, 270000, 200000, 70000, 
 '[{"name": "Олег Смирнов", "phone": "+7 (705) 333-44-55", "avatar": "https://ui-avatars.com/api/?name=Oleg+Smirnov&background=dbeafe&color=2563eb"}]'::jsonb,
 '[{"type": "passport", "number": "987654321", "iin": "950515400123", "images": []}]'::jsonb),

('c3', 'cars', 'Ержан Болатов', '+7 (701) 555-44-33', 'https://ui-avatars.com/api/?name=Erzhan+Bolatov&background=dbeafe&color=2563eb', 'trusted', 'phone', 1, 45000, 45000, 0, '[]'::jsonb, '[]'::jsonb);

-- Scoot Clients
insert into clients (id, company_id, name, phone, avatar, rating, channel, rental_count, total_amount, paid_amount, debt_amount)
values 
('s1', 'scoots', 'Алина Петрова', '+7 (701) 987-65-43', 'https://ui-avatars.com/api/?name=Alina+Petrova&background=fce7f3&color=db2777', 'trusted', 'instagram', 0, 12500, 12500, 0),
('s2', 'scoots', 'Иван Сергеев', '+7 (705) 111-22-33', 'https://ui-avatars.com/api/?name=Ivan+Sergeev&background=f0fdf4&color=16a34a', 'trusted', 'recommendation', 1, 1200, 1200, 0);


-- 3. VEHICLES
-- Car Vehicles
insert into vehicles (id, company_id, name, plate, image, status, tech_passport, vin, color, mileage, condition, insurance_date, inspection_date, tariffs)
values 
('v1', 'cars', 'Kia K5', '777 ABC 02', 'https://images.unsplash.com/photo-1609521263047-f8f205293f24?auto=format&fit=crop&q=80&w=300&h=300', 'rented', 'KZ 12345678', 'KNA1234567890ABC', 'Серый металлик', '45 000 км', 'good', '12.05.2024', '10.05.2024', 
 '[{"id": "t1", "name": "Сутки", "price": "25 000 ₸", "days": "1", "period": "День (1 д.)", "isAllDays": true}, {"id": "t2", "name": "Неделя", "price": "150 000 ₸", "days": "7", "period": "Неделя (7 д.)", "isAllDays": true}]'::jsonb),

('v2', 'cars', 'Toyota Camry 70', '098 KZ 02', 'https://images.unsplash.com/photo-1621007947382-bb3c3968e3bb?auto=format&fit=crop&q=80&w=300&h=300', 'available', 'KZ 87654321', 'JT11234567890DEF', 'Белый перламутр', '78 500 км', 'good', '01.01.2025', '15.12.2024', 
 '[{"id": "t1", "name": "Сутки", "price": "30 000 ₸", "days": "1", "period": "День (1 д.)", "isAllDays": true}]'::jsonb),

('v3', 'cars', 'Hyundai Elantra', '123 KZA 02', 'https://images.unsplash.com/photo-1619682817481-e994891cd1f5?auto=format&fit=crop&q=80&w=300&h=300', 'maintenance', 'KZ 55443322', 'KMH1234567890GHI', 'Черный', '12 300 км', 'broken', '20.08.2024', '19.08.2024', '[]'::jsonb);

-- Scoot Vehicles
insert into vehicles (id, company_id, name, plate, image, status, tech_passport, vin, color, mileage, condition, insurance_date, inspection_date, tariffs)
values 
('sv1', 'scoots', 'Ninebot Max G30', '#405', 'https://images.unsplash.com/photo-1595166668700-141680d2204c?auto=format&fit=crop&q=80&w=300&h=300', 'rented', 'N/A', 'SN:123456789', 'Черный', '1 200 км', 'good', '-', '01.10.2023', 
 '[{"id": "t1", "name": "Минутный", "price": "45 ₸", "days": "-", "period": "Минута", "isAllDays": true}]'::jsonb),

('sv2', 'scoots', 'Xiaomi Pro 2', '#112', 'https://images.unsplash.com/photo-1591963964952-b4c6e987c65c?auto=format&fit=crop&q=80&w=300&h=300', 'available', 'N/A', 'SN:987654321', 'Серый', '450 км', 'new', '-', '15.10.2023', '[]'::jsonb);


-- 4. RENTALS
-- Car Rentals
insert into rentals (id, company_id, client_id, vehicle_id, status, start_date, end_date, amount, payment_status, debt, deposit, comment)
values 
('1024', 'cars', 'c1', 'v2', 'incoming', '2024-05-30 16:12:00', '2024-05-31 16:12:00', 120000, 'pending', 120000, 50000, 'Нужно детское кресло, клиент просит чистую машину'),
('1025', 'cars', 'c2', 'v1', 'booked', '2024-06-01 10:00:00', '2024-06-03 10:00:00', 90000, 'partially', 70000, 30000, 'Выезд за город'),
('1026', 'cars', 'c3', 'v3', 'rented', '2024-05-30 14:30:00', '2024-05-31 14:30:00', 45000, 'paid', 0, 30000, '');

-- Scoot Rentals
insert into rentals (id, company_id, client_id, vehicle_id, status, start_date, end_date, amount, payment_status, debt, deposit, comment)
values 
('5501', 'scoots', 's1', 'sv1', 'incoming', '2024-10-25 14:00:00', '2024-10-25 18:00:00', 4500, 'pending', 4500, 0, 'Первый раз'),
('5502', 'scoots', 's2', 'sv2', 'completed', '2024-10-25 15:30:00', '2024-10-25 16:30:00', 1200, 'paid', 0, 0, '');


-- 5. PAYMENTS
insert into payments (id, company_id, rental_id, client_id, amount, type, method, created_at)
values 
('pay-002', 'cars', '1025', 'c2', 20000, 'income', 'bank', '2024-06-01 10:05:00'),
('pay-001', 'cars', '1026', 'c3', 45000, 'income', 'cash', '2024-05-30 14:35:00'),
('pay-s01', 'scoots', '5502', 's2', 1200, 'income', 'bank', '2024-10-25 16:35:00');
