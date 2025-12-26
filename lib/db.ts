import { supabase } from './supabase';
import { RentalItem, ClientItem, VehicleItem } from '../types';
import { formatCurrency, parseCurrency, formatDateTime, parseDateTime } from './utils';

export const db = {
    rentals: {
        async list(companyId: string): Promise<RentalItem[]> {
            const { data, error } = await supabase
                .from('rentals')
                .select(`
          *,
          client:clients(name, phone, avatar),
          vehicle:vehicles(name, plate, image)
        `)
                .eq('company_id', companyId)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error fetching rentals:', error);
                return [];
            }

            return (data || []).map(r => ({
                id: r.id,
                status: r.status,
                vehicle: {
                    name: r.vehicle?.name || '',
                    plate: r.vehicle?.plate || '',
                    image: r.vehicle?.image || ''
                },
                client: {
                    name: r.client?.name || '',
                    phone: r.client?.phone || '',
                    avatarUrl: r.client?.avatar || ''
                },
                period: {
                    start: r.start_date ? formatDateTime(new Date(r.start_date)) : '',
                    end: r.end_date ? formatDateTime(new Date(r.end_date)) : ''
                },
                amount: formatCurrency(r.amount),
                payment: r.payment_status,
                debt: formatCurrency(r.debt),
                fine: formatCurrency(r.fine),
                deposit: formatCurrency(r.deposit),
                comment: r.comment || '',
                tariffId: r.tariff_id,
                clientId: r.client_id,
                vehicleId: r.vehicle_id
            }));
        },

        async save(rental: RentalItem, companyId: string) {
            // Find client and vehicle IDs first (this is a bit inefficient, but UI provides objects)
            // In a real app, we'd have the IDs directly in the form state.
            // Since the UI uses plate/name, we might need to find them.

            let clientId = rental.clientId;
            let vehicleId = rental.vehicleId;

            if (!vehicleId) {
                const { data: vData } = await supabase
                    .from('vehicles')
                    .select('id')
                    .eq('plate', rental.vehicle.plate)
                    .single();
                vehicleId = vData?.id;
            }

            if (!clientId) {
                const { data: cData } = await supabase
                    .from('clients')
                    .select('id')
                    .eq('phone', rental.client.phone)
                    .single();
                clientId = cData?.id;
            }

            const payload = {
                company_id: companyId,
                client_id: clientId,
                vehicle_id: vehicleId,
                status: rental.status,
                start_date: parseDateTime(rental.period.start).toISOString(),
                end_date: parseDateTime(rental.period.end).toISOString(),
                amount: parseCurrency(rental.amount),
                payment_status: rental.payment,
                debt: parseCurrency(rental.debt),
                fine: parseCurrency(rental.fine),
                deposit: parseCurrency(rental.deposit),
                comment: rental.comment,
                tariff_id: rental.tariffId
            };

            if (rental.id && !rental.id.startsWith('temp-')) {
                const { error } = await supabase
                    .from('rentals')
                    .update(payload)
                    .eq('id', rental.id);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('rentals')
                    .insert({ ...payload, id: rental.id || `r-${Date.now()}` });
                if (error) throw error;
            }
        },

        async delete(id: string) {
            // Manual cascade delete for payments if not handled by DB
            await supabase.from('payments').delete().eq('rental_id', id);

            const { error } = await supabase
                .from('rentals')
                .delete()
                .eq('id', id);
            if (error) throw error;
        },
        async deleteBulk(ids: string[]) {
            // Manual cascade delete for payments
            await supabase.from('payments').delete().in('rental_id', ids);

            const { error } = await supabase
                .from('rentals')
                .delete()
                .in('id', ids);
            if (error) throw error;
        }
    },

    clients: {
        async list(companyId: string): Promise<ClientItem[]> {
            const { data, error } = await supabase
                .from('clients')
                .select('*')
                .eq('company_id', companyId)
                .order('name');

            if (error) {
                console.error('Error fetching clients:', error);
                return [];
            }

            return (data || []).map(c => ({
                ...c,
                totalAmount: formatCurrency(c.total_amount),
                paidAmount: formatCurrency(c.paid_amount),
                debtAmount: formatCurrency(c.debt_amount),
                overdueAmount: formatCurrency(c.overdue_amount || 0),
                createdAt: formatDateTime(new Date(c.created_at)),
                emergencyContacts: c.emergency_contacts || [],
                documents: c.documents || []
            }));
        },
        async save(client: ClientItem, companyId: string) {
            const payload = {
                company_id: companyId,
                name: client.name,
                phone: client.phone,
                avatar: client.avatar,
                rating: client.rating,
                channel: client.channel,
                emergency_contacts: client.emergencyContacts,
                documents: client.documents,
                rental_count: client.rentalCount,
                total_amount: parseCurrency(client.totalAmount),
                paid_amount: parseCurrency(client.paidAmount),
                debt_amount: parseCurrency(client.debtAmount),
                overdue_count: client.overdueCount,
                updated_at: new Date().toISOString()
            };

            const { error } = await supabase
                .from('clients')
                .upsert({ ...payload, id: client.id });

            if (error) throw error;
        },
        async delete(id: string) {
            // Note: payments often depend on rentals, but some might be linked only to client
            await supabase.from('payments').delete().eq('client_id', id);

            const { error } = await supabase.from('clients').delete().eq('id', id);
            if (error) throw error;
        },
        async deleteBulk(ids: string[]) {
            await supabase.from('payments').delete().in('client_id', ids);

            const { error } = await supabase.from('clients').delete().in('id', ids);
            if (error) throw error;
        }
    },

    vehicles: {
        async list(companyId: string): Promise<VehicleItem[]> {
            const { data, error } = await supabase
                .from('vehicles')
                .select('*')
                .eq('company_id', companyId)
                .order('name');

            if (error) {
                console.error('Error fetching vehicles:', error);
                return [];
            }
            return (data || []).map(v => ({
                ...v,
                techPassport: v.tech_passport,
                insuranceDate: v.insurance_date,
                inspectionDate: v.inspection_date,
                tariffs: v.tariffs || []
            }));
        },
        async save(vehicle: VehicleItem, companyId: string) {
            const payload = {
                company_id: companyId,
                name: vehicle.name,
                plate: vehicle.plate,
                image: vehicle.image,
                status: vehicle.status,
                tech_passport: vehicle.techPassport,
                vin: vehicle.vin,
                color: vehicle.color,
                mileage: vehicle.mileage,
                condition: vehicle.condition,
                insurance_date: vehicle.insuranceDate,
                inspection_date: vehicle.inspectionDate,
                tariffs: vehicle.tariffs,
                updated_at: new Date().toISOString()
            };

            const { error } = await supabase
                .from('vehicles')
                .upsert({ ...payload, id: vehicle.id });

            if (error) throw error;
        },
        async delete(id: string) {
            const { error } = await supabase.from('vehicles').delete().eq('id', id);
            if (error) throw error;
        },
        async deleteBulk(ids: string[]) {
            const { error } = await supabase.from('vehicles').delete().in('id', ids);
            if (error) throw error;
        }
    },

    payments: {
        async list(companyId: string): Promise<any[]> {
            const { data, error } = await supabase
                .from('payments')
                .select(`
                    *,
                    client:clients(name, phone, avatar),
                    rental:rentals(id)
                `)
                .eq('company_id', companyId)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error fetching payments:', error);
                return [];
            }

            return (data || []).map(p => ({
                id: p.id,
                date: formatDateTime(new Date(p.created_at)),
                rentalId: p.rental?.id || '—',
                client: {
                    name: p.client?.name || 'Удаленный клиент',
                    phone: p.client?.phone || '',
                    avatarUrl: p.client?.avatar || ''
                },
                paymentType: p.method,
                amount: (p.type === 'income' ? '+ ' : '- ') + formatCurrency(p.amount),
                type: p.type,
                responsible: {
                    name: 'Admin', // In real app, join with users table
                    email: 'info@dreamrent.kz',
                    avatarUrl: 'https://ui-avatars.com/api/?name=Admin&background=0a0a0a&color=fff&bold=true'
                }
            }));
        },
        async delete(id: string) {
            const { error } = await supabase.from('payments').delete().eq('id', id);
            if (error) throw error;
        },
        async deleteBulk(ids: string[]) {
            const { error } = await supabase.from('payments').delete().in('id', ids);
            if (error) throw error;
        }
    }
};
