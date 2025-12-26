
import React, { useState, useRef, useEffect } from 'react';
import { PageProps } from '../../types';
import { Search, Filter, Download, CreditCard, Banknote, Calendar, Hash, ArrowUpRight, ArrowDownLeft, Wallet, Check, ChevronDown, X, Calendar as CalendarIcon } from 'lucide-react';
import { DateRangePicker, parseDateTime } from './Rentals';

// Mock Data Types
interface FinanceItem {
  id: string;
  date: string;
  rentalId: string;
  client: {
    name: string;
    phone: string;
    avatarUrl: string;
  };
  paymentType: 'cash' | 'bank';
  amount: string;
  type: 'income' | 'expense';
  responsible: {
    name: string;
    email: string;
    avatarUrl: string;
  };
}

// Mock Data for Cars
const carFinanceData: FinanceItem[] = [
  {
    id: 'pay-002',
    date: '01.06.2024, 10:05',
    rentalId: '1025',
    client: {
      name: 'Мария Смирнова',
      phone: '+7 (777) 987-65-43',
      avatarUrl: 'https://ui-avatars.com/api/?name=Maria+Smirnova&background=fce7f3&color=db2777'
    },
    paymentType: 'bank',
    amount: '+ 20 000 ₸',
    type: 'income',
    responsible: {
      name: 'Admin',
      email: 'info@dreamrent.kz',
      avatarUrl: 'https://ui-avatars.com/api/?name=Admin&background=0a0a0a&color=fff&bold=true'
    }
  },
  {
    id: 'pay-001',
    date: '30.05.2024, 14:35',
    rentalId: '1026',
    client: {
      name: 'Ержан Болатов',
      phone: '+7 (701) 555-44-33',
      avatarUrl: 'https://ui-avatars.com/api/?name=Erzhan+Bolatov&background=dbeafe&color=2563eb'
    },
    paymentType: 'cash',
    amount: '+ 45 000 ₸',
    type: 'income',
    responsible: {
      name: 'Admin',
      email: 'info@dreamrent.kz',
      avatarUrl: 'https://ui-avatars.com/api/?name=Admin&background=0a0a0a&color=fff&bold=true'
    }
  }
];

// Mock Data for Scoots
const scootFinanceData: FinanceItem[] = [
  {
    id: 'pay-s01',
    date: '25.10.2024, 16:35',
    rentalId: '5502',
    client: {
      name: 'Иван Сергеев',
      phone: '+7 (705) 111-22-33',
      avatarUrl: 'https://ui-avatars.com/api/?name=Ivan+Sergeev&background=f0fdf4&color=16a34a'
    },
    paymentType: 'bank',
    amount: '+ 1 200 ₸',
    type: 'income',
    responsible: {
      name: 'Admin',
      email: 'info@dreamrent.kz',
      avatarUrl: 'https://ui-avatars.com/api/?name=Admin&background=0a0a0a&color=fff&bold=true'
    }
  }
];

export const Finance: React.FC<PageProps> = ({ currentCompany }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [dateRange, setDateRange] = useState<{ start: Date | null, end: Date | null }>({ start: null, end: null });
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'cash' | 'bank'>('all');
  const [isPaymentFilterOpen, setIsPaymentFilterOpen] = useState(false);

  const datePickerRef = useRef<HTMLDivElement>(null);
  const paymentFilterRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) setIsDatePickerOpen(false);
      if (paymentFilterRef.current && !paymentFilterRef.current.contains(event.target as Node)) setIsPaymentFilterOpen(false);
    };
    if (isDatePickerOpen || isPaymentFilterOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isDatePickerOpen, isPaymentFilterOpen]);

  // Select data based on company type
  const financeData = currentCompany.type === 'cars' ? carFinanceData : scootFinanceData;

  // Filter logic
  const filteredData = financeData.filter(item => {
    const matchesSearch = item.client.name.toLowerCase().includes(searchQuery.toLowerCase()) || item.rentalId.includes(searchQuery);
    const matchesPayment = paymentFilter === 'all' || item.paymentType === paymentFilter;
    
    if (dateRange.start && dateRange.end) {
        const itemDate = parseDateTime(item.date);
        const start = new Date(dateRange.start);
        start.setHours(0, 0, 0, 0);
        const end = new Date(dateRange.end);
        end.setHours(23, 59, 59, 999);
        
        if (itemDate < start || itemDate > end) return false;
    }
    
    return matchesSearch && matchesPayment;
  });

  const getDateLabel = () => dateRange.start && dateRange.end ? `${dateRange.start.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })} - ${dateRange.end.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}` : 'Все даты';
  
  const getPaymentLabel = () => {
      switch(paymentFilter) {
          case 'cash': return 'Наличные';
          case 'bank': return 'Банк';
          default: return 'Тип оплаты';
      }
  };

  const hasDateRange = !!(dateRange.start && dateRange.end);

  return (
    <div className="flex flex-col h-full bg-slate-50 animate-in fade-in slide-in-from-right-4 duration-300">
        {/* Toolbar Section (Replacing previous Header) */}
        <div className="flex-shrink-0 bg-slate-50 px-8 py-6 flex items-center justify-between z-20">
            <div className="flex items-center gap-3">
               {/* Search */}
               <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Search className="h-4 w-4 text-slate-400 group-focus-within:text-neutral-500 transition-colors" /></div>
                  <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="block w-64 pl-10 pr-3 py-2 border border-slate-200 rounded-lg leading-5 bg-white placeholder-slate-400 focus:outline-none focus:placeholder-slate-300 focus:border-neutral-500 focus:ring-1 focus:ring-neutral-500 sm:text-sm transition-all" placeholder="Поиск платежа..." />
               </div>

               {/* Date Picker */}
               <div className="relative" ref={datePickerRef}>
                 <button onClick={() => setIsDatePickerOpen(!isDatePickerOpen)} className={`group flex items-center gap-2 px-3 py-2 border rounded-lg text-sm font-medium transition-colors ${isDatePickerOpen || hasDateRange ? 'bg-slate-50 border-slate-300 text-slate-800' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-800'}`}>
                    <div className="relative w-4 h-4 flex items-center justify-center">
                        <CalendarIcon className={`w-4 h-4 transition-opacity duration-200 ${hasDateRange ? 'group-hover:opacity-0' : ''}`} />
                        {hasDateRange && (
                            <div 
                                role="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setDateRange({ start: null, end: null });
                                    setIsDatePickerOpen(false);
                                }}
                                className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                            >
                                <X className="w-4 h-4 text-slate-500 hover:text-red-600" />
                            </div>
                        )}
                    </div>
                    <span>{getDateLabel()}</span>
                 </button>
                 {isDatePickerOpen && <DateRangePicker initialStart={dateRange.start} initialEnd={dateRange.end} onClose={() => setIsDatePickerOpen(false)} onApply={(start, end) => { setDateRange({ start, end }); setIsDatePickerOpen(false); }} />}
               </div>

               {/* Payment Filter */}
               <div className="relative" ref={paymentFilterRef}>
                  <button onClick={() => setIsPaymentFilterOpen(!isPaymentFilterOpen)} className={`flex items-center gap-2 px-3 py-2 border rounded-lg text-sm font-medium transition-colors ${isPaymentFilterOpen || paymentFilter !== 'all' ? 'bg-slate-50 border-slate-300 text-slate-800' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-800'}`}>
                    <Filter className="w-4 h-4" /><span>{getPaymentLabel()}</span>
                  </button>
                  {isPaymentFilterOpen && (
                    <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-slate-200 z-50 animate-in fade-in zoom-in-95 duration-100 overflow-hidden">
                        <div className="p-1">
                            {[{ id: 'cash', label: 'Наличные', icon: Banknote, color: 'text-emerald-600' }, { id: 'bank', label: 'Банк', icon: CreditCard, color: 'text-blue-600' }].map((opt) => (
                                <button key={opt.id} onClick={() => { if (paymentFilter === opt.id) { setPaymentFilter('all'); } else { setPaymentFilter(opt.id as any); } setIsPaymentFilterOpen(false); }} className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors ${paymentFilter === opt.id ? 'bg-neutral-50 text-neutral-900 font-medium' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}>
                                    <opt.icon className={`w-4 h-4 ${opt.color}`} />
                                    {opt.label}
                                    {paymentFilter === opt.id && <Check className="w-3 h-3 ml-auto text-neutral-900" />}
                                </button>
                            ))}
                        </div>
                    </div>
                  )}
               </div>
            </div>

            <div className="flex items-center gap-3">
               <button className="flex items-center gap-2 px-3 py-2 bg-neutral-900 text-white text-sm font-medium rounded-lg hover:bg-neutral-800 transition-colors shadow-sm">
                  <Download className="w-4 h-4" />
                  <span>Экспорт</span>
               </button>
            </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-8 pb-6">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col">
                <div className="overflow-x-auto w-full rounded-xl">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200">
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Дата</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Аренда</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Клиент</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Тип оплаты</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap text-right">Сумма</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Ответственный</th>
                            </tr>
                        </thead>
                         <tbody className="divide-y divide-slate-100">
                            {filteredData.length > 0 ? filteredData.map((item) => (
                                <tr key={item.id} className="hover:bg-slate-50/80 transition-colors group">
                                    {/* Date */}
                                    <td className="px-6 py-4 align-middle whitespace-nowrap">
                                        <div className="flex items-center gap-2 text-slate-600 font-medium text-sm">
                                            <Calendar className="w-4 h-4 text-slate-400" />
                                            {item.date}
                                        </div>
                                    </td>
                                    
                                    {/* Rental ID */}
                                    <td className="px-6 py-4 align-middle whitespace-nowrap">
                                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 border border-slate-200 text-slate-700 text-xs font-mono font-bold">
                                            <Hash className="w-3 h-3 text-slate-400" />
                                            {item.rentalId}
                                        </div>
                                    </td>

                                    {/* Client */}
                                    <td className="px-6 py-4 align-middle">
                                        <div className="flex items-center gap-3">
                                            <img src={item.client.avatarUrl} alt="avatar" className="w-9 h-9 rounded-full object-cover bg-slate-100 border border-slate-200 flex-shrink-0" />
                                            <div className="flex flex-col min-w-0">
                                                <span className="font-semibold text-slate-900 text-[13px] leading-tight truncate">{item.client.name}</span>
                                                <span className="text-[11px] text-slate-500 mt-0.5">{item.client.phone}</span>
                                            </div>
                                        </div>
                                    </td>

                                    {/* Payment Type */}
                                    <td className="px-6 py-4 align-middle whitespace-nowrap">
                                        {item.paymentType === 'cash' ? (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                <Banknote className="w-3.5 h-3.5" />
                                                Наличные
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                                                <CreditCard className="w-3.5 h-3.5" />
                                                Банк
                                            </span>
                                        )}
                                    </td>

                                    {/* Amount */}
                                    <td className="px-6 py-4 align-middle whitespace-nowrap text-right">
                                        <span className="text-sm font-bold text-emerald-600">{item.amount}</span>
                                    </td>

                                    {/* Responsible */}
                                    <td className="px-6 py-4 align-middle">
                                         <div className="flex items-center gap-3">
                                            <img src={item.responsible.avatarUrl} alt="admin" className="w-9 h-9 rounded-full object-cover bg-neutral-900 border border-slate-200 flex-shrink-0" />
                                            <div className="flex flex-col min-w-0">
                                                <span className="font-semibold text-slate-900 text-[13px] leading-tight truncate">{item.responsible.name}</span>
                                                <span className="text-[11px] text-slate-500 mt-0.5 truncate max-w-[150px]">{item.responsible.email}</span>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                                        Записей не найдено
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>
  );
};
