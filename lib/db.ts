import { supabase } from './supabase';
import { formatCurrency, formatDateTime, parseDateTime } from './utils';
import { ClientItem, VehicleItem, RentalItem, RentalStatus } from '../types';

export const db = {
    rentals: {
        async list(companyId: string, tab: string = 'all'): Promise<RentalItem[]> {
            let query = supabase
                .from('rentals')
                .select(`
                    *,
                    clients!client_id(name, phone, avatar),
                    vehicles!vehicle_id(name, plate, image)
                `)
                .eq('company_id', companyId);

            if (tab !== 'all' && tab !== 'archive') {
                query = query.eq('status', tab);
            } else if (tab === 'archive') {
                query = query.eq('status', 'archive');
            } else {
                query = query.neq('status', 'archive');
            }

            const { data, error } = await query.order('created_at', { ascending: false });

            if (error) {
                console.error('Error fetching rentals:', error);
                return [];
            }

            return (data || []).map(r => {
                const client = Array.isArray(r.clients) ? r.clients[0] : r.clients;
                const vehicle = Array.isArray(r.vehicles) ? r.vehicles[0] : r.vehicles;

                return {
                    id: r.id,
                    status: r.status,
                    vehicle: {
                        name: vehicle?.name || 'Удаленный транспорт',
                        plate: vehicle?.plate || '',
                        image: vehicle?.image || ''
                    },
                    client: {
                        name: client?.name || 'Удаленный клиент',
                        phone: client?.phone || '',
                        avatarUrl: client?.avatar || ''
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
                };
            });
        },

        async save(rental: any, companyId: string) {
            if (!rental.id || rental.id === '') {
                rental.id = Math.floor(1000 + Math.random() * 9000).toString();
            }

            const payload = {
                company_id: companyId,
                client_id: rental.clientId,
                vehicle_id: rental.vehicleId,
                status: rental.status,
                start_date: rental.period?.start ? parseDateTime(rental.period.start).toISOString() : null,
                end_date: rental.period?.end ? parseDateTime(rental.period.end).toISOString() : null,
                amount: typeof rental.amount === 'string' ? parseFloat(rental.amount.replace(/[^\d.]/g, '')) || 0 : (rental.amount || 0),
                payment_status: rental.payment,
                debt: typeof rental.debt === 'string' ? parseFloat(rental.debt.replace(/[^\d.]/g, '')) || 0 : (rental.debt || 0),
                fine: typeof rental.fine === 'string' ? parseFloat(rental.fine.replace(/[^\d.]/g, '')) || 0 : (rental.fine || 0),
                deposit: typeof rental.deposit === 'string' ? parseFloat(rental.deposit.replace(/[^\d.]/g, '')) || 0 : (rental.deposit || 0),
                comment: rental.comment,
                tariff_id: rental.tariffId,
                updated_at: new Date().toISOString()
            };

            const { error } = await supabase
                .from('rentals')
                .upsert({ ...payload, id: rental.id });

            if (error) throw error;
            return rental.id;
        },

        async delete(id: string) {
            await supabase.from('payments').delete().eq('rental_id', id);
            const { error } = await supabase.from('rentals').delete().eq('id', id);
            if (error) throw error;
        },

        async deleteBulk(ids: string[]) {
            await supabase.from('payments').delete().in('rental_id', ids);
            const { error } = await supabase.from('rentals').delete().in('id', ids);
            if (error) throw error;
        },

        async getHistory(rentalId: string) {
            const { data, error } = await supabase
                .from('rental_history')
                .select(`
                    *,
                    user:users!user_id(name, avatar_url)
                `)
                .eq('rental_id', rentalId)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error fetching history:', error);
                return [];
            }

            return (data || []).map(h => ({
                id: h.id,
                action: h.action_type,
                details: h.details,
                oldValue: h.old_value,
                newValue: h.new_value,
                date: formatDateTime(new Date(h.created_at)),
                user: h.user ? {
                    name: h.user.name,
                    avatarUrl: h.user.avatar_url
                } : null
            }));
        },

        async addHistory(history: {
            rental_id: string;
            user_id: string;
            action_type: string;
            details: string;
            old_value?: string;
            new_value?: string;
        }) {
            const { error } = await supabase
                .from('rental_history')
                .insert(history);
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
                updated_at: new Date().toISOString()
            };

            const { error } = await supabase
                .from('clients')
                .upsert({ ...payload, id: client.id });
            if (error) throw error;
        },
        async delete(id: string) {
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
                    rental:rentals(id),
                    responsible:users!responsible_user_id(name, email, avatar_url)
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
                responsible: p.responsible ? {
                    name: (p.responsible as any).name,
                    email: (p.responsible as any).email,
                    avatarUrl: (p.responsible as any).avatar_url
                } : {
                    name: 'Система',
                    email: '-',
                    avatarUrl: 'https://ui-avatars.com/api/?name=S&background=ddd&color=333'
                }
            }));
        },
        async save(payment: {
            company_id: string;
            rental_id?: string;
            client_id?: string;
            amount: number;
            type: 'income' | 'expense';
            method: 'cash' | 'bank';
            comment?: string;
            responsible_user_id: string;
        }) {
            const id = `pay-${Math.random().toString(36).substring(2, 9)}`;
            const { error } = await supabase
                .from('payments')
                .insert({
                    id,
                    ...payment
                });
            if (error) throw error;
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

export async function uploadImage(file: File) {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2, 11)}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
        .from('images')
        .upload(filePath, file);

    if (uploadError) {
        console.error('Error uploading image:', uploadError);
        return null;
    }

    const { data } = supabase.storage
        .from('images')
        .getPublicUrl(filePath);

    return data.publicUrl;
}
