import React, { useState, useRef, useEffect, useCallback } from 'react';
import { PageProps, ClientItem, ClientDocument, ClientContact, RentalItem } from '../../types';
import { Settings, Check, Search, Filter, GripVertical, GripHorizontal, Hash, ArrowLeft, Pencil, Trash2, Phone, FileText, ShieldAlert, MessageCircle, Copy, Info, LayoutList, LayoutGrid, Calendar as CalendarIcon, CreditCard, Hourglass, AlertCircle, Plus, Save, X, User as UserIcon, Camera, Upload, Eye, ChevronLeft, ChevronRight, Download, ExternalLink } from 'lucide-react';
import { RentalsGrid, RentalsTable, DateRangePicker, getStatusBadge } from './Rentals';
import { db, uploadFile } from '../../lib/db';
import { formatDateTime, parseDateTime } from '../../lib/utils';

interface ColumnConfig {
    id: keyof ClientItem | 'checkbox' | 'actions' | 'documents' | 'emergencyContact';
    label: string;
    visible: boolean;
    width?: string;
}

// --- Helper Functions for Badges ---
const BADGE_BASE_CLASS = "inline-flex items-center justify-center px-2.5 h-6 rounded-md text-[11px] font-semibold border whitespace-nowrap";

const getRatingBadge = (rating: ClientItem['rating']) => {
    switch (rating) {
        case 'trusted':
            return <span className={`${BADGE_BASE_CLASS} bg-emerald-50 text-emerald-700 border-emerald-200`}>Друг</span>;
        case 'caution':
            return <span className={`${BADGE_BASE_CLASS} bg-amber-50 text-amber-700 border-amber-200`}>Осторожно</span>;
        case 'blacklist':
            return <span className={`${BADGE_BASE_CLASS} bg-red-50 text-red-700 border-red-200`}>Мошенник</span>;
        default:
            return null;
    }
};

const getDocTypeBadge = (type: ClientDocument['type']) => {
    if (type === 'passport') {
        return <span className={`${BADGE_BASE_CLASS} bg-purple-50 text-purple-700 border-purple-200`}>Паспорт</span>;
    }
    return <span className={`${BADGE_BASE_CLASS} bg-blue-50 text-blue-700 border-blue-200`}>Уд. личности</span>;
};

const getChannelLabel = (channel: ClientItem['channel']) => {
    switch (channel) {
        case 'website': return 'Сайт';
        case 'whatsapp': return 'WhatsApp';
        case 'telegram': return 'Telegram';
        case 'instagram': return 'Instagram';
        case 'phone': return 'Телефон';
        case 'recommendation': return 'Рекомендация';
        case 'old_client': return 'Старый клиент';
        default: return channel;
    }
};

const getChannelBadge = (channel: ClientItem['channel']) => {
    const label = getChannelLabel(channel);
    let colorClass = "";
    switch (channel) {
        case 'website': colorClass = "bg-blue-50 text-blue-700 border-blue-200"; break;
        case 'whatsapp': colorClass = "bg-green-50 text-green-700 border-green-200"; break;
        case 'telegram': colorClass = "bg-sky-50 text-sky-700 border-sky-200"; break;
        case 'instagram': colorClass = "bg-pink-50 text-pink-700 border-pink-200"; break;
        case 'phone': colorClass = "bg-slate-100 text-slate-600 border-slate-200"; break;
        case 'recommendation': colorClass = "bg-purple-50 text-purple-700 border-purple-200"; break;
        case 'old_client': colorClass = "bg-indigo-50 text-indigo-700 border-indigo-200"; break;
        default: colorClass = "bg-slate-50 text-slate-600 border-slate-200";
    }
    return <span className={`${BADGE_BASE_CLASS} ${colorClass}`}>{label}</span>;
};

// parseRentalDate logic replaced by shared parseDateTime

const formatDateForInput = (dateStr?: string) => {
    if (!dateStr) return '';
    // Assuming dateStr is stored as YYYY-MM-DD or similar standard format for inputs
    return dateStr;
};

const isImage = (url?: string) => {
    if (!url) return false;
    const ext = url.split('.').pop()?.toLowerCase();
    return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif'].includes(ext || '');
};

// --- MAIN CLIENTS COMPONENT ---

export const Clients: React.FC<PageProps> = ({ currentCompany, initialSelectedClientId, onBack }) => {
    const [activeView, setActiveView] = useState<'list' | 'details' | 'form'>('list');
    const [clients, setClients] = useState<ClientItem[]>([]);
    const [rentals, setRentals] = useState<RentalItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const [selectedClient, setSelectedClient] = useState<ClientItem | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [editingClient, setEditingClient] = useState<ClientItem | null>(null);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [clientsData, rentalsData] = await Promise.all([
                db.clients.list(currentCompany.id),
                db.rentals.list(currentCompany.id)
            ]);
            setClients(clientsData);
            setRentals(rentalsData);

            if (initialSelectedClientId) {
                const target = clientsData.find(c => c.id === initialSelectedClientId);
                if (target) {
                    setSelectedClient(target);
                    setActiveView('details');
                }
            }
        } catch (err) {
            console.error('Failed to fetch clients:', err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [currentCompany]);

    const [searchQuery, setSearchQuery] = useState('');
    const [ratingFilter, setRatingFilter] = useState<'all' | ClientItem['rating']>('all');
    const [channelFilter, setChannelFilter] = useState<'all' | ClientItem['channel']>('all');
    const [isRatingFilterOpen, setIsRatingFilterOpen] = useState(false);
    const [isChannelFilterOpen, setIsChannelFilterOpen] = useState(false);
    const ratingFilterRef = useRef<HTMLDivElement>(null);
    const channelFilterRef = useRef<HTMLDivElement>(null);

    const sourceRentals = rentals;

    const enrichedClients = clients.map(client => {
        const clientRentals = sourceRentals.filter(r => r.client.name === client.name);
        clientRentals.sort((a, b) => {
            const dateA = a.period.start ? parseDateTime(a.period.start).getTime() : 0;
            const dateB = b.period.start ? parseDateTime(b.period.start).getTime() : 0;
            return dateB - dateA;
        });
        const lastRentalItem = clientRentals[0];

        return {
            ...client,
            rentalCount: clientRentals.length > 0 ? clientRentals.length : client.rentalCount,
            lastRental: lastRentalItem ? {
                id: lastRentalItem.id,
                date: lastRentalItem.period.start,
                status: lastRentalItem.status as any
            } : undefined
        };
    });

    const filteredData = enrichedClients.filter(item => {
        const q = searchQuery.toLowerCase();
        const primaryDoc = item.documents[0] || { iin: '' };
        const matchesSearch = item.name.toLowerCase().includes(q) || item.phone.includes(q) || primaryDoc.iin.includes(q);
        const matchesRating = ratingFilter === 'all' || item.rating === ratingFilter;
        const matchesChannel = channelFilter === 'all' || item.channel === channelFilter;
        return matchesSearch && matchesRating && matchesChannel;
    });

    const handleClientClick = (client: ClientItem) => {
        setSelectedClient(client);
        setActiveView('details');
    };

    const handleCreateNew = () => {
        setEditingClient(null);
        setActiveView('form');
    };

    const handleEdit = (client: ClientItem) => {
        setEditingClient(client);
        setActiveView('form');
    };

    const handleUpdateClient = async (updatedClient: ClientItem) => {
        try {
            await db.clients.save(updatedClient, currentCompany.id);
            await fetchData();
            setSelectedClient(updatedClient);
        } catch (err) {
            alert('Ошибка при обновлении: ' + (err as any).message);
        }
    };

    const handleDelete = async (id: string) => {
        if (!id) return;
        if (window.confirm('Вы уверены, что хотите удалить этого клиента?')) {
            try {
                await db.clients.delete(id);
                await fetchData();
                if (selectedClient?.id === id) {
                    setSelectedClient(null);
                    setActiveView('list');
                }
                setSelectedIds(prev => {
                    if (prev.has(id)) {
                        const newSet = new Set(prev);
                        newSet.delete(id);
                        return newSet;
                    }
                    return prev;
                });
            } catch (err) {
                alert('Ошибка при удалении: ' + (err as any).message);
            }
        }
    };

    const handleBulkDelete = async () => {
        if (selectedIds.size === 0) return;
        if (window.confirm(`Вы уверены, что хотите удалить выбранных клиентов (${selectedIds.size})?`)) {
            try {
                await db.clients.deleteBulk(Array.from(selectedIds));
                await fetchData();
                setSelectedIds(new Set());
            } catch (err) {
                alert('Ошибка при массовом удалении: ' + (err as any).message);
            }
        }
    };

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedIds(new Set(filteredData.map(c => c.id)));
        } else {
            setSelectedIds(new Set());
        }
    };

    const handleSelectOne = (id: string) => {
        setSelectedIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                newSet.add(id);
            }
            return newSet;
        });
    };

    const handleSave = async (clientData: ClientItem) => {
        try {
            await db.clients.save(clientData, currentCompany.id);
            await fetchData();
            if (editingClient && selectedClient?.id === clientData.id) {
                setSelectedClient(clientData);
                setActiveView('details');
            } else {
                setActiveView('list');
            }
        } catch (err) {
            alert('Ошибка при сохранении: ' + (err as any).message);
        }
    };

    const handleCancelForm = () => {
        if (editingClient && selectedClient) {
            setActiveView('details');
        } else {
            setActiveView('list');
        }
    };

    // Logic to return to the correct place
    const handleBackToTable = () => {
        // If we came from another page (initialSelectedClientId is set) AND onBack is provided by App
        if (initialSelectedClientId && onBack) {
            onBack();
        } else {
            // Standard internal navigation
            setSelectedClient(null);
            setActiveView('list');
        }
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (ratingFilterRef.current && !ratingFilterRef.current.contains(event.target as Node)) setIsRatingFilterOpen(false);
            if (channelFilterRef.current && !channelFilterRef.current.contains(event.target as Node)) setIsChannelFilterOpen(false);
        };
        if (isRatingFilterOpen || isChannelFilterOpen) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isRatingFilterOpen, isChannelFilterOpen]);

    // --- RENDER ---

    if (activeView === 'form') {
        return (
            <ClientForm
                initialData={editingClient}
                onSave={handleSave}
                onCancel={handleCancelForm}
            />
        );
    }

    if (activeView === 'details' && selectedClient) {
        return (
            <ClientDetails
                client={selectedClient}
                isCars={currentCompany.type === 'cars'}
                rentals={rentals}
                onBack={handleBackToTable}
                onEdit={() => handleEdit(selectedClient)}
                onDelete={() => handleDelete(selectedClient.id)}
                onUpdate={handleUpdateClient}
            />
        );
    }

    // List View
    return (
        <div className="flex flex-col h-full">
            <div className="flex-shrink-0 bg-slate-50 px-8 py-6 z-20 flex flex-col gap-4">
                <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-3">
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Search className="h-4 w-4 text-slate-400 group-focus-within:text-neutral-500 transition-colors" /></div>
                            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="block w-64 pl-10 pr-3 py-2 border border-slate-200 rounded-lg leading-5 bg-white placeholder-slate-400 focus:outline-none focus:placeholder-slate-300 focus:border-neutral-500 focus:ring-1 focus:ring-neutral-500 sm:text-sm transition-all" placeholder="Имя, телефон или ИИН..." />
                        </div>
                        <div className="relative" ref={ratingFilterRef}>
                            <button onClick={() => setIsRatingFilterOpen(!isRatingFilterOpen)} className={`flex items-center gap-2 px-3 py-2 border rounded-lg text-sm font-medium transition-colors ${isRatingFilterOpen || ratingFilter !== 'all' ? 'bg-slate-50 border-slate-300 text-slate-800' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-800'}`}>
                                <Filter className="w-4 h-4" />
                                <span>{ratingFilter === 'all' ? 'Рейтинг' : (ratingFilter === 'trusted' ? 'Друг' : ratingFilter === 'caution' ? 'Осторожно' : 'Мошенник')}</span>
                            </button>
                            {isRatingFilterOpen && (
                                <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-slate-200 z-50 animate-in fade-in zoom-in-95 duration-100 overflow-hidden">
                                    <div className="p-1">
                                        {[{ id: 'trusted', label: 'Друг' }, { id: 'caution', label: 'Осторожно' }, { id: 'blacklist', label: 'Мошенник' }].map((opt) => (
                                            <button key={opt.id} onClick={() => { setRatingFilter(ratingFilter === opt.id ? 'all' : opt.id as any); setIsRatingFilterOpen(false); }} className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors ${ratingFilter === opt.id ? 'bg-neutral-50 text-neutral-900 font-medium' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}>
                                                <span className={`w-2 h-2 rounded-full ${opt.id === 'trusted' ? 'bg-emerald-500' : opt.id === 'caution' ? 'bg-amber-500' : 'bg-red-500'}`}></span>{opt.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="relative" ref={channelFilterRef}>
                            <button onClick={() => setIsChannelFilterOpen(!isChannelFilterOpen)} className={`flex items-center gap-2 px-3 py-2 border rounded-lg text-sm font-medium transition-colors ${isChannelFilterOpen || channelFilter !== 'all' ? 'bg-slate-50 border-slate-300 text-slate-800' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-800'}`}>
                                <GripHorizontal className="w-4 h-4" />
                                <span>{channelFilter !== 'all' ? getChannelLabel(channelFilter) : 'Канал привлечения'}</span>
                            </button>
                            {isChannelFilterOpen && (
                                <div className="absolute top-full left-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-slate-200 z-50 animate-in fade-in zoom-in-95 duration-100 overflow-hidden">
                                    <div className="p-1">
                                        {['website', 'whatsapp', 'telegram', 'instagram', 'phone', 'recommendation', 'old_client'].map((id) => (
                                            <button key={id} onClick={() => { setChannelFilter(channelFilter === id ? 'all' : id as any); setIsChannelFilterOpen(false); }} className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors ${channelFilter === id ? 'bg-neutral-50 text-neutral-900 font-medium' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}>{getChannelLabel(id as any)}</button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                    <div>
                        <button onClick={handleCreateNew} className="bg-neutral-900 hover:bg-neutral-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm shadow-neutral-200 flex items-center gap-2">Добавить клиента</button>
                    </div>
                </div>

                {selectedIds.size > 0 && (
                    <div className="w-full bg-neutral-900 text-white rounded-xl px-4 py-3 flex items-center justify-between shadow-lg animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="flex items-center gap-4">
                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white/10"><Check className="w-4 h-4 text-white" /></div>
                            <span className="font-medium">Выбрано клиентов: {selectedIds.size}</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <button onClick={() => setSelectedIds(new Set())} className="px-4 py-2 text-sm font-medium text-neutral-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors">Отмена</button>
                            <button onClick={handleBulkDelete} className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"><Trash2 className="w-4 h-4" />Удалить выбранных</button>
                        </div>
                    </div>
                )}
            </div>

            <div className="flex-1 overflow-y-auto px-8 pb-6 w-full animate-in fade-in slide-in-from-bottom-2 duration-300">
                <ClientsTable
                    data={filteredData}
                    isCars={currentCompany.type === 'cars'}
                    onRowClick={handleClientClick}
                    selectedIds={selectedIds}
                    onSelectAll={handleSelectAll}
                    onSelectOne={handleSelectOne}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                />
            </div>
        </div>
    );
};

// --- CLIENT FORM COMPONENT ---

interface ClientFormProps {
    initialData: ClientItem | null;
    onSave: (data: ClientItem) => void;
    onCancel: () => void;
}

export const ClientForm: React.FC<ClientFormProps> = ({ initialData, onSave, onCancel }) => {
    const isEdit = !!initialData;
    const [formData, setFormData] = useState<Partial<ClientItem>>(() => {
        if (initialData) return JSON.parse(JSON.stringify(initialData));
        return {
            name: '',
            phone: '',
            documents: [],
            emergencyContacts: [],
            rating: 'trusted',
            channel: 'website',
            avatar: `https://ui-avatars.com/api/?name=New+User&background=random`,
            rentalCount: 0,
            totalAmount: '0 ₸',
            paidAmount: '0 ₸',
            debtAmount: '0 ₸',
            overdueCount: 0,
            createdAt: new Date().toLocaleDateString('ru-RU')
        };
    });

    const [editingDocIndex, setEditingDocIndex] = useState<number | null>(null);
    const [editingContactIndex, setEditingContactIndex] = useState<number | null>(null);

    const handleChange = (field: keyof ClientItem, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const [isUploading, setIsUploading] = useState(false);

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setIsUploading(true);
            const url = await uploadFile(file);
            if (url) setFormData(prev => ({ ...prev, avatar: url }));
            setIsUploading(false);
        }
    };

    // --- Document Handlers ---
    const handleAddDocument = () => {
        const newDoc: ClientDocument = { type: 'id_card', number: '', iin: '', images: [] };
        const newDocs = [...(formData.documents || []), newDoc];
        setFormData(prev => ({ ...prev, documents: newDocs }));
        setEditingDocIndex(newDocs.length - 1);
    };

    const handleUpdateDocument = (index: number, field: keyof ClientDocument, value: any) => {
        const newDocs = [...(formData.documents || [])];
        newDocs[index] = { ...newDocs[index], [field]: value };
        setFormData(prev => ({ ...prev, documents: newDocs }));
    };

    const handleDeleteDocument = (index: number) => {
        const newDocs = (formData.documents || []).filter((_, i) => i !== index);
        setFormData(prev => ({ ...prev, documents: newDocs }));
        if (editingDocIndex === index) setEditingDocIndex(null);
    };

    // Upload new file for document (Supports multiple files)
    const handleDocFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, docIndex: number) => {
        const file = e.target.files?.[0];
        if (file) {
            setIsUploading(true);
            const url = await uploadFile(file);
            if (url) {
                const currentDoc = formData.documents?.[docIndex];
                if (currentDoc) {
                    const currentImages = currentDoc.images || [];
                    if (currentImages.length < 4) {
                        handleUpdateDocument(docIndex, 'images', [...currentImages, url]);
                    }
                }
            }
            setIsUploading(false);
        }
    };

    const handleRemoveDocImage = (docIndex: number, imgIndex: number) => {
        const currentDoc = formData.documents?.[docIndex];
        if (currentDoc && currentDoc.images) {
            const newImages = currentDoc.images.filter((_, i) => i !== imgIndex);
            handleUpdateDocument(docIndex, 'images', newImages);
        }
    };

    // --- Contact Handlers ---
    const handleAddContact = () => {
        const newContact: ClientContact = { name: '', phone: '', avatar: `https://ui-avatars.com/api/?name=New+Contact&background=f1f5f9&color=64748b` };
        const newContacts = [...(formData.emergencyContacts || []), newContact];
        setFormData(prev => ({ ...prev, emergencyContacts: newContacts }));
        setEditingContactIndex(newContacts.length - 1);
    };

    const handleUpdateContact = (index: number, field: keyof ClientContact, value: string) => {
        const newContacts = [...(formData.emergencyContacts || [])];
        newContacts[index] = { ...newContacts[index], [field]: value };
        setFormData(prev => ({ ...prev, emergencyContacts: newContacts }));
    };

    const handleDeleteContact = (index: number) => {
        const newContacts = (formData.emergencyContacts || []).filter((_, i) => i !== index);
        setFormData(prev => ({ ...prev, emergencyContacts: newContacts }));
        if (editingContactIndex === index) setEditingContactIndex(null);
    };

    const handleContactImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
        const file = e.target.files?.[0];
        if (file) {
            setIsUploading(true);
            const url = await uploadFile(file);
            if (url) handleUpdateContact(index, 'avatar', url);
            setIsUploading(false);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name || !formData.phone) return;

        const finalData: ClientItem = {
            ...formData as ClientItem,
            id: formData.id || `c${Date.now()}`,
            avatar: formData.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.name || 'User')}&background=random`
        };
        onSave(finalData);
    };

    return (
        <div className="flex flex-col h-full bg-slate-50 animate-in fade-in slide-in-from-right-4 duration-300 relative">
            <div className="bg-white border-b border-slate-200 px-8 py-4 sticky top-0 z-30">
                <div className="max-w-6xl mx-auto flex items-center justify-between w-full">
                    <div className="flex items-center gap-4">
                        <button onClick={onCancel} className="p-2 -ml-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors"><ArrowLeft className="w-5 h-5" /></button>
                        <h1 className="text-xl font-bold text-slate-900">{isEdit ? 'Редактирование клиента' : 'Новый клиент'}</h1>
                    </div>
                    <div className="flex items-center gap-3">
                        <button onClick={onCancel} className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition-colors">Отмена</button>
                        <button onClick={handleSubmit} className="flex items-center gap-2 px-5 py-2 bg-neutral-900 text-white font-medium rounded-lg hover:bg-neutral-800 transition-colors shadow-sm"><Save className="w-4 h-4" />Сохранить</button>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8">
                <form onSubmit={handleSubmit} className="max-w-6xl mx-auto space-y-6 pb-10">

                    {/* Section 1: Basic Info */}
                    <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                        <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">Основная информация</h2>
                        <div className="flex flex-col md:flex-row gap-8">
                            <div className="flex flex-col items-center gap-3">
                                <label className="w-24 h-24 rounded-full bg-slate-100 border-2 border-slate-200 overflow-hidden relative group cursor-pointer hover:border-neutral-300 transition-colors">
                                    <img src={formData.avatar} alt="avatar" className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><Camera className="w-6 h-6 text-white" /></div>
                                    <input type="file" className="hidden" accept="image/*" onChange={handleAvatarUpload} />
                                </label>
                                <span className="text-xs text-slate-400">Нажмите для фото</span>
                            </div>
                            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-1.5"><label className="text-sm font-medium text-slate-700">ФИО Клиента <span className="text-red-500">*</span></label><input type="text" required value={formData.name} onChange={(e) => handleChange('name', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 transition-all" placeholder="Иванов Иван Иванович" /></div>
                                <div className="space-y-1.5"><label className="text-sm font-medium text-slate-700">Номер телефона <span className="text-red-500">*</span></label><input type="tel" required value={formData.phone} onChange={(e) => handleChange('phone', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 transition-all font-mono" placeholder="+7 (777) 000-00-00" /></div>
                                <div className="space-y-1.5"><label className="text-sm font-medium text-slate-700">Рейтинг</label><select value={formData.rating} onChange={(e) => handleChange('rating', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 transition-all bg-white"><option value="trusted">Друг (Trusted)</option><option value="caution">Осторожно (Caution)</option><option value="blacklist">Мошенник (Blacklist)</option></select></div>
                                <div className="space-y-1.5"><label className="text-sm font-medium text-slate-700">Канал привлечения</label><select value={formData.channel} onChange={(e) => handleChange('channel', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 transition-all bg-white"><option value="website">Сайт</option><option value="instagram">Instagram</option><option value="whatsapp">WhatsApp</option><option value="telegram">Telegram</option><option value="phone">Звонок</option><option value="recommendation">Рекомендация</option><option value="old_client">Старый клиент</option></select></div>
                            </div>
                        </div>
                    </section>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                        {/* Section 2: Documents */}
                        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col h-full">
                            <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">Документы</h2>
                            <div className="space-y-4 flex-1">
                                {formData.documents?.map((doc, index) => {
                                    const docImages = doc.images || [];
                                    if (editingDocIndex === index) {
                                        return (
                                            <div key={index} className="bg-slate-50 rounded-xl p-5 border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-200 relative">
                                                <div className="flex flex-col gap-6">
                                                    {/* Images Upload Area - Row */}
                                                    <div className="flex flex-col gap-2">
                                                        <span className="text-sm font-medium text-slate-700">Фото документов (до 4 шт.)</span>
                                                        <div className="flex items-center gap-3 flex-wrap">
                                                            {/* Existing Documents */}
                                                            {docImages.map((img, imgIdx) => (
                                                                <div key={imgIdx} className="relative group w-20 h-20 rounded-xl overflow-hidden border border-slate-200 bg-white flex items-center justify-center">
                                                                    {isImage(img) ? (
                                                                        <img src={img} className="w-full h-full object-cover" alt={`doc-${imgIdx}`} />
                                                                    ) : (
                                                                        <div className="flex flex-col items-center gap-1 text-slate-400">
                                                                            <FileText className="w-8 h-8" />
                                                                            <span className="text-[10px] uppercase font-bold text-slate-500">{img.split('.').pop()}</span>
                                                                        </div>
                                                                    )}
                                                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                                                        <a href={img} target="_blank" rel="noopener noreferrer" className="p-1.5 bg-white/90 text-slate-600 rounded-md hover:text-neutral-900" title="Открыть"><ExternalLink className="w-4 h-4" /></a>
                                                                        <button onClick={() => handleRemoveDocImage(index, imgIdx)} type="button" className="p-1.5 bg-white/90 text-slate-600 rounded-md hover:text-red-600" title="Удалить"><X className="w-4 h-4" /></button>
                                                                    </div>
                                                                </div>
                                                            ))}

                                                            {/* Upload Button (Only if less than 4) */}
                                                            {docImages.length < 4 && (
                                                                <label className="w-20 h-20 bg-white border-2 border-dashed border-slate-300 rounded-xl flex flex-col gap-1 items-center justify-center cursor-pointer hover:border-neutral-900 hover:bg-slate-50 transition-colors relative">
                                                                    {isUploading ? (
                                                                        <span className="animate-spin h-5 w-5 border-2 border-neutral-900 border-t-transparent rounded-full"></span>
                                                                    ) : (
                                                                        <>
                                                                            <Upload className="w-4 h-4 text-slate-400" />
                                                                            <span className="text-[9px] font-medium text-slate-500 uppercase">Файл</span>
                                                                        </>
                                                                    )}
                                                                    <input type="file" className="hidden" accept="image/*,application/pdf" onChange={(e) => handleDocFileUpload(e, index)} disabled={isUploading} />
                                                                </label>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="flex flex-col gap-4">
                                                        <div className="space-y-1.5">
                                                            <label className="text-sm font-medium text-slate-700">Тип документа</label>
                                                            <select value={doc.type} onChange={(e) => handleUpdateDocument(index, 'type', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 transition-all bg-white"><option value="id_card">Удостоверение личности</option><option value="passport">Паспорт</option></select>
                                                        </div>
                                                        <div className="space-y-1.5">
                                                            <label className="text-sm font-medium text-slate-700">ИИН</label>
                                                            <input type="text" value={doc.iin} onChange={(e) => handleUpdateDocument(index, 'iin', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 transition-all font-mono" placeholder="000000000000" maxLength={12} />
                                                        </div>
                                                        <div className="space-y-1.5">
                                                            <label className="text-sm font-medium text-slate-700">Номер документа</label>
                                                            <input type="text" value={doc.number} onChange={(e) => handleUpdateDocument(index, 'number', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 transition-all font-mono" placeholder="123456789" />
                                                        </div>

                                                        {/* Extra Fields (Visible in Edit Form) */}
                                                        <div className="grid grid-cols-2 gap-4">
                                                            <div className="space-y-1.5">
                                                                <label className="text-sm font-medium text-slate-700">Дата рождения</label>
                                                                <input type="date" value={doc.dateOfBirth || ''} onChange={(e) => handleUpdateDocument(index, 'dateOfBirth', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 transition-all" />
                                                            </div>
                                                            <div className="space-y-1.5">
                                                                <label className="text-sm font-medium text-slate-700">Кем выдан</label>
                                                                <input type="text" value={doc.issuedBy || ''} onChange={(e) => handleUpdateDocument(index, 'issuedBy', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 transition-all" placeholder="МВД РК" />
                                                            </div>
                                                            <div className="space-y-1.5">
                                                                <label className="text-sm font-medium text-slate-700">Дата выдачи</label>
                                                                <input type="date" value={doc.issueDate || ''} onChange={(e) => handleUpdateDocument(index, 'issueDate', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 transition-all" />
                                                            </div>
                                                            <div className="space-y-1.5">
                                                                <label className="text-sm font-medium text-slate-700">Срок действия</label>
                                                                <input type="date" value={doc.expiryDate || ''} onChange={(e) => handleUpdateDocument(index, 'expiryDate', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 transition-all" />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex justify-end pt-2 gap-3">
                                                    <button onClick={() => setEditingDocIndex(null)} type="button" className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 text-xs font-medium rounded-lg hover:bg-slate-50 transition-colors">Отмена</button>
                                                    <button onClick={() => setEditingDocIndex(null)} type="button" className="px-3 py-1.5 bg-neutral-900 text-white text-xs font-medium rounded-lg hover:bg-neutral-800 transition-colors">Готово</button>
                                                </div>
                                            </div>
                                        );
                                    }
                                    return (
                                        <div key={index} className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100 group relative transition-all hover:border-slate-300 hover:shadow-sm">
                                            <div className="w-12 h-12 bg-slate-200 rounded-lg flex-shrink-0 flex items-center justify-center text-slate-400 overflow-hidden border border-slate-200 relative">
                                                {docImages.length > 0 ? (
                                                    <>
                                                        {isImage(docImages[0]) ? (
                                                            <img src={docImages[0]} className="w-full h-full object-cover" alt="doc" />
                                                        ) : (
                                                            <div className="flex flex-col items-center justify-center w-full h-full bg-slate-50">
                                                                <FileText className="w-6 h-6 text-slate-400" />
                                                                <span className="text-[8px] font-bold text-slate-500 uppercase">{docImages[0].split('.').pop()}</span>
                                                            </div>
                                                        )}
                                                        {docImages.length > 1 && (
                                                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white text-xs font-bold">+{docImages.length - 1}</div>
                                                        )}
                                                    </>
                                                ) : <FileText className="w-6 h-6" />}
                                            </div>
                                            <div className="flex flex-col min-w-0 gap-1.5">
                                                <div>{getDocTypeBadge(doc.type)}</div>
                                                <div className="flex flex-col space-y-0.5">
                                                    <span className="text-[11px] text-slate-500 font-medium">ИИН: <span className="font-mono text-slate-700 ml-1">{doc.iin}</span></span>
                                                    <span className="text-[11px] text-slate-500 font-medium">№: <span className="font-mono text-slate-700 ml-1">{doc.number}</span></span>
                                                </div>
                                            </div>
                                            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all bg-slate-50 pl-2">
                                                <button onClick={(e) => { e.stopPropagation(); setEditingDocIndex(index); }} type="button" className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"><Pencil className="w-4 h-4" /></button>
                                                <button onClick={(e) => { e.stopPropagation(); handleDeleteDocument(index); }} type="button" className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                                            </div>
                                        </div>
                                    );
                                })}
                                <button onClick={handleAddDocument} type="button" className="w-full h-12 border-2 border-dashed border-slate-300 rounded-xl flex items-center justify-center gap-2 text-slate-500 hover:border-neutral-900 hover:text-neutral-900 transition-colors bg-slate-50/50 hover:bg-white"><Plus className="w-5 h-5" /><span className="font-medium text-sm">Добавить документ</span></button>
                            </div>
                        </section>

                        {/* Section 3: Emergency Contacts */}
                        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col h-full">
                            <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">Экстренные контакты</h2>
                            <div className="space-y-4 flex-1">
                                {formData.emergencyContacts?.map((contact, index) => {
                                    if (editingContactIndex === index) {
                                        return (
                                            <div key={index} className="bg-slate-50 rounded-xl p-5 border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-200 relative">
                                                <div className="flex flex-col gap-6">
                                                    {/* Contact Avatar Upload */}
                                                    <div className="flex-shrink-0 flex flex-col gap-2">
                                                        <span className="text-sm font-medium text-slate-700">Фото</span>
                                                        <label className="w-20 h-20 bg-white border-2 border-dashed border-slate-300 rounded-full flex items-center justify-center cursor-pointer hover:border-neutral-900 hover:bg-slate-50 transition-colors relative overflow-hidden group">
                                                            <img src={contact.avatar} className="w-full h-full object-cover" alt="avatar" />
                                                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><Camera className="w-5 h-5 text-white" /></div>
                                                            <input type="file" className="hidden" accept="image/*" onChange={(e) => handleContactImageUpload(e, index)} />
                                                        </label>
                                                    </div>

                                                    <div className="flex flex-col gap-4">
                                                        <div className="space-y-1.5"><label className="text-sm font-medium text-slate-700">Имя контакта</label><input type="text" value={contact.name} onChange={(e) => handleUpdateContact(index, 'name', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 transition-all" placeholder="Брат / Сват / Друг" /></div>
                                                        <div className="space-y-1.5"><label className="text-sm font-medium text-slate-700">Телефон контакта</label><input type="tel" value={contact.phone} onChange={(e) => handleUpdateContact(index, 'phone', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 transition-all font-mono" placeholder="+7 (777) 000-00-00" /></div>
                                                    </div>
                                                </div>
                                                <div className="flex justify-end pt-2 gap-3">
                                                    <button onClick={() => setEditingContactIndex(null)} type="button" className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 text-xs font-medium rounded-lg hover:bg-slate-50 transition-colors">Отмена</button>
                                                    <button onClick={() => setEditingContactIndex(null)} type="button" className="px-3 py-1.5 bg-neutral-900 text-white text-xs font-medium rounded-lg hover:bg-neutral-800 transition-colors">Готово</button>
                                                </div>
                                            </div>
                                        );
                                    }
                                    return (
                                        <div key={index} className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100 group relative transition-all hover:border-slate-200">
                                            <img src={contact.avatar} className="w-12 h-12 rounded-full object-cover self-start mt-1 border border-slate-200" alt="emergency" />
                                            <div className="flex flex-col gap-1.5">
                                                <div className="font-semibold text-slate-900">{contact.name}</div>
                                                <div className="flex flex-col items-start gap-1.5">
                                                    <div className="flex items-center gap-2"><span className="text-slate-500 text-sm font-mono">{contact.phone}</span></div>
                                                </div>
                                            </div>
                                            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all bg-slate-50 pl-2">
                                                <button onClick={() => setEditingContactIndex(index)} type="button" className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"><Pencil className="w-4 h-4" /></button>
                                                <button onClick={() => handleDeleteContact(index)} type="button" className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                                            </div>
                                        </div>
                                    );
                                })}
                                <button onClick={handleAddContact} type="button" className="w-full h-12 border-2 border-dashed border-slate-300 rounded-xl flex items-center justify-center gap-2 text-slate-500 hover:border-neutral-900 hover:text-neutral-900 transition-colors bg-slate-50/50 hover:bg-white"><Plus className="w-5 h-5" /><span className="font-medium text-sm">Добавить контакт</span></button>
                            </div>
                        </section>
                    </div>
                </form>
            </div>
        </div>
    );
};


// --- Client Details Component ---
const ClientDetails: React.FC<{
    client: ClientItem;
    isCars: boolean;
    rentals: RentalItem[];
    onBack: () => void;
    onEdit: () => void;
    onDelete: () => void;
    onUpdate: (client: ClientItem) => void;
}> = ({ client, isCars, rentals, onBack, onEdit, onDelete, onUpdate }) => {
    // ... rest of existing ClientDetails implementation ...
    const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
    const [historySearch, setHistorySearch] = useState('');
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
    const [dateRange, setDateRange] = useState<{ start: Date | null, end: Date | null }>({ start: null, end: null });
    const [paymentFilter, setPaymentFilter] = useState<'all' | 'paid' | 'partially' | 'pending'>('all');
    const [isPaymentFilterOpen, setIsPaymentFilterOpen] = useState(false);

    // States for Document Viewing & Gallery
    const [viewingDocIndex, setViewingDocIndex] = useState<number | null>(null);
    const [galleryImageIndex, setGalleryImageIndex] = useState<number | null>(null);

    // States for Adding new items (Inline Modals)
    const [isAddDocModalOpen, setIsAddDocModalOpen] = useState(false);
    const [newDocument, setNewDocument] = useState<ClientDocument>({ type: 'id_card', number: '', iin: '', images: [] });

    const [isAddContactModalOpen, setIsAddContactModalOpen] = useState(false);
    const [newContact, setNewContact] = useState<ClientContact>({ name: '', phone: '', avatar: 'https://ui-avatars.com/api/?name=New+Contact&background=f1f5f9&color=64748b' });
    const [isUploading, setIsUploading] = useState(false);

    const datePickerRef = useRef<HTMLDivElement>(null);
    const paymentFilterRef = useRef<HTMLDivElement>(null);

    const copyPhone = () => {
        navigator.clipboard.writeText(client.phone);
    };

    const handleDeleteDocument = (index: number) => {
        if (window.confirm('Удалить этот документ?')) {
            const newDocs = client.documents.filter((_, i) => i !== index);
            onUpdate({ ...client, documents: newDocs });
        }
    };

    const handleDeleteContact = (index: number) => {
        if (window.confirm('Удалить этот контакт?')) {
            const newContacts = client.emergencyContacts.filter((_, i) => i !== index);
            onUpdate({ ...client, emergencyContacts: newContacts });
        }
    };

    const handleSaveNewDocument = () => {
        if (!newDocument.number || !newDocument.iin) {
            alert('Заполните номер документа и ИИН');
            return;
        }
        const updatedDocs = [...client.documents, newDocument];
        onUpdate({ ...client, documents: updatedDocs });
        setIsAddDocModalOpen(false);
        setNewDocument({ type: 'id_card', number: '', iin: '', images: [] });
    };

    const handleNewDocFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setIsUploading(true);
            const url = await uploadFile(file);
            if (url) {
                const currentImages = newDocument.images || [];
                if (currentImages.length < 4) {
                    setNewDocument({ ...newDocument, images: [...currentImages, url] });
                }
            }
            setIsUploading(false);
        }
    };

    const handleSaveNewContact = () => {
        if (!newContact.name || !newContact.phone) {
            alert('Заполните имя и телефон контакта');
            return;
        }
        const updatedContacts = [...client.emergencyContacts, newContact];
        onUpdate({ ...client, emergencyContacts: updatedContacts });
        setIsAddContactModalOpen(false);
        setNewContact({ name: '', phone: '', avatar: 'https://ui-avatars.com/api/?name=New+Contact&background=f1f5f9&color=64748b' });
    };

    const handleNewContactImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setIsUploading(true);
            const url = await uploadFile(file);
            if (url) setNewContact({ ...newContact, avatar: url });
            setIsUploading(false);
        }
    };

    const sourceRentals = rentals;

    // Filter and Override Client Info in Rentals
    const filteredClientRentals = sourceRentals
        // 1. Filter by name (simple match) or phone if strict match needed
        .filter(r => r.client.name === client.name || r.client.phone === client.phone)
        // 2. Map to override the client info with the CURRENT client state (so avatar/name updates reflect immediately)
        .map(r => ({
            ...r,
            client: {
                ...r.client,
                name: client.name,
                phone: client.phone,
                avatarUrl: client.avatar // Ensure the new avatar is shown
            }
        }))
        // 3. Apply view filters (search, date, payment)
        .filter(item => {
            if (historySearch) {
                const lowerQ = historySearch.toLowerCase();
                if (!item.vehicle.name.toLowerCase().includes(lowerQ) && !item.vehicle.plate.toLowerCase().includes(lowerQ) && !item.id.includes(lowerQ)) return false;
            }
            if (paymentFilter !== 'all' && item.payment !== paymentFilter) return false;
            if (dateRange.start && dateRange.end) return true;
            return true;
        });

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) setIsDatePickerOpen(false);
            if (paymentFilterRef.current && !paymentFilterRef.current.contains(event.target as Node)) setIsPaymentFilterOpen(false);
        };
        if (isDatePickerOpen || isPaymentFilterOpen) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isDatePickerOpen, isPaymentFilterOpen]);

    const getDateLabel = () => dateRange.start && dateRange.end ? `${dateRange.start.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })} - ${dateRange.end.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}` : 'Все даты';
    const getPaymentLabel = () => { switch (paymentFilter) { case 'paid': return 'Оплачено'; case 'partially': return 'Частично'; case 'pending': return 'Ожидает'; default: return 'Статус оплаты'; } };

    // --- Gallery Handlers ---
    const currentDoc = viewingDocIndex !== null ? client.documents[viewingDocIndex] : null;
    const currentImages = currentDoc?.images || [];

    const handleNextImage = useCallback(() => {
        if (galleryImageIndex === null) return;
        setGalleryImageIndex((prev) => (prev! + 1) % currentImages.length);
    }, [galleryImageIndex, currentImages.length]);

    const handlePrevImage = useCallback(() => {
        if (galleryImageIndex === null) return;
        setGalleryImageIndex((prev) => (prev! - 1 + currentImages.length) % currentImages.length);
    }, [galleryImageIndex, currentImages.length]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (galleryImageIndex !== null) {
                if (e.key === 'ArrowRight') handleNextImage();
                if (e.key === 'ArrowLeft') handlePrevImage();
                if (e.key === 'Escape') setGalleryImageIndex(null);
            } else if (viewingDocIndex !== null) {
                if (e.key === 'Escape') setViewingDocIndex(null);
            } else if (isAddDocModalOpen) {
                if (e.key === 'Escape') setIsAddDocModalOpen(false);
            } else if (isAddContactModalOpen) {
                if (e.key === 'Escape') setIsAddContactModalOpen(false);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [galleryImageIndex, viewingDocIndex, isAddDocModalOpen, isAddContactModalOpen, handleNextImage, handlePrevImage]);


    return (
        <div className="flex flex-col h-full bg-slate-50 animate-in fade-in slide-in-from-right-4 duration-300 relative">
            <div className="bg-white border-b border-slate-200 px-8 py-6 sticky top-0 z-30">
                <div className="max-w-5xl mx-auto flex items-center justify-between w-full">
                    <div className="flex items-center gap-4">
                        <button onClick={onBack} className="px-4 py-2 bg-white border border-slate-200 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors">Назад</button>
                    </div>
                    <div className="flex items-center gap-3">
                        <button onClick={onEdit} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors"><Pencil className="w-4 h-4" /><span>Редактировать</span></button>
                        <button onClick={onDelete} className="flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-100 text-red-600 font-medium rounded-lg hover:bg-red-100 transition-colors"><Trash2 className="w-4 h-4" /><span>Удалить</span></button>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8">
                <div className="max-w-5xl mx-auto space-y-6">
                    {/* Main Profile Card */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-stretch overflow-hidden">
                        <div className="p-6 flex items-center gap-5 flex-1 min-w-[300px]">
                            <img src={client.avatar} alt={client.name} className="w-20 h-20 rounded-full object-cover border-2 border-slate-100 flex-shrink-0" />
                            <div>
                                <h1 className="text-2xl font-bold text-slate-900 mb-1 whitespace-nowrap">{client.name}</h1>
                                <div className="flex flex-col items-start gap-1.5">
                                    <div className="flex items-center gap-2">
                                        <span className="text-slate-600 font-medium text-[15px] font-mono whitespace-nowrap">{client.phone}</span>
                                        <button onClick={copyPhone} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-colors" title="Скопировать"><Copy className="w-3.5 h-3.5" /></button>
                                    </div>
                                    <a href={`https://wa.me/${client.phone.replace(/[^\d]/g, '')}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-50 text-green-700 border border-green-200 rounded-md hover:bg-green-100 transition-colors text-xs font-semibold whitespace-nowrap"><MessageCircle className="w-3.5 h-3.5" />WhatsApp</a>
                                </div>
                            </div>
                        </div>
                        <div className="hidden md:block w-px bg-slate-100 self-stretch my-2"></div><div className="block md:hidden h-px bg-slate-100 w-full"></div>
                        <div className="px-8 py-4 flex flex-col justify-center items-center gap-2 min-w-[140px] bg-white"><span className="text-xs text-slate-400 font-medium uppercase tracking-wide">Рейтинг</span><div>{getRatingBadge(client.rating)}</div></div>
                        <div className="hidden md:block w-px bg-slate-100 self-stretch my-2"></div><div className="block md:hidden h-px bg-slate-100 w-full"></div>
                        <div className="px-8 py-4 flex flex-col justify-center items-center gap-2 min-w-[160px] bg-white"><span className="text-xs text-slate-400 font-medium uppercase tracking-wide">Источник</span><div>{getChannelBadge(client.channel)}</div></div>
                        <div className="hidden md:block w-px bg-slate-100 self-stretch my-2"></div><div className="block md:hidden h-px bg-slate-100 w-full"></div>
                        <div className="px-8 py-4 flex flex-col justify-center items-center gap-1 min-w-[140px] bg-white pr-10"><span className="text-xs text-slate-400 font-medium uppercase tracking-wide">Дата создания</span><span className="text-sm font-semibold text-slate-900 whitespace-nowrap">{client.createdAt}</span></div>
                    </div>

                    {/* Stats Block */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 grid grid-cols-2 md:grid-cols-5 divide-y md:divide-y-0 md:divide-x divide-slate-100">
                        <div className="px-4 py-3 md:py-0 first:pl-0 flex flex-col justify-center"><span className="text-xl font-bold text-slate-900 whitespace-nowrap">{client.totalAmount}</span><span className="text-xs font-medium text-slate-400 mt-1 uppercase tracking-wide">Сумма аренд</span></div>
                        <div className="px-4 py-3 md:py-0 flex flex-col justify-center"><span className="text-xl font-bold text-emerald-600 whitespace-nowrap">{client.paidAmount}</span><span className="text-xs font-medium text-slate-400 mt-1 uppercase tracking-wide">Оплаченная сумма</span></div>
                        <div className="px-4 py-3 md:py-0 flex flex-col justify-center"><span className="text-xl font-bold text-red-600 whitespace-nowrap">{client.debtAmount}</span><span className="text-xs font-medium text-slate-400 mt-1 uppercase tracking-wide">Сумма долга</span></div>
                        <div className="px-4 py-3 md:py-0 flex flex-col justify-center"><div className="flex items-center gap-2"><span className="text-xl font-bold text-slate-900">{client.overdueCount}</span>{client.overdueAmount && (<span className="bg-amber-100 text-amber-700 text-[11px] font-bold px-1.5 py-0.5 rounded border border-amber-200 whitespace-nowrap">{client.overdueAmount}</span>)}</div><span className="text-xs font-medium text-slate-400 mt-1 uppercase tracking-wide">Просроченных</span></div>
                        <div className="px-4 py-3 md:py-0 flex flex-col justify-center"><span className="text-xl font-bold text-slate-900">{client.rentalCount}</span><span className="text-xs font-medium text-slate-400 mt-1 uppercase tracking-wide">Кол-во аренд</span></div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
                        {/* Documents and Contacts Sections (truncated for brevity, logic identical to original) */}
                        {/* ... */}
                        {/* (Reusing existing components for display) */}
                        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col h-full">
                            <h3 className="text-lg font-bold text-slate-800 mb-4">Документы</h3>
                            <div className="space-y-3 flex-1">
                                {client.documents.map((doc, i) => (
                                    <div
                                        key={i}
                                        onClick={() => setViewingDocIndex(i)}
                                        className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100 group relative transition-all hover:border-slate-300 hover:shadow-sm cursor-pointer"
                                    >
                                        <div className="w-12 h-12 bg-slate-200 rounded-lg flex-shrink-0 flex items-center justify-center text-slate-400 overflow-hidden border border-slate-200 relative">
                                            {doc.images && doc.images.length > 0 ? (
                                                <>
                                                    {isImage(doc.images[0]) ? (
                                                        <img src={doc.images[0]} className="w-full h-full object-cover" alt="doc" />
                                                    ) : (
                                                        <div className="flex flex-col items-center justify-center w-full h-full bg-slate-50">
                                                            <FileText className="w-6 h-6 text-slate-400" />
                                                            <span className="text-[8px] font-bold text-slate-500 uppercase">{doc.images[0].split('.').pop()}</span>
                                                        </div>
                                                    )}
                                                    {doc.images.length > 1 && (
                                                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white text-xs font-bold">+{doc.images.length - 1}</div>
                                                    )}
                                                </>
                                            ) : <FileText className="w-6 h-6" />}
                                        </div>
                                        <div className="flex flex-col min-w-0 gap-1.5">
                                            <div>{getDocTypeBadge(doc.type)}</div>
                                            <div className="flex flex-col space-y-0.5">
                                                <span className="text-[11px] text-slate-500 font-medium">ИИН: <span className="font-mono text-slate-700 ml-1">{doc.iin}</span></span>
                                                <span className="text-[11px] text-slate-500 font-medium">№: <span className="font-mono text-slate-700 ml-1">{doc.number}</span></span>
                                            </div>
                                        </div>
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all bg-slate-50 pl-2">
                                            <button onClick={(e) => { e.stopPropagation(); onEdit(); }} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="Редактировать"><Pencil className="w-4 h-4" /></button>
                                            <button onClick={(e) => { e.stopPropagation(); handleDeleteDocument(i); }} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Удалить"><Trash2 className="w-4 h-4" /></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-3">
                                <button onClick={() => setIsAddDocModalOpen(true)} className="w-full h-12 border-2 border-dashed border-slate-300 rounded-xl flex items-center justify-center gap-2 text-slate-500 hover:border-neutral-900 hover:text-neutral-900 transition-colors bg-slate-50/50 hover:bg-white"><Plus className="w-5 h-5" /><span className="font-medium text-sm">Добавить документ</span></button>
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col h-full">
                            <h3 className="text-lg font-bold text-slate-800 mb-4">Экстренные контакты</h3>
                            <div className="space-y-3 flex-1">
                                {client.emergencyContacts.map((contact, i) => (
                                    <div key={i} className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100 group relative transition-all hover:border-slate-200">
                                        <img src={contact.avatar} className="w-12 h-12 rounded-full object-cover self-start mt-1" alt="emergency" />
                                        <div className="flex flex-col gap-1.5">
                                            <div className="font-semibold text-slate-900">{contact.name}</div>
                                            <div className="flex flex-col items-start gap-1.5">
                                                <div className="flex items-center gap-2"><span className="text-slate-500 text-sm font-mono">{contact.phone}</span></div>
                                            </div>
                                        </div>
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all bg-slate-50 pl-2">
                                            <button onClick={onEdit} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="Редактировать"><Pencil className="w-4 h-4" /></button>
                                            <button onClick={() => handleDeleteContact(i)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Удалить"><Trash2 className="w-4 h-4" /></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-3">
                                <button onClick={() => setIsAddContactModalOpen(true)} className="w-full h-12 border-2 border-dashed border-slate-300 rounded-xl flex items-center justify-center gap-2 text-slate-500 hover:border-neutral-900 hover:text-neutral-900 transition-colors bg-slate-50/50 hover:bg-white"><Plus className="w-5 h-5" /><span className="font-medium text-sm">Добавить контакт</span></button>
                            </div>
                        </div>
                    </div>

                    {/* Rentals History Section */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col">
                        <div className="px-6 py-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-3 flex-1">
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Search className="h-4 w-4 text-slate-400 group-focus-within:text-neutral-500 transition-colors" /></div>
                                    <input type="text" value={historySearch} onChange={(e) => setHistorySearch(e.target.value)} className="block w-64 pl-10 pr-3 py-2 border border-slate-200 rounded-lg leading-5 bg-white placeholder-slate-400 focus:outline-none focus:placeholder-slate-300 focus:border-neutral-500 focus:ring-1 focus:ring-neutral-500 sm:text-sm transition-all" placeholder="Поиск авто..." />
                                </div>
                                <div className="relative" ref={datePickerRef}>
                                    <button onClick={() => setIsDatePickerOpen(!isDatePickerOpen)} className={`flex items-center gap-2 px-3 py-2 border rounded-lg text-sm font-medium transition-colors ${isDatePickerOpen || (dateRange.start) ? 'bg-slate-50 border-slate-300 text-slate-800' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-800'}`}><CalendarIcon className="w-4 h-4" /><span>{getDateLabel()}</span></button>
                                    {isDatePickerOpen && <DateRangePicker initialStart={dateRange.start} initialEnd={dateRange.end} onClose={() => setIsDatePickerOpen(false)} onApply={(start, end) => { setDateRange({ start, end }); setIsDatePickerOpen(false); }} />}
                                </div>
                                <div className="relative" ref={paymentFilterRef}>
                                    <button onClick={() => setIsPaymentFilterOpen(!isPaymentFilterOpen)} className={`flex items-center gap-2 px-3 py-2 border rounded-lg text-sm font-medium transition-colors ${isPaymentFilterOpen || paymentFilter !== 'all' ? 'bg-slate-50 border-slate-300 text-slate-800' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-800'}`}><CreditCard className="w-4 h-4" /><span>{getPaymentLabel()}</span></button>
                                    {isPaymentFilterOpen && (
                                        <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-slate-200 z-50 animate-in fade-in zoom-in-95 duration-100 overflow-hidden"><div className="p-1">{[{ id: 'paid', label: 'Оплачено', icon: Check, color: 'text-emerald-600' }, { id: 'partially', label: 'Частично', icon: Hourglass, color: 'text-orange-600' }, { id: 'pending', label: 'Ожидает', icon: AlertCircle, color: 'text-slate-500' }].map((opt) => (<button key={opt.id} onClick={() => { if (paymentFilter === opt.id) { setPaymentFilter('all'); } else { setPaymentFilter(opt.id as any); } setIsPaymentFilterOpen(false); }} className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors ${paymentFilter === opt.id ? 'bg-neutral-50 text-neutral-900 font-medium' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}>{opt.icon && <opt.icon className={`w-4 h-4 ${opt.color}`} />}{!opt.icon && <span className="w-4 h-4 block"></span>}{opt.label}</button>))}</div></div>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200">
                                    <button onClick={() => setViewMode('table')} className={`p-1.5 rounded-md transition-all ${viewMode === 'table' ? 'bg-white shadow-sm text-neutral-900' : 'text-slate-500 hover:text-slate-700'}`}><LayoutList className="w-4 h-4" /></button>
                                    <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm text-neutral-900' : 'text-slate-500 hover:text-slate-700'}`}><LayoutGrid className="w-4 h-4" /></button>
                                </div>
                            </div>
                        </div>
                        <div className="p-0">
                            {filteredClientRentals.length > 0 ? (
                                viewMode === 'table' ? (
                                    <RentalsTable data={filteredClientRentals} isCars={isCars} className="w-full flex flex-col" />
                                ) : (
                                    <div className="p-6">
                                        <RentalsGrid data={filteredClientRentals} className="grid grid-cols-1 md:grid-cols-2 gap-6" />
                                    </div>
                                )
                            ) : (
                                <div className="flex flex-col items-center justify-center py-12 text-center">
                                    <div className="w-12 h-12 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center mb-3">
                                        <Info className="w-6 h-6" />
                                    </div>
                                    <h3 className="text-sm font-medium text-slate-900">Записей не найдено</h3>
                                    <p className="text-sm text-slate-500 mt-1">Попробуйте изменить параметры поиска или фильтрации.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Add Document Modal (Inline in Details) */}
            {isAddDocModalOpen && (
                <div className="absolute inset-0 z-[60] flex items-center justify-center bg-neutral-900/50 backdrop-blur-sm animate-in fade-in duration-200 p-4">
                    <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
                        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                            <h3 className="font-bold text-slate-800">Добавить документ</h3>
                            <button onClick={() => setIsAddDocModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors"><X className="w-5 h-5" /></button>
                        </div>
                        {/* ... Modal content similar to form ... */}
                        {/* Reusing Form logic for simplicity in this truncated version */}
                        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-slate-700">Тип документа</label>
                                <select value={newDocument.type} onChange={(e) => setNewDocument({ ...newDocument, type: e.target.value as any })} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 transition-all bg-white"><option value="id_card">Удостоверение личности</option><option value="passport">Паспорт</option></select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-slate-700">ИИН</label>
                                <input type="text" value={newDocument.iin} onChange={(e) => setNewDocument({ ...newDocument, iin: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 transition-all font-mono" placeholder="000000000000" maxLength={12} />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-slate-700">Номер документа</label>
                                <input type="text" value={newDocument.number} onChange={(e) => setNewDocument({ ...newDocument, number: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 transition-all font-mono" placeholder="123456789" />
                            </div>
                            {/* ... other fields ... */}
                            <div className="space-y-2">
                                <span className="text-sm font-medium text-slate-700">Фото (до 4 шт.)</span>
                                <div className="flex items-center gap-3 flex-wrap">
                                    {newDocument.images.map((img, i) => (
                                        <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border border-slate-200 bg-white flex items-center justify-center group">
                                            {isImage(img) ? (
                                                <img src={img} className="w-full h-full object-cover" alt="preview" />
                                            ) : (
                                                <div className="flex flex-col items-center text-slate-400">
                                                    <FileText className="w-6 h-6" />
                                                    <span className="text-[8px] font-bold uppercase">{img.split('.').pop()}</span>
                                                </div>
                                            )}
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                                                <a href={img} target="_blank" rel="noopener noreferrer" className="p-1 bg-white/90 text-slate-600 rounded hover:text-neutral-900" title="Открыть"><ExternalLink className="w-3 h-3" /></a>
                                                <button onClick={() => setNewDocument({ ...newDocument, images: newDocument.images.filter((_, idx) => idx !== i) })} className="p-1 bg-white/90 text-red-500 rounded hover:bg-red-50" title="Удалить"><X className="w-3 h-3" /></button>
                                            </div>
                                        </div>
                                    ))}
                                    {newDocument.images.length < 4 && (
                                        <label className="w-16 h-16 bg-slate-50 border-2 border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-neutral-900 hover:bg-white transition-colors relative">
                                            {isUploading ? (
                                                <span className="animate-spin h-4 w-4 border-2 border-neutral-900 border-t-transparent rounded-full"></span>
                                            ) : (
                                                <>
                                                    <Upload className="w-4 h-4 text-slate-400" />
                                                    <span className="text-[8px] font-bold text-slate-500 uppercase">Файл</span>
                                                </>
                                            )}
                                            <input type="file" className="hidden" accept="image/*,application/pdf" onChange={handleNewDocFileUpload} disabled={isUploading} />
                                        </label>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                            <button onClick={() => setIsAddDocModalOpen(false)} className="px-4 py-2 bg-white border border-slate-200 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors">Отмена</button>
                            <button onClick={handleSaveNewDocument} className="px-4 py-2 bg-neutral-900 text-white font-medium rounded-lg hover:bg-neutral-800 transition-colors">Добавить</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Contact Modal (Inline in Details) */}
            {isAddContactModalOpen && (
                <div className="absolute inset-0 z-[60] flex items-center justify-center bg-neutral-900/50 backdrop-blur-sm animate-in fade-in duration-200 p-4">
                    <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
                        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                            <h3 className="font-bold text-slate-800">Добавить экстренный контакт</h3>
                            <button onClick={() => setIsAddContactModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="flex flex-col items-center gap-3 pb-2">
                                <div className="relative group w-20 h-20 rounded-full overflow-hidden border border-slate-200">
                                    <img src={newContact.avatar} className="w-full h-full object-cover" alt="avatar" />
                                    <label className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                                        <Camera className="w-6 h-6 text-white" />
                                        <input type="file" className="hidden" accept="image/*" onChange={handleNewContactImageUpload} />
                                    </label>
                                </div>
                                <span className="text-xs text-slate-400">Фото контакта</span>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-slate-700">Имя</label>
                                <input type="text" value={newContact.name} onChange={(e) => setNewContact({ ...newContact, name: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 transition-all" placeholder="Имя контакта" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-slate-700">Телефон</label>
                                <input type="tel" value={newContact.phone} onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 transition-all font-mono" placeholder="+7 (777) 000-00-00" />
                            </div>
                        </div>
                        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                            <button onClick={() => setIsAddContactModalOpen(false)} className="px-4 py-2 bg-white border border-slate-200 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors">Отмена</button>
                            <button onClick={handleSaveNewContact} className="px-4 py-2 bg-neutral-900 text-white font-medium rounded-lg hover:bg-neutral-800 transition-colors">Добавить</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ... Document Viewing Modal and Gallery (omitted for brevity but part of return) ... */}
            {viewingDocIndex !== null && currentDoc && (
                <div className="absolute inset-0 z-[60] flex items-center justify-center bg-neutral-900/50 backdrop-blur-sm animate-in fade-in duration-200 p-4">
                    <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
                        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                            <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                {getDocTypeBadge(currentDoc.type)}
                                <span className="text-slate-400 font-normal">|</span>
                                <span className="font-mono text-slate-600">{currentDoc.number}</span>
                            </h3>
                            <button onClick={() => setViewingDocIndex(null)} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="p-6 overflow-y-auto">
                            <div className="grid grid-cols-2 gap-4 mb-6">
                                <div>
                                    <span className="text-xs text-slate-400 font-medium uppercase tracking-wide block mb-1">ИИН</span>
                                    <span className="text-lg font-mono font-medium text-slate-900 block bg-slate-50 px-3 py-2 rounded-lg border border-slate-100">{currentDoc.iin}</span>
                                </div>
                                <div>
                                    <span className="text-xs text-slate-400 font-medium uppercase tracking-wide block mb-1">Номер документа</span>
                                    <span className="text-lg font-mono font-medium text-slate-900 block bg-slate-50 px-3 py-2 rounded-lg border border-slate-100">{currentDoc.number}</span>
                                </div>
                            </div>

                            {/* Detailed Information Section */}
                            <div className="mb-6">
                                <h4 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2"><Info className="w-4 h-4 text-slate-400" />Подробная информация</h4>
                                <div className="grid grid-cols-2 gap-4 bg-slate-50 rounded-xl p-4 border border-slate-100">
                                    <div>
                                        <span className="text-xs text-slate-400 font-medium block mb-1">Дата рождения</span>
                                        <span className="text-sm font-semibold text-slate-900 block">{currentDoc.dateOfBirth ? formatDateForInput(currentDoc.dateOfBirth) : '-'}</span>
                                    </div>
                                    <div>
                                        <span className="text-xs text-slate-400 font-medium block mb-1">Кем выдан</span>
                                        <span className="text-sm font-semibold text-slate-900 block">{currentDoc.issuedBy || '-'}</span>
                                    </div>
                                    <div>
                                        <span className="text-xs text-slate-400 font-medium block mb-1">Дата выдачи</span>
                                        <span className="text-sm font-semibold text-slate-900 block">{currentDoc.issueDate ? formatDateForInput(currentDoc.issueDate) : '-'}</span>
                                    </div>
                                    <div>
                                        <span className="text-xs text-slate-400 font-medium block mb-1">Срок действия</span>
                                        <span className="text-sm font-semibold text-slate-900 block">{currentDoc.expiryDate ? formatDateForInput(currentDoc.expiryDate) : '-'}</span>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <span className="text-xs text-slate-400 font-medium uppercase tracking-wide block mb-3">Фотографии документа</span>
                                {currentImages.length > 0 ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {currentImages.map((img, idx) => {
                                            const isImg = isImage(img);
                                            return (
                                                <div
                                                    key={idx}
                                                    className="rounded-xl overflow-hidden border border-slate-200 bg-slate-50 aspect-video group relative cursor-pointer hover:border-slate-300 hover:shadow-md transition-all flex items-center justify-center"
                                                    onClick={() => isImg ? setGalleryImageIndex(idx) : window.open(img, '_blank')}
                                                >
                                                    {isImg ? (
                                                        <img src={img} className="w-full h-full object-contain" alt={`View doc ${idx}`} />
                                                    ) : (
                                                        <div className="flex flex-col items-center gap-2 text-slate-400">
                                                            <FileText className="w-12 h-12" />
                                                            <span className="text-sm font-bold uppercase">{img.split('.').pop()}</span>
                                                        </div>
                                                    )}
                                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center gap-3">
                                                        <Eye className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 drop-shadow-md transition-opacity" />
                                                        {!isImg && <ExternalLink className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 drop-shadow-md transition-opacity" />}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="h-32 rounded-xl border border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400 bg-slate-50">
                                        <FileText className="w-8 h-8 mb-2 opacity-50" />
                                        <span className="text-sm">Нет загруженных изображений</span>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
                            <button onClick={() => setViewingDocIndex(null)} className="px-6 py-2 bg-neutral-900 text-white font-medium rounded-lg hover:bg-neutral-800 transition-colors">Закрыть</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Full Screen Gallery Overlay */}
            {galleryImageIndex !== null && currentImages.length > 0 && (
                <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center animate-in fade-in duration-300 outline-none" tabIndex={0} autoFocus>
                    {/* Actions */}
                    <div className="absolute top-4 right-4 flex items-center gap-2 z-[101]">
                        <a
                            href={currentImages[galleryImageIndex]}
                            download
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-3 bg-black/50 hover:bg-white/20 text-white rounded-full transition-colors backdrop-blur-md"
                            title="Скачать / Открыть"
                        >
                            <Download className="w-6 h-6" />
                        </a>
                        <button
                            onClick={() => setGalleryImageIndex(null)}
                            className="p-3 bg-black/50 hover:bg-white/20 text-white rounded-full transition-colors backdrop-blur-md"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    {/* Main Image */}
                    <div className="w-full h-full p-4 flex items-center justify-center">
                        <img
                            src={currentImages[galleryImageIndex]}
                            alt={`Gallery ${galleryImageIndex}`}
                            className="max-h-full max-w-full object-contain shadow-2xl"
                        />
                    </div>

                    {/* Navigation Buttons (only if > 1 image) */}
                    {currentImages.length > 1 && (
                        <>
                            <button
                                onClick={(e) => { e.stopPropagation(); handlePrevImage(); }}
                                className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-black/50 hover:bg-white/20 text-white rounded-full transition-colors backdrop-blur-md"
                            >
                                <ChevronLeft className="w-8 h-8" />
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); handleNextImage(); }}
                                className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-black/50 hover:bg-white/20 text-white rounded-full transition-colors backdrop-blur-md"
                            >
                                <ChevronRight className="w-8 h-8" />
                            </button>
                        </>
                    )}

                    {/* Counter */}
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/60 px-4 py-1.5 rounded-full text-white text-sm font-medium backdrop-blur-md border border-white/10">
                        {galleryImageIndex + 1} / {currentImages.length}
                    </div>
                </div>
            )}
        </div>
    );
};

interface ClientsTableProps {
    data: ClientItem[];
    isCars: boolean;
    onRowClick: (client: ClientItem) => void;
    selectedIds?: Set<string>;
    onSelectAll?: (checked: boolean) => void;
    onSelectOne?: (id: string) => void;
    onEdit?: (client: ClientItem) => void;
    onDelete?: (id: string) => void;
}

const ClientsTable: React.FC<ClientsTableProps> = ({ data, isCars, onRowClick, selectedIds, onSelectAll, onSelectOne, onEdit, onDelete }) => {
    const [columns, setColumns] = useState<ColumnConfig[]>([
        { id: 'checkbox', label: '', visible: true, width: 'w-12' },
        { id: 'name', label: 'Клиент', visible: true, width: 'min-w-[250px]' },
        { id: 'documents', label: 'Документ / ИИН', visible: true, width: 'min-w-[180px]' },
        { id: 'rating', label: 'Рейтинг', visible: true, width: 'min-w-[120px]' },
        { id: 'rentalCount', label: 'Кол-во аренд', visible: true, width: 'min-w-[100px]' },
        { id: 'totalAmount', label: 'Сумма аренд', visible: true, width: 'min-w-[120px]' },
        { id: 'emergencyContact', label: 'Экстренный контакт', visible: true, width: 'min-w-[250px]' },
        { id: 'channel', label: 'Канал привлечения', visible: true, width: 'min-w-[160px]' },
        { id: 'actions', label: '', visible: true, width: 'w-12' },
    ]);

    const [settingsOpen, setSettingsOpen] = useState(false);
    const [settingsPos, setSettingsPos] = useState({ top: 0, left: 0 });
    const settingsButtonRef = useRef<HTMLButtonElement>(null);
    const settingsMenuRef = useRef<HTMLDivElement>(null);
    const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);

    const handleSettingsClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (settingsOpen) { setSettingsOpen(false); }
        else if (settingsButtonRef.current) {
            const rect = settingsButtonRef.current.getBoundingClientRect();
            setSettingsPos({ top: rect.bottom + 8, left: rect.right - 240 });
            setSettingsOpen(true);
        }
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (settingsMenuRef.current?.contains(event.target as Node)) return;
            if (settingsButtonRef.current?.contains(event.target as Node)) return;
            setSettingsOpen(false);
        };
        if (settingsOpen) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [settingsOpen]);

    const toggleColumn = (id: string) => setColumns(prev => prev.map(col => col.id === id ? { ...col, visible: !col.visible } : col));
    const handleDragStart = (index: number) => setDraggedItemIndex(index);
    const handleDragOver = (e: React.DragEvent) => e.preventDefault();
    const handleDrop = (index: number) => {
        if (draggedItemIndex === null || draggedItemIndex === index) return;
        const newColumns = [...columns];
        const [draggedItem] = newColumns.splice(draggedItemIndex, 1);
        newColumns.splice(index, 0, draggedItem);
        setColumns(newColumns);
        setDraggedItemIndex(null);
    };

    return (
        <>
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col">
                <div className="overflow-x-auto w-full rounded-xl">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200">
                                {columns.map((col) => {
                                    if (!col.visible) return null;
                                    const stickyClass = "sticky top-0 z-10 bg-slate-50 shadow-[0_1px_0_0_#e2e8f0]";

                                    if (col.id === 'actions') {
                                        return (
                                            <th key={col.id} className={`px-4 py-3 w-12 text-center align-middle ${stickyClass}`}>
                                                <button ref={settingsButtonRef} onClick={handleSettingsClick} className={`p-1.5 rounded-md transition-colors ${settingsOpen ? 'bg-neutral-100 text-neutral-600' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'}`}><Settings className="w-4 h-4" /></button>
                                            </th>
                                        );
                                    }

                                    if (col.id === 'checkbox') {
                                        return (
                                            <th key={col.id} className={`px-4 py-3 w-12 align-middle ${stickyClass}`}>
                                                <input
                                                    type="checkbox"
                                                    className="rounded border-slate-300 text-neutral-600 focus:ring-neutral-500 cursor-pointer w-4 h-4"
                                                    checked={!!selectedIds && data.length > 0 && selectedIds.size === data.length}
                                                    onChange={(e) => onSelectAll?.(e.target.checked)}
                                                    disabled={!onSelectAll}
                                                />
                                            </th>
                                        );
                                    }
                                    let alignClass = 'text-left';
                                    if (['rentalCount', 'totalAmount'].includes(col.id as string)) alignClass = 'text-right';

                                    return <th key={col.id as string} className={`px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap align-middle ${col.width || ''} ${alignClass} ${stickyClass}`}>
                                        {col.label}
                                    </th>;
                                })}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {data.map((item) => {
                                const doc = item.documents[0] || { type: 'id_card', number: '-', iin: '-', images: [] };
                                const contact = item.emergencyContacts[0];

                                return (
                                    <tr key={item.id} onClick={() => onRowClick(item)} className={`hover:bg-slate-50/80 transition-colors group cursor-pointer ${selectedIds.has(item.id) ? 'bg-slate-50' : ''}`}>
                                        {columns.map((col) => {
                                            if (!col.visible) return null;
                                            if (col.id === 'actions') return (
                                                <td key={`${item.id}-actions`} className="px-4 py-3 align-middle text-center" onClick={(e) => e.stopPropagation()}>
                                                    <div className="flex items-center justify-center gap-2">
                                                        {onEdit && <button onClick={() => onEdit(item)} className="p-1.5 text-slate-400 hover:text-neutral-900 hover:bg-slate-100 rounded-md transition-all"><Pencil className="w-4 h-4" /></button>}
                                                        {onDelete && <button onClick={() => onDelete(item.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-all"><Trash2 className="w-4 h-4" /></button>}
                                                    </div>
                                                </td>
                                            );

                                            if (col.id === 'checkbox') {
                                                return (
                                                    <td key={`${item.id}-checkbox`} className="px-4 py-3 align-middle" onClick={(e) => e.stopPropagation()}>
                                                        <input
                                                            type="checkbox"
                                                            className="rounded border-slate-300 text-neutral-600 focus:ring-neutral-500 cursor-pointer w-4 h-4"
                                                            checked={selectedIds?.has(item.id) || false}
                                                            onChange={() => onSelectOne?.(item.id)}
                                                            onClick={(e) => e.stopPropagation()}
                                                            disabled={!onSelectOne}
                                                        />
                                                    </td>
                                                );
                                            }

                                            if (col.id === 'name') return (
                                                <td key={`${item.id}-name`} className="px-4 py-3 align-middle">
                                                    <div className="flex items-center gap-3">
                                                        <img src={item.avatar} alt="avatar" className="w-10 h-10 rounded-full object-cover bg-slate-100 border border-slate-200 flex-shrink-0" />
                                                        <div className="flex flex-col min-w-0">
                                                            <span className="font-semibold text-slate-900 text-[13px] leading-tight truncate">{item.name}</span>
                                                            <span className="text-[11px] text-slate-500 mt-0.5">{item.phone}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                            );

                                            if (col.id === 'emergencyContact') return (
                                                <td key={`${item.id}-emergencyContact`} className="px-4 py-3 align-middle">
                                                    {contact ? (
                                                        <div className="flex items-center gap-3">
                                                            <img src={contact.avatar} alt="contact" className="w-10 h-10 rounded-full object-cover bg-slate-100 border border-slate-200 flex-shrink-0" />
                                                            <div className="flex flex-col min-w-0">
                                                                <span className="font-semibold text-slate-900 text-[13px] leading-tight truncate">{contact.name}</span>
                                                                <span className="text-[11px] text-slate-500 mt-0.5">{contact.phone}</span>
                                                            </div>
                                                        </div>
                                                    ) : <span className="text-slate-400 text-xs">-</span>}
                                                </td>
                                            );

                                            if (col.id === 'rating') return <td key={`${item.id}-rating`} className="px-4 py-3 align-middle">{getRatingBadge(item.rating)}</td>;
                                            if (col.id === 'channel') return <td key={`${item.id}-channel`} className="px-4 py-3 align-middle">{getChannelBadge(item.channel)}</td>;

                                            if (['rentalCount', 'totalAmount'].includes(col.id as string)) {
                                                return <td key={`${item.id}-${col.id}`} className="px-4 py-3 align-middle text-right"><span className="text-[13px] font-medium text-slate-700 whitespace-nowrap">{item[col.id as keyof ClientItem] as any}</span></td>;
                                            }

                                            if (col.id === 'documents') {
                                                return (
                                                    <td key={`${item.id}-documents`} className="px-4 py-3 align-middle">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center flex-shrink-0 text-slate-400 relative overflow-hidden group/doc">
                                                                {doc.images && doc.images.length > 0 ? (
                                                                    <>
                                                                        {isImage(doc.images[0]) ? (
                                                                            <img src={doc.images[0]} className="w-full h-full object-cover" alt="doc" />
                                                                        ) : (
                                                                            <div className="flex flex-col items-center justify-center w-full h-full bg-slate-50">
                                                                                <FileText className="w-5 h-5 text-slate-400" />
                                                                                <span className="text-[7px] font-bold text-slate-500 uppercase">{doc.images[0].split('.').pop()}</span>
                                                                            </div>
                                                                        )}
                                                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/doc:opacity-100 transition-opacity flex items-center justify-center">
                                                                            <Download className="w-4 h-4 text-white" />
                                                                        </div>
                                                                    </>
                                                                ) : <FileText className="w-5 h-5" />}
                                                            </div>
                                                            <div className="flex flex-col min-w-0">
                                                                <span className="text-[13px] font-semibold text-slate-900 leading-tight">{doc.number}</span>
                                                                <span className="text-[11px] text-slate-500 font-mono mt-0.5">{doc.iin}</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                );
                                            }

                                            return <td key={`${item.id}-${col.id}`} className="px-4 py-3 align-middle text-[13px] text-slate-600 whitespace-nowrap">{String(item[col.id as keyof ClientItem] || '-')}</td>;
                                        })}
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
            {settingsOpen && (
                <div ref={settingsMenuRef} className="fixed bg-white rounded-xl shadow-xl border border-slate-200 z-[9999] flex flex-col w-60 animate-in fade-in zoom-in-95 duration-100 origin-top-right" style={{ top: `${settingsPos.top}px`, left: `${settingsPos.left}px` }}>
                    <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 rounded-t-xl"><span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Столбцы таблицы</span></div>
                    <div className="p-1 max-h-[300px] overflow-y-auto">{columns.map((c, index) => { if (c.id === 'checkbox' || c.id === 'actions') return null; return (<div key={c.id as string} draggable onDragStart={() => handleDragStart(index)} onDragOver={handleDragOver} onDrop={() => handleDrop(index)} onClick={(e) => { e.stopPropagation(); toggleColumn(c.id as string); }} className={`w-full flex items-center justify-between px-2 py-2 text-[13px] rounded-lg hover:bg-slate-50 text-slate-700 transition-colors group cursor-pointer ${draggedItemIndex === index ? 'opacity-50 bg-slate-100 border border-dashed border-slate-300' : ''}`}><div className="flex items-center gap-2"><div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${c.visible ? 'bg-neutral-900 border-neutral-900' : 'border-slate-300 group-hover:border-slate-400'}`}><Check className={`w-3 h-3 text-white transition-opacity ${c.visible ? 'opacity-100' : 'opacity-0'}`} /></div><span>{c.label}</span></div><div className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500 p-1"><GripVertical className="w-4 h-4" /></div></div>); })}</div>
                </div>
            )}
        </>
    );
};