import React, { useState, useRef, useEffect } from 'react';
import { PageProps, VehicleItem, RentalItem, Tariff } from '../../types';
import { Settings, Check, Search, Filter, GripVertical, AlertTriangle, Wrench, CheckCircle2, Circle, Plus, Activity, Car, Bike, Cone, ArrowLeft, Calendar, FileText, Hash, Gauge, Palette, History, Shield, AlertCircle, Copy, Pencil, Trash2, Info, Fuel, DollarSign, Save, X, Camera, Upload, Calendar as CalendarIcon, CreditCard, LayoutList, LayoutGrid, Hourglass, ChevronDown, Zap } from 'lucide-react';
import { getStatusBadge as getRentalStatusBadge, RentalsTable, RentalsGrid, DateRangePicker } from './Rentals';
import { db, uploadImage } from '../../lib/db';
import { formatDateTime, parseDateTime } from '../../lib/utils';

type TabId = 'vehicles' | 'maintenance';

// --- Redundant types removed ---

// Local interface extending the data model with UI-specific fields if needed, 
// though we will use the one from data.ts mostly. 
// We'll keep the local type for internal table usage which might add computed fields.
interface WarehouseVehicleItem extends VehicleItem {
    lastRental?: {
        id: string;
        status: string;
        date: string;
    };
}

interface ColumnConfig {
    id: keyof WarehouseVehicleItem | 'checkbox' | 'actions' | 'lastRental';
    label: string;
    visible: boolean;
    width?: string;
}

// --- Helper Functions for Badges ---
const BADGE_BASE_CLASS = "inline-flex items-center justify-center gap-1.5 px-2.5 h-6 rounded-md text-[11px] font-semibold border whitespace-nowrap";

const getStatusBadge = (status: VehicleItem['status']) => {
    switch (status) {
        case 'available':
            return <span className={`${BADGE_BASE_CLASS} bg-emerald-50 text-emerald-700 border-emerald-200`}>Доступен</span>;
        case 'rented':
            return <span className={`${BADGE_BASE_CLASS} bg-blue-50 text-blue-700 border-blue-200`}>В аренде</span>;
        case 'maintenance':
            return <span className={`${BADGE_BASE_CLASS} bg-orange-50 text-orange-700 border-orange-200`}>На обслуживании</span>;
        default:
            return null;
    }
};

const getConditionBadge = (condition: VehicleItem['condition']) => {
    switch (condition) {
        case 'new':
            return <span className={`${BADGE_BASE_CLASS} bg-indigo-50 text-indigo-700 border-indigo-200`}>Новый</span>;
        case 'good':
            return <span className={`${BADGE_BASE_CLASS} bg-slate-100 text-slate-600 border-slate-200`}>Исправен</span>;
        case 'broken':
            return <span className={`${BADGE_BASE_CLASS} bg-red-50 text-red-700 border-red-200`}>Сломан</span>;
        default:
            return null;
    }
};

const parseRentalDate = (dateStr: string) => {
    if (!dateStr) return 0;
    const [datePart, timePart] = dateStr.split(', ');
    const parts = datePart.split('.');
    if (parts.length !== 3) return 0;
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);

    let hours = 0;
    let minutes = 0;
    if (timePart) {
        const timeParts = timePart.split(':');
        if (timeParts.length === 2) {
            hours = parseInt(timeParts[0], 10);
            minutes = parseInt(timeParts[1], 10);
        }
    }
    return new Date(year, month, day, hours, minutes).getTime();
};

// --- Tariff Modal Component ---

interface TariffModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (tariff: Tariff) => void;
    initialData?: Tariff | null;
}

const TariffModal: React.FC<TariffModalProps> = ({ isOpen, onClose, onSave, initialData }) => {
    const [formData, setFormData] = useState<Partial<Tariff>>({
        name: '',
        price: '',
        period: 'День (1 д.)',
        days: '1',
        isAllDays: false,
        weekDays: []
    });

    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                setFormData({ ...initialData });
            } else {
                setFormData({
                    name: '',
                    price: '',
                    period: 'День (1 д.)',
                    days: '1',
                    isAllDays: true,
                    weekDays: []
                });
            }
        }
    }, [isOpen, initialData]);

    if (!isOpen) return null;

    const weekDays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

    const toggleDay = (day: string) => {
        if (formData.isAllDays) return;

        const currentDays = formData.weekDays || [];
        if (currentDays.includes(day)) {
            setFormData(prev => ({ ...prev, weekDays: currentDays.filter(d => d !== day) }));
        } else {
            setFormData(prev => ({ ...prev, weekDays: [...currentDays, day] }));
        }
    };

    const handlePeriodChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const val = e.target.value;
        let daysCount = '0';
        if (val.includes('1 д.')) daysCount = '1';
        else if (val.includes('7 д.')) daysCount = '7';
        else if (val.includes('30 д.')) daysCount = '30';
        else if (val.includes('1 час')) daysCount = '0.04'; // Approx

        setFormData(prev => ({ ...prev, period: val, days: daysCount }));
    };

    const handleSubmit = () => {
        if (!formData.name || !formData.price) return;

        // Calculate final days count
        let finalDays = formData.days || '1';
        // If we have turned off "All days" and have selected specific days, 
        // the days count should be the length of the weekDays array.
        if (!formData.isAllDays && formData.weekDays) {
            finalDays = formData.weekDays.length.toString();
        }

        onSave({
            id: initialData?.id || `t-${Date.now()}`,
            name: formData.name,
            price: formData.price,
            period: formData.period || 'День (1 д.)',
            days: finalDays,
            isAllDays: formData.isAllDays,
            weekDays: formData.weekDays
        });
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-neutral-900/50 backdrop-blur-sm animate-in fade-in duration-200 p-4">
            <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
                <div className="p-6 pb-0">
                    <h3 className="text-xl font-bold text-slate-900 mb-6">{initialData ? 'Редактировать тариф' : 'Создать тариф'}</h3>

                    <div className="space-y-6">
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-slate-700">Название <span className="text-red-500">*</span></label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 transition-all text-slate-900 placeholder-slate-400"
                                placeholder="Например: Сутки"
                            />
                        </div>

                        <div className="flex gap-4">
                            <div className="space-y-1.5 flex-1">
                                <label className="text-sm font-medium text-slate-700">Цена <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    value={formData.price}
                                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 transition-all text-slate-900 placeholder-slate-400"
                                    placeholder="0"
                                />
                            </div>
                            <div className="space-y-1.5 flex-1">
                                <label className="text-sm font-medium text-slate-700">Период <span className="text-red-500">*</span></label>
                                <div className="relative">
                                    <select
                                        value={formData.period}
                                        onChange={handlePeriodChange}
                                        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 transition-all text-slate-900 bg-white appearance-none cursor-pointer"
                                    >
                                        <option>Час (1 час)</option>
                                        <option>День (1 д.)</option>
                                        <option>Неделя (7 д.)</option>
                                        <option>Месяц (30 д.)</option>
                                    </select>
                                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-between py-1">
                            <span className="font-bold text-slate-900 text-sm">Все дни недели</span>
                            <div className="flex items-center gap-3">
                                <span className="text-sm text-slate-400">Тариф действует во все дни недели</span>
                                <button
                                    type="button"
                                    onClick={() => setFormData(prev => ({ ...prev, isAllDays: !prev.isAllDays, weekDays: [] }))}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-neutral-500 focus:ring-offset-2 ${formData.isAllDays ? 'bg-neutral-900' : 'bg-slate-200'}`}
                                >
                                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.isAllDays ? 'translate-x-6' : 'translate-x-1'}`} />
                                </button>
                            </div>
                        </div>

                        <div className="space-y-2 pb-4">
                            <label className="text-sm font-medium text-slate-700">Дни недели <span className="text-red-500">*</span></label>
                            <div className="flex justify-between gap-2">
                                {weekDays.map(day => {
                                    const isSelected = formData.isAllDays || formData.weekDays?.includes(day);
                                    return (
                                        <button
                                            type="button"
                                            key={day}
                                            onClick={() => toggleDay(day)}
                                            disabled={formData.isAllDays}
                                            className={`
                                    flex-1 h-10 rounded-lg text-sm font-medium transition-all
                                    ${isSelected
                                                    ? 'bg-neutral-100 text-neutral-900 border border-neutral-200'
                                                    : 'bg-white text-slate-500 border border-slate-200 hover:border-slate-300'
                                                }
                                    ${formData.isAllDays ? 'opacity-50 cursor-not-allowed' : ''}
                                `}
                                        >
                                            {day}
                                        </button>
                                    )
                                })}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-6 border-t border-slate-100 flex justify-end gap-3 bg-slate-50">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-6 py-2.5 bg-white border border-slate-200 text-slate-700 font-medium rounded-xl hover:bg-slate-50 transition-colors"
                    >
                        Отмена
                    </button>
                    <button
                        type="button"
                        onClick={handleSubmit}
                        className="px-6 py-2.5 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-200"
                    >
                        Сохранить
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- Vehicle Form Component ---

export interface VehicleFormProps {
    initialData: VehicleItem | null;
    isCars: boolean;
    companyType: 'cars' | 'scoots' | 'moto';
    onSave: (data: VehicleItem) => void;
    onCancel: () => void;
}

export const VehicleForm: React.FC<VehicleFormProps> = ({ initialData, isCars, companyType, onSave, onCancel }) => {
    const isEdit = !!initialData;
    const [formData, setFormData] = useState<Partial<VehicleItem>>(() => {
        if (initialData) return { ...initialData };
        return {
            name: '',
            plate: '',
            status: 'available',
            techPassport: '',
            vin: '',
            color: '',
            mileage: '',
            condition: 'good',
            insuranceDate: '',
            inspectionDate: '',
            tariffs: [],
            image: isCars
                ? 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&q=80&w=300&h=300'
                : (companyType === 'moto'
                    ? 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&q=80&w=300&h=300'
                    : 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&q=80&w=300&h=300')
        };
    });
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);

    const handleChange = (field: keyof VehicleItem, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const fakeUrl = URL.createObjectURL(file);
            setFormData(prev => ({ ...prev, image: fakeUrl }));
            setImageFile(file);
        }
    };

    const handleTariffsUpdate = (newTariffs: Tariff[]) => {
        setFormData(prev => ({ ...prev, tariffs: newTariffs }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name || !formData.plate) return; // Basic validation

        setIsUploading(true);
        let finalImage = formData.image;

        if (imageFile) {
            const url = await uploadImage(imageFile);
            if (url) finalImage = url;
        }

        const finalData: VehicleItem = {
            ...formData as VehicleItem,
            id: formData.id || `v${Date.now()}`,
            image: finalImage,
        };

        setIsUploading(false);
        onSave(finalData);
    };

    return (
        <div className="flex flex-col h-full bg-slate-50 animate-in fade-in slide-in-from-right-4 duration-300 relative">
            <div className="bg-white border-b border-slate-200 px-8 py-4 sticky top-0 z-30">
                <div className="max-w-4xl mx-auto flex items-center justify-between w-full">
                    <div className="flex items-center gap-4">
                        <button onClick={onCancel} className="p-2 -ml-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors"><ArrowLeft className="w-5 h-5" /></button>
                        <h1 className="text-xl font-bold text-slate-900">{isEdit ? 'Редактирование транспорта' : (isCars ? 'Новый автомобиль' : (companyType === 'moto' ? 'Новый электромотоцикл' : 'Новый мопед'))}</h1>
                    </div>
                    <div className="flex items-center gap-3">
                        <button onClick={onCancel} className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition-colors">Отмена</button>
                        <button onClick={handleSubmit} disabled={isUploading} className="flex items-center gap-2 px-5 py-2 bg-neutral-900 text-white font-medium rounded-lg hover:bg-neutral-800 transition-colors shadow-sm disabled:opacity-70 disabled:cursor-not-allowed">
                            {isUploading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
                            <span>{isUploading ? 'Загрузка...' : 'Сохранить'}</span>
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8">
                <form onSubmit={handleSubmit} className="max-w-4xl mx-auto space-y-6 pb-10">

                    {/* Section 1: Basic Info */}
                    <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                        <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">Основная информация</h2>
                        <div className="flex flex-col md:flex-row gap-8">
                            <div className="flex flex-col items-center gap-3">
                                <label className="w-40 h-40 rounded-2xl bg-slate-100 border-2 border-slate-200 border-dashed overflow-hidden relative group cursor-pointer hover:border-neutral-300 transition-colors flex items-center justify-center">
                                    {formData.image ? (
                                        <img src={formData.image} alt="vehicle" className="w-full h-full object-cover" />
                                    ) : (
                                        <Camera className="w-8 h-8 text-slate-400" />
                                    )}
                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Camera className="w-8 h-8 text-white" />
                                    </div>
                                    <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                                </label>
                                <span className="text-xs text-slate-400">Нажмите для загрузки фото</span>
                            </div>
                            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-1.5"><label className="text-sm font-medium text-slate-700">Название (Марка, Модель) <span className="text-red-500">*</span></label><input type="text" required value={formData.name} onChange={(e) => handleChange('name', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 transition-all" placeholder="Toyota Camry" /></div>
                                <div className="space-y-1.5"><label className="text-sm font-medium text-slate-700">Гос. Номер / ID <span className="text-red-500">*</span></label><input type="text" required value={formData.plate} onChange={(e) => handleChange('plate', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 transition-all font-mono uppercase" placeholder="777 ABC 02" /></div>
                                <div className="space-y-1.5"><label className="text-sm font-medium text-slate-700">Цвет</label><input type="text" value={formData.color} onChange={(e) => handleChange('color', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 transition-all" placeholder="Белый" /></div>
                                <div className="space-y-1.5"><label className="text-sm font-medium text-slate-700">Пробег</label><input type="text" value={formData.mileage} onChange={(e) => handleChange('mileage', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 transition-all" placeholder="10 000 км" /></div>
                            </div>
                        </div>
                    </section>

                    {/* Section 2: Technical Data */}
                    <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                        <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">Технические данные</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-1.5"><label className="text-sm font-medium text-slate-700">VIN Code / Серийный номер</label><input type="text" value={formData.vin} onChange={(e) => handleChange('vin', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 transition-all font-mono uppercase" placeholder="ABC123456789" /></div>
                            <div className="space-y-1.5"><label className="text-sm font-medium text-slate-700">Номер техпаспорта</label><input type="text" value={formData.techPassport} onChange={(e) => handleChange('techPassport', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 transition-all font-mono uppercase" placeholder="KZ 12345678" /></div>
                        </div>
                    </section>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Section 3: Status & Condition */}
                        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 h-full">
                            <h2 className="text-lg font-bold text-slate-800 mb-6">Состояние и Статус</h2>
                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium text-slate-700">Текущий статус</label>
                                    <select value={formData.status} onChange={(e) => handleChange('status', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 transition-all bg-white">
                                        <option value="available">Доступен</option>
                                        <option value="rented">В аренде</option>
                                        <option value="maintenance">На обслуживании</option>
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium text-slate-700">Техническое состояние</label>
                                    <select value={formData.condition} onChange={(e) => handleChange('condition', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 transition-all bg-white">
                                        <option value="new">Новый</option>
                                        <option value="good">Исправен</option>
                                        <option value="broken">Сломан</option>
                                    </select>
                                </div>
                            </div>
                        </section>

                        {/* Section 4: Dates */}
                        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 h-full">
                            <h2 className="text-lg font-bold text-slate-800 mb-6">Документы и Сроки</h2>
                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium text-slate-700">Дата окончания страховки</label>
                                    <input type="date" value={formData.insuranceDate} onChange={(e) => handleChange('insuranceDate', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 transition-all" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium text-slate-700">Дата следующего тех. осмотра</label>
                                    <input type="date" value={formData.inspectionDate} onChange={(e) => handleChange('inspectionDate', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 transition-all" />
                                </div>
                            </div>
                        </section>
                    </div>

                    {/* Tariffs Section - Editable */}
                    <TariffsSection tariffs={formData.tariffs || []} onUpdate={handleTariffsUpdate} readOnly={false} />

                </form>
            </div>
        </div>
    );
};

// --- Tariffs Section Component ---

interface TariffsSectionProps {
    tariffs: Tariff[];
    onUpdate: (newTariffs: Tariff[]) => void;
    readOnly?: boolean;
}

const TariffsSection: React.FC<TariffsSectionProps> = ({ tariffs, onUpdate, readOnly = false }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTariff, setEditingTariff] = useState<Tariff | null>(null);

    const handleEditClick = (t: Tariff) => {
        if (readOnly) return;
        setEditingTariff(t);
        setIsModalOpen(true);
    };

    const handleDelete = (id: string) => {
        if (readOnly) return;
        if (confirm('Удалить тариф?')) {
            onUpdate(tariffs.filter(t => t.id !== id));
        }
    };

    const handleSaveTariff = (tariff: Tariff) => {
        if (editingTariff) {
            onUpdate(tariffs.map(t => t.id === tariff.id ? tariff : t));
        } else {
            onUpdate([...tariffs, tariff]);
        }
    };

    const handleAddNew = () => {
        setEditingTariff(null);
        setIsModalOpen(true);
    };

    return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">Тарифы</h3>
                {!readOnly && (
                    <button
                        type="button"
                        onClick={handleAddNew}
                        className="flex items-center gap-2 text-sm font-medium text-neutral-900 bg-white border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
                    >
                        <Plus className="w-4 h-4" /> Добавить тариф
                    </button>
                )}
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 border-b border-slate-100 text-xs uppercase text-slate-500 font-semibold">
                        <tr>
                            <th className="px-6 py-3">Название</th>
                            <th className="px-6 py-3">Период</th>
                            <th className="px-6 py-3">Дни</th>
                            <th className="px-6 py-3">Цена</th>
                            {!readOnly && <th className="px-6 py-3 text-right">Действия</th>}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {tariffs.map(t => {
                            return (
                                <tr key={t.id} className="group hover:bg-slate-50/50 transition-colors">
                                    <td className="px-6 py-3 font-medium text-slate-800">{t.name}</td>
                                    <td className="px-6 py-3 text-slate-600">{t.period}</td>
                                    <td className="px-6 py-3 text-slate-600">{t.days}</td>
                                    <td className="px-6 py-3 font-semibold text-slate-900">{t.price}</td>
                                    {!readOnly && (
                                        <td className="px-6 py-3 text-right">
                                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button type="button" onClick={() => handleEditClick(t)} className="p-1.5 text-slate-400 hover:text-indigo-600 rounded"><Pencil className="w-4 h-4" /></button>
                                                <button type="button" onClick={() => handleDelete(t.id)} className="p-1.5 text-slate-400 hover:text-red-600 rounded"><Trash2 className="w-4 h-4" /></button>
                                            </div>
                                        </td>
                                    )}
                                </tr>
                            );
                        })}
                        {(!tariffs || tariffs.length === 0) && (
                            <tr><td colSpan={readOnly ? 4 : 5} className="px-6 py-8 text-center text-slate-400 text-sm">Нет добавленных тарифов</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal for Adding/Editing */}
            <TariffModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSaveTariff}
                initialData={editingTariff}
            />
        </div>
    );
};


// --- Vehicle Details Component ---

interface VehicleDetailsProps {
    vehicle: VehicleItem;
    isCars: boolean;
    onBack: () => void;
    onEdit: () => void;
    onDelete: () => void;
    onUpdate: (v: VehicleItem) => void;
    rentals: RentalItem[];
}

const VehicleDetails: React.FC<VehicleDetailsProps> = ({ vehicle, isCars, onBack, onEdit, onDelete, onUpdate, rentals }) => {
    // ... same content as before ...
    // State for filtering history
    const [historySearch, setHistorySearch] = useState('');
    const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
    const [dateRange, setDateRange] = useState<{ start: Date | null, end: Date | null }>({ start: null, end: null });
    const [paymentFilter, setPaymentFilter] = useState<'all' | 'paid' | 'partially' | 'pending'>('all');
    const [isPaymentFilterOpen, setIsPaymentFilterOpen] = useState(false);

    const datePickerRef = useRef<HTMLDivElement>(null);
    const paymentFilterRef = useRef<HTMLDivElement>(null);

    // Filter rental history for this specific vehicle
    const sourceRentals = rentals;
    const history = sourceRentals.filter(r =>
        r.vehicle.plate === vehicle.plate ||
        r.vehicle.name === vehicle.name
    );

    const filteredHistory = history.filter(item => {
        if (historySearch) {
            const lowerQ = historySearch.toLowerCase();
            if (!item.client.name.toLowerCase().includes(lowerQ) && !item.id.includes(lowerQ)) return false;
        }
        if (paymentFilter !== 'all' && item.payment !== paymentFilter) return false;
        if (dateRange.start && dateRange.end) return true; // Date filtering logic would go here
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

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        // Toast would go here
    };

    const handleTariffsUpdate = (newTariffs: Tariff[]) => {
        onUpdate({ ...vehicle, tariffs: newTariffs });
    };

    return (
        <div className="flex flex-col h-full bg-slate-50 animate-in fade-in slide-in-from-right-4 duration-300 relative">
            {/* Sticky Header */}
            <div className="bg-white border-b border-slate-200 px-8 py-6 sticky top-0 z-30">
                <div className="max-w-5xl mx-auto flex items-center justify-between w-full">
                    <div className="flex items-center gap-4">
                        <button onClick={onBack} className="px-4 py-2 bg-white border border-slate-200 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors">Назад</button>
                    </div>
                    <div className="flex items-center gap-3">
                        <button onClick={onEdit} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors">
                            <Pencil className="w-4 h-4" /><span>Изменить</span>
                        </button>
                        <button onClick={() => onDelete(vehicle.id)} className="flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-100 text-red-600 font-medium rounded-lg hover:bg-red-100 transition-colors">
                            <Trash2 className="w-4 h-4" /><span>Удалить</span>
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8">
                <div className="max-w-5xl mx-auto space-y-6">

                    {/* Main Profile Card - Matching Clients.tsx Style */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-stretch overflow-hidden">
                        <div className="p-6 flex items-center gap-6 flex-1 min-w-[300px]">
                            <div className="w-24 h-24 rounded-2xl bg-slate-100 border border-slate-200 overflow-hidden relative flex-shrink-0">
                                <img src={vehicle.image} alt={vehicle.name} className="w-full h-full object-cover" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-slate-900 mb-2 whitespace-nowrap">{vehicle.name}</h1>
                                <div className="flex flex-col items-start gap-2">
                                    <div className="flex items-center gap-2">
                                        <span className="px-2.5 py-1 bg-slate-100 border border-slate-200 rounded-md text-sm font-mono font-bold text-slate-800 tracking-wide">
                                            {vehicle.plate}
                                        </span>
                                        <button onClick={() => copyToClipboard(vehicle.plate)} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-colors" title="Скопировать">
                                            <Copy className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                    {/* VIN Code removed from here as requested */}
                                </div>
                            </div>
                        </div>

                        <div className="hidden md:block w-px bg-slate-100 self-stretch my-2"></div><div className="block md:hidden h-px bg-slate-100 w-full"></div>
                        <div className="px-8 py-4 flex flex-col justify-center items-center gap-2 min-w-[160px] bg-white">
                            <span className="text-xs text-slate-400 font-medium uppercase tracking-wide">Статус</span>
                            <div>{getStatusBadge(vehicle.status)}</div>
                        </div>

                        <div className="hidden md:block w-px bg-slate-100 self-stretch my-2"></div><div className="block md:hidden h-px bg-slate-100 w-full"></div>
                        <div className="px-8 py-4 flex flex-col justify-center items-center gap-2 min-w-[160px] bg-white">
                            <span className="text-xs text-slate-400 font-medium uppercase tracking-wide">Состояние</span>
                            <div>{getConditionBadge(vehicle.condition)}</div>
                        </div>

                        <div className="hidden md:block w-px bg-slate-100 self-stretch my-2"></div><div className="block md:hidden h-px bg-slate-100 w-full"></div>
                        <div className="px-8 py-4 flex flex-col justify-center items-center gap-2 min-w-[140px] bg-white pr-10">
                            <span className="text-xs text-slate-400 font-medium uppercase tracking-wide">Цвет</span>
                            <span className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
                                {/* Color icon removed as requested */}
                                {vehicle.color}
                            </span>
                        </div>
                    </div>

                    {/* Stats Block - Row (Text Below Numbers, No Icons) */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-slate-100">
                        <div className="px-4 py-3 md:py-0 first:pl-0 flex flex-col justify-center">
                            <span className="text-xl font-bold text-slate-900 whitespace-nowrap">{vehicle.mileage}</span>
                            <span className="text-xs font-medium text-slate-400 mt-1 uppercase tracking-wide">Пробег</span>
                        </div>
                        <div className="px-4 py-3 md:py-0 flex flex-col justify-center">
                            <span className="text-xl font-bold text-slate-900 whitespace-nowrap">{history.length}</span>
                            <span className="text-xs font-medium text-slate-400 mt-1 uppercase tracking-wide">Кол-во аренд</span>
                        </div>
                        <div className="px-4 py-3 md:py-0 flex flex-col justify-center">
                            <span className="text-xl font-bold text-emerald-600 whitespace-nowrap">0 ₸</span>
                            <span className="text-xs font-medium text-slate-400 mt-1 uppercase tracking-wide">Выручка (Общая)</span>
                        </div>
                        <div className="px-4 py-3 md:py-0 flex flex-col justify-center">
                            <span className="text-xl font-bold text-orange-600 whitespace-nowrap">0 ₸</span>
                            <span className="text-xs font-medium text-slate-400 mt-1 uppercase tracking-wide">Расходы (ТО)</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
                        {/* Tech Info */}
                        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col h-full">
                            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                                {/* Icon removed */}
                                Технические данные
                            </h3>
                            <div className="space-y-4 flex-1">
                                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-400">
                                        <Hash className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <span className="text-xs text-slate-500 font-medium block mb-0.5">VIN Code</span>
                                        <span className="text-sm font-mono font-semibold text-slate-900">{vehicle.vin}</span>
                                    </div>
                                </div>
                                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-400">
                                        <FileText className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <span className="text-xs text-slate-500 font-medium block mb-0.5">Номер техпаспорта</span>
                                        <span className="text-sm font-mono font-semibold text-slate-900">{vehicle.techPassport}</span>
                                    </div>
                                </div>
                                {/* Fuel section removed */}
                            </div>
                        </div>

                        {/* Docs & Deadlines */}
                        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col h-full">
                            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                                {/* Icon removed */}
                                Документы и Сроки
                            </h3>
                            <div className="space-y-4 flex-1">
                                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-500">
                                            <Calendar className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <span className="text-xs text-slate-500 font-medium block mb-0.5">Страховой полис</span>
                                            <span className="text-sm font-semibold text-slate-900">{vehicle.insuranceDate}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-500">
                                            <Calendar className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <span className="text-xs text-slate-500 font-medium block mb-0.5">Технический осмотр</span>
                                            <span className="text-sm font-semibold text-slate-900">{vehicle.inspectionDate}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            {/* Note section removed */}
                        </div>
                    </div>

                    {/* Tariffs Block - Read Only Here */}
                    <TariffsSection tariffs={vehicle.tariffs} onUpdate={handleTariffsUpdate} readOnly={true} />

                    {/* Rental History Table with Filters */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col">
                        <div className="px-6 py-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-3 flex-1">
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Search className="h-4 w-4 text-slate-400 group-focus-within:text-neutral-500 transition-colors" /></div>
                                    <input type="text" value={historySearch} onChange={(e) => setHistorySearch(e.target.value)} className="block w-64 pl-10 pr-3 py-2 border border-slate-200 rounded-lg leading-5 bg-white placeholder-slate-400 focus:outline-none focus:placeholder-slate-300 focus:border-neutral-500 focus:ring-1 focus:ring-neutral-500 sm:text-sm transition-all" placeholder="Поиск клиента..." />
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
                            {filteredHistory.length > 0 ? (
                                viewMode === 'table' ? (
                                    <RentalsTable data={filteredHistory} isCars={isCars} className="border-0 shadow-none rounded-none w-full" />
                                ) : (
                                    <div className="p-6">
                                        <RentalsGrid data={filteredHistory} className="grid grid-cols-1 md:grid-cols-2 gap-6" />
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
        </div>
    );
};


// --- Main Warehouse Component ---

export const Warehouse: React.FC<PageProps> = ({ currentCompany, initialSelectedVehicleId, onBack }) => {
    const [activeTab, setActiveTab] = useState<TabId>('vehicles');
    const [pageView, setPageView] = useState<'list' | 'details' | 'form'>('list');

    const [vehicles, setVehicles] = useState<VehicleItem[]>([]);
    const [rentals, setRentals] = useState<RentalItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [vData, rData] = await Promise.all([
                db.vehicles.list(currentCompany.id),
                db.rentals.list(currentCompany.id)
            ]);
            setVehicles(vData);
            setRentals(rData);

            if (initialSelectedVehicleId) {
                const target = vData.find(v => v.id === initialSelectedVehicleId);
                if (target) {
                    setSelectedVehicle(target);
                    setPageView('details');
                }
            }
        } catch (err) {
            console.error('Failed to fetch warehouse data:', err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [currentCompany, initialSelectedVehicleId]); // Added initialSelectedVehicleId to dependencies

    const [selectedVehicle, setSelectedVehicle] = useState<VehicleItem | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [editingVehicle, setEditingVehicle] = useState<VehicleItem | null>(null);

    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | VehicleItem['status']>('all');
    const [conditionFilter, setConditionFilter] = useState<'all' | VehicleItem['condition']>('all');

    // Dropdown Visibility States
    const [isStatusFilterOpen, setIsStatusFilterOpen] = useState(false);
    const [isConditionFilterOpen, setIsConditionFilterOpen] = useState(false);

    const statusFilterRef = useRef<HTMLDivElement>(null);
    const conditionFilterRef = useRef<HTMLDivElement>(null);

    const vehicleLabel = currentCompany.type === 'cars' ? 'Автомобили' : 'Мопеды';

    // Removed useEffect for initialSelectedVehicleId as it's now handled in fetchData

    const handleCreateNew = () => {
        setEditingVehicle(null);
        setPageView('form');
    };

    const handleEdit = (vehicle: VehicleItem) => {
        setEditingVehicle(vehicle);
        setPageView('form');
    };

    const handleSave = async (vehicleData: VehicleItem) => {
        try {
            await db.vehicles.save(vehicleData, currentCompany.id);
            await fetchData();
            if (editingVehicle && selectedVehicle?.id === vehicleData.id) {
                setSelectedVehicle(vehicleData);
                setPageView('details');
            } else {
                setPageView('list');
            }
        } catch (err) {
            alert('Ошибка при сохранении: ' + (err as any).message);
        }
    };

    const handleUpdateVehicle = async (updatedVehicle: VehicleItem) => {
        try {
            await db.vehicles.save(updatedVehicle, currentCompany.id);
            await fetchData(); // Re-fetch data to ensure consistency
            setSelectedVehicle(updatedVehicle);
        } catch (err) {
            alert('Ошибка при обновлении: ' + (err as any).message);
        }
    };
    const handleDelete = async (id: string) => {
        if (!id) return;
        if (window.confirm('Вы уверены, что хотите удалить этот транспорт?')) {
            try {
                await db.vehicles.delete(id);
                await fetchData();
                if (selectedVehicle?.id === id) {
                    setSelectedVehicle(null);
                    setPageView('list');
                }
                setSelectedIds(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(id);
                    return newSet;
                });
            } catch (err) {
                alert('Ошибка при удалении: ' + (err as any).message);
            }
        }
    };

    const handleBulkDelete = async () => {
        if (selectedIds.size === 0) return;
        if (window.confirm(`Вы уверены, что хотите удалить выбранный транспорт (${selectedIds.size})?`)) {
            try {
                await db.vehicles.deleteBulk(Array.from(selectedIds));
                await fetchData();
                setSelectedIds(new Set());
            } catch (err) {
                alert('Ошибка при массовом удалении: ' + (err as any).message);
            }
        }
    };

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedIds(new Set(filteredData.map(v => v.id)));
        } else {
            setSelectedIds(new Set());
        }
    };

    const handleSelectOne = (id: string) => {
        setSelectedIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) newSet.delete(id);
            else newSet.add(id);
            return newSet;
        });
    };

    const handleBackToTable = () => {
        if (initialSelectedVehicleId && onBack) {
            onBack();
        } else {
            setSelectedVehicle(null);
            setPageView('list');
        }
    };

    const enrichedVehicles = vehicles.map(vehicle => {
        const vehicleRentals = rentals.filter(r => r.vehicle.plate === vehicle.plate);
        vehicleRentals.sort((a, b) => {
            const dateA = a.period.start ? parseDateTime(a.period.start).getTime() : 0;
            const dateB = b.period.start ? parseDateTime(b.period.start).getTime() : 0;
            return dateB - dateA;
        });
        const last = vehicleRentals[0];

        return {
            ...vehicle,
            lastRental: last ? {
                id: last.id,
                status: last.status,
                date: last.period.start
            } : undefined
        };
    });

    const filteredData = enrichedVehicles.filter(item => {
        const q = searchQuery.toLowerCase();
        const matchesSearch = item.name.toLowerCase().includes(q) || item.plate.toLowerCase().includes(q) || item.vin.toLowerCase().includes(q);
        const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
        const matchesCondition = conditionFilter === 'all' || item.condition === conditionFilter;
        return matchesSearch && matchesStatus && matchesCondition;
    });

    const tabs: { id: TabId; label: string }[] = [
        { id: 'vehicles', label: vehicleLabel },
        { id: 'maintenance', label: 'Тех обслуживание' },
    ];

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (statusFilterRef.current && !statusFilterRef.current.contains(event.target as Node)) {
                setIsStatusFilterOpen(false);
            }
            if (conditionFilterRef.current && !conditionFilterRef.current.contains(event.target as Node)) {
                setIsConditionFilterOpen(false);
            }
        };
        if (isStatusFilterOpen || isConditionFilterOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isStatusFilterOpen, isConditionFilterOpen]);

    const getStatusLabel = () => {
        switch (statusFilter) {
            case 'available': return 'Доступен';
            case 'rented': return 'В аренде';
            case 'maintenance': return 'На сервисе';
            default: return 'Статус';
        }
    };

    const getConditionLabel = () => {
        switch (conditionFilter) {
            case 'new': return 'Новый';
            case 'good': return 'Исправен';
            case 'broken': return 'Сломан';
            default: return 'Состояние';
        }
    };

    if (pageView === 'form') {
        return (
            <VehicleForm
                initialData={editingVehicle}
                isCars={currentCompany.type === 'cars'}
                companyType={currentCompany.type}
                onSave={handleSave}
                onCancel={() => {
                    if (editingVehicle && selectedVehicle) {
                        setPageView('details');
                    } else {
                        setPageView('list');
                    }
                    setEditingVehicle(null);
                }}
            />
        );
    }

    if (pageView === 'details' && selectedVehicle) {
        return (
            <VehicleDetails
                vehicle={selectedVehicle}
                isCars={currentCompany.type === 'cars'}
                rentals={rentals}
                onBack={handleBackToTable}
                onEdit={() => handleEdit(selectedVehicle)}
                onDelete={() => handleDelete(selectedVehicle.id)}
                onUpdate={handleUpdateVehicle}
            />
        );
    }

    return (
        <div className="flex flex-col h-full">
            <div className="flex-shrink-0 bg-white border-b border-slate-200 px-8 shadow-sm z-20">
                <div className="flex items-center gap-6 overflow-x-auto hide-scrollbar">
                    {tabs.map((tab) => (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`py-4 text-[14px] font-medium border-b-2 transition-all duration-200 whitespace-nowrap outline-none ${activeTab === tab.id ? 'border-neutral-900 text-neutral-900' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}>
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {activeTab === 'vehicles' && (
                <div className="flex-shrink-0 bg-slate-50 px-8 py-6 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Search className="h-4 w-4 text-slate-400 group-focus-within:text-neutral-500 transition-colors" /></div>
                            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="block w-64 pl-10 pr-3 py-2 border border-slate-200 rounded-lg leading-5 bg-white placeholder-slate-400 focus:outline-none focus:placeholder-slate-300 focus:border-neutral-500 focus:ring-1 focus:ring-neutral-500 sm:text-sm transition-all" placeholder="Поиск транспорта..." />
                        </div>

                        <div className="relative" ref={statusFilterRef}>
                            <button onClick={() => setIsStatusFilterOpen(!isStatusFilterOpen)} className={`flex items-center gap-2 px-3 py-2 border rounded-lg text-sm font-medium transition-colors ${isStatusFilterOpen || statusFilter !== 'all' ? 'bg-slate-50 border-slate-300 text-slate-800' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-800'}`}>
                                <Filter className="w-4 h-4" />
                                <span>{getStatusLabel()}</span>
                            </button>
                            {isStatusFilterOpen && (
                                <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-slate-200 z-50 animate-in fade-in zoom-in-95 duration-100 overflow-hidden">
                                    <div className="p-1">
                                        {[{ id: 'available', label: 'Доступен', icon: CheckCircle2, color: 'text-emerald-600' }, { id: 'rented', label: 'В аренде', icon: Circle, color: 'text-blue-600' }, { id: 'maintenance', label: 'На обслуживании', icon: Wrench, color: 'text-orange-600' }].map((opt) => (
                                            <button key={opt.id} onClick={() => { if (statusFilter === opt.id) { setStatusFilter('all'); } else { setStatusFilter(opt.id as any); } setIsStatusFilterOpen(false); }} className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors ${statusFilter === opt.id ? 'bg-neutral-50 text-neutral-900 font-medium' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}>
                                                {opt.icon ? <opt.icon className={`w-4 h-4 ${opt.color}`} /> : <span className="w-4 h-4" />}
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="relative" ref={conditionFilterRef}>
                            <button onClick={() => setIsConditionFilterOpen(!isConditionFilterOpen)} className={`flex items-center gap-2 px-3 py-2 border rounded-lg text-sm font-medium transition-colors ${isConditionFilterOpen || conditionFilter !== 'all' ? 'bg-slate-50 border-slate-300 text-slate-800' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-800'}`}>
                                <Activity className="w-4 h-4" />
                                <span>{getConditionLabel()}</span>
                            </button>
                            {isConditionFilterOpen && (
                                <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-slate-200 z-50 animate-in fade-in zoom-in-95 duration-100 overflow-hidden">
                                    <div className="p-1">
                                        {[{ id: 'new', label: 'Новый', icon: Check, color: 'text-indigo-600' }, { id: 'good', label: 'Исправен', icon: Check, color: 'text-slate-600' }, { id: 'broken', label: 'Сломан', icon: AlertTriangle, color: 'text-red-600' }].map((opt) => (
                                            <button key={opt.id} onClick={() => { if (conditionFilter === opt.id) { setConditionFilter('all'); } else { setConditionFilter(opt.id as any); } setIsConditionFilterOpen(false); }} className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors ${conditionFilter === opt.id ? 'bg-neutral-50 text-neutral-900 font-medium' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}>
                                                {opt.icon ? <opt.icon className={`w-4 h-4 ${opt.color}`} /> : <span className="w-4 h-4" />}
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {selectedIds.size > 0 && (
                            <button onClick={handleBulkDelete} className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm">
                                <Trash2 className="w-4 h-4" />
                                <span>Удалить выбранные ({selectedIds.size})</span>
                            </button>
                        )}
                        <button onClick={handleCreateNew} className="bg-neutral-900 hover:bg-neutral-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm shadow-neutral-200 flex items-center gap-2">
                            <span>{currentCompany.type === 'cars' ? 'Добавить автомобиль' : 'Добавить мопед'}</span>
                        </button>
                    </div>
                </div>
            )}

            <div className="flex-1 overflow-y-auto px-8 pb-6 w-full animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="w-full">
                    {activeTab === 'vehicles' && (
                        <WarehouseTable
                            data={filteredData}
                            isCars={currentCompany.type === 'cars'}
                            onRowClick={(vehicle) => { setSelectedVehicle(vehicle); setPageView('details'); }}
                            selectedIds={selectedIds}
                            onSelectAll={handleSelectAll}
                            onSelectOne={handleSelectOne}
                            onEdit={handleEdit}
                            onDelete={handleDelete}
                        />
                    )}

                    {activeTab === 'maintenance' && (
                        <UnderConstructionState />
                    )}
                </div>
            </div>
        </div>
    );
};

// --- Table Component ---

const WarehouseTable: React.FC<{
    data: VehicleItem[],
    isCars: boolean,
    onRowClick: (item: VehicleItem) => void,
    selectedIds?: Set<string>,
    onSelectAll?: (checked: boolean) => void,
    onSelectOne?: (id: string) => void,
    onEdit?: (item: VehicleItem) => void,
    onDelete?: (id: string) => void
}> = ({ data, isCars, onRowClick, selectedIds, onSelectAll, onSelectOne, onEdit, onDelete }) => {
    const [columns, setColumns] = useState<ColumnConfig[]>([
        { id: 'checkbox', label: '', visible: true, width: 'w-12' },
        { id: 'image', label: 'Фото', visible: true, width: 'w-16' },
        { id: 'name', label: isCars ? 'Автомобиль' : 'Мопед', visible: true, width: 'min-w-[150px]' },
        { id: 'plate', label: 'Гос номер', visible: true, width: 'min-w-[140px]' },
        { id: 'status', label: 'Статус', visible: true, width: 'min-w-[130px]' },
        { id: 'techPassport', label: '№ Тех паспорта', visible: true, width: 'min-w-[120px]' },
        { id: 'vin', label: 'VIN-Code', visible: true, width: 'min-w-[150px]' },
        { id: 'color', label: 'Цвет', visible: true, width: 'min-w-[100px]' },
        { id: 'mileage', label: 'Пробег', visible: true, width: 'min-w-[100px]' },
        { id: 'condition', label: 'Состояние', visible: true, width: 'min-w-[120px]' },
        { id: 'insuranceDate', label: 'Страховка', visible: true, width: 'min-w-[110px]' },
        { id: 'inspectionDate', label: 'Тех осмотр', visible: true, width: 'min-w-[110px]' },
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

    // Badge Base Style from Rentals.tsx for consistency
    const TEXT_BADGE_STYLE = "inline-flex items-center justify-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200 font-mono whitespace-nowrap";

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
                                    return <th key={col.id as string} className={`px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap align-middle ${col.width || ''} ${stickyClass}`}>{col.label}</th>;
                                })}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {data.map((item) => (
                                <tr key={item.id} onClick={() => onRowClick(item)} className="hover:bg-slate-50/80 transition-colors group cursor-pointer">
                                    {columns.map((col) => {
                                        if (!col.visible) return null;
                                        if (col.id === 'checkbox') return (
                                            <td key={`${item.id}-checkbox`} className="px-4 py-3 align-middle" onClick={(e) => e.stopPropagation()}>
                                                <input
                                                    type="checkbox"
                                                    className="rounded border-slate-300 text-neutral-600 focus:ring-neutral-500 cursor-pointer w-4 h-4"
                                                    checked={selectedIds?.has(item.id) || false}
                                                    onChange={() => onSelectOne?.(item.id)}
                                                    disabled={!onSelectOne}
                                                />
                                            </td>
                                        );
                                        if (col.id === 'actions') return (
                                            <td key={`${item.id}-actions`} className="px-4 py-3 align-middle text-center" onClick={(e) => e.stopPropagation()}>
                                                <div className="flex items-center justify-center gap-2">
                                                    {onEdit && <button onClick={() => onEdit(item)} className="p-1.5 text-slate-400 hover:text-neutral-900 hover:bg-slate-100 rounded-md transition-all"><Pencil className="w-4 h-4" /></button>}
                                                    {onDelete && <button onClick={() => onDelete(item.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-all"><Trash2 className="w-4 h-4" /></button>}
                                                </div>
                                            </td>
                                        );

                                        if (col.id === 'image') return (
                                            <td key={`${item.id}-img`} className="px-4 py-3 align-middle">
                                                {item.image ? (
                                                    <img
                                                        src={item.image}
                                                        alt={item.name}
                                                        className="w-10 h-10 rounded-lg object-cover border border-slate-200 bg-slate-50"
                                                        onError={(e) => {
                                                            e.currentTarget.style.display = 'none';
                                                            e.currentTarget.nextElementSibling?.classList.remove('hidden');
                                                        }}
                                                    />
                                                ) : null}
                                                <div className={`w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center ${item.image ? 'hidden' : ''}`}>
                                                    <Camera className="w-4 h-4 text-slate-300" />
                                                </div>
                                            </td>
                                        );
                                        if (col.id === 'name') return <td key={`${item.id}-name`} className="px-4 py-3 align-middle"><span className="text-[13px] font-semibold text-slate-800">{item.name}</span></td>;
                                        if (col.id === 'plate') return <td key={`${item.id}-plate`} className="px-4 py-3 align-middle"><span className={TEXT_BADGE_STYLE}>{item.plate}</span></td>;
                                        if (col.id === 'status') return <td key={`${item.id}-status`} className="px-4 py-3 align-middle">{getStatusBadge(item.status)}</td>;
                                        if (col.id === 'condition') return <td key={`${item.id}-condition`} className="px-4 py-3 align-middle">{getConditionBadge(item.condition)}</td>;

                                        if (col.id === 'techPassport' || col.id === 'vin' || col.id === 'mileage') {
                                            return <td key={`${item.id}-${col.id}`} className="px-4 py-3 align-middle"><span className="text-[13px] font-mono text-slate-600">{item[col.id] as string}</span></td>;
                                        }

                                        // Default text render
                                        return <td key={`${item.id}-${col.id}`} className="px-4 py-3 align-middle text-[13px] text-slate-600 whitespace-nowrap">{String(item[col.id as keyof VehicleItem] || '-')}</td>;
                                    })}
                                </tr>
                            ))}
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

// --- Empty State for In Development ---
const UnderConstructionState: React.FC = () => (
    <div className="mt-6 bg-white rounded-2xl border border-slate-200 border-dashed shadow-sm min-h-[400px] flex flex-col items-center justify-center p-8 text-center">
        <div className="w-16 h-16 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center mb-4">
            <Cone className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-semibold text-slate-900">В разработке</h3>
        <p className="text-slate-500 mt-2 max-w-sm">Этот раздел находится в процессе создания. Функционал скоро появится.</p>
    </div>
);