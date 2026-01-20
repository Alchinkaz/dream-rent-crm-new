import React, { useState, useRef, useEffect } from 'react';
import { PageProps, ClientItem, VehicleItem, RentalItem, User as UserType, RentalStatus } from '../../types';
import { Settings, Check, Clock, CheckCircle2, GripVertical, Search, Calendar as CalendarIcon, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, AlertCircle, Hourglass, CreditCard, LayoutGrid, LayoutList, Copy, ArrowLeft, Save, User, Car, Bike, Wallet, FileText, Trash2, X, ChevronRight as ChevronRightIcon, ChevronDown, ArrowRight, CalendarCheck, Plus, Tag, Archive, Ban, ShieldAlert, Banknote, Camera, Zap } from 'lucide-react';
import { initialCarClients, initialScootClients, initialCarVehicles, initialScootVehicles } from '../../data';
import { ClientForm } from './Clients';
import { VehicleForm } from './Warehouse';
import { db } from '../../lib/db';
import { formatDateTime, parseDateTime, formatCurrency } from '../../lib/utils';

export type TabId = 'all' | 'incoming' | 'booked' | 'rented' | 'completed' | 'overdue' | 'emergency' | 'archive';

interface Tab {
  id: TabId;
  label: string;
}

const tabs: Tab[] = [
  { id: 'all', label: 'Все' },
  { id: 'incoming', label: 'Входящие' },
  { id: 'booked', label: 'Забронировано' },
  { id: 'rented', label: 'В аренде' },
  { id: 'completed', label: 'Завершено' },
  { id: 'overdue', label: 'Просрочено' },
  { id: 'emergency', label: 'ЧП' },
  { id: 'archive', label: 'Архив' },
];

interface ColumnConfig {
  id: keyof RentalItem | 'checkbox' | 'actions' | 'vehicle';
  label: string;
  visible: boolean;
  width?: string;
}

// --- Helper Functions for Badges ---
const BADGE_BASE_CLASS = "inline-flex items-center justify-center gap-1.5 px-2.5 h-6 rounded-md text-[11px] font-semibold border whitespace-nowrap";

export const getStatusBadge = (status: string) => {
  switch (status) {
    case 'incoming':
      return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-neutral-100 text-neutral-700 border border-neutral-200 whitespace-nowrap"><Clock className="w-3 h-3" /> Входящая</span>;
    case 'booked':
      return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 whitespace-nowrap"><CalendarCheck className="w-3 h-3" /> Забронировано</span>;
    case 'rented':
      return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/50 whitespace-nowrap"><CheckCircle2 className="w-3 h-3" /> В аренде</span>;
    case 'completed':
      return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200 whitespace-nowrap"><Check className="w-3 h-3" /> Завершено</span>;
    case 'overdue':
      return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-red-50 text-red-700 border border-red-200 whitespace-nowrap"><AlertCircle className="w-3 h-3" /> Просрочено</span>;
    case 'emergency':
      return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-orange-50 text-orange-700 border border-orange-200 whitespace-nowrap"><ShieldAlert className="w-3 h-3" /> ЧП</span>;
    case 'cancelled':
      return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-50 text-slate-500 border border-slate-200 whitespace-nowrap"><Ban className="w-3 h-3" /> Отменено</span>;
    case 'archive':
      return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-400 border border-slate-200 whitespace-nowrap"><Archive className="w-3 h-3" /> Архив</span>;
    default:
      return <span className="px-2 py-1 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600 whitespace-nowrap">{status}</span>;
  }
};

export const getPaymentBadge = (status: 'paid' | 'partially' | 'pending') => {
  switch (status) {
    case 'paid':
      return <span className={`${BADGE_BASE_CLASS} bg-emerald-50 text-emerald-700 border-emerald-200`}>Оплачено</span>;
    case 'partially':
      return <span className={`${BADGE_BASE_CLASS} bg-orange-50 text-orange-700 border-orange-200`}>Частично</span>;
    case 'pending':
      return <span className={`${BADGE_BASE_CLASS} bg-slate-100 text-slate-500 border-slate-200`}>Ожидает</span>;
    default:
      return null;
  }
};

const getClientRatingBadge = (rating: ClientItem['rating']) => {
  const baseClass = "inline-flex items-center justify-center px-2 h-5 rounded text-[10px] font-bold uppercase tracking-wide border";
  switch (rating) {
    case 'trusted':
      return <span className={`${baseClass} bg-emerald-50 text-emerald-700 border-emerald-200`}>Друг</span>;
    case 'caution':
      return <span className={`${baseClass} bg-amber-50 text-amber-700 border-amber-200`}>Осторожно</span>;
    case 'blacklist':
      return <span className={`${baseClass} bg-red-50 text-red-700 border-red-200`}>Мошенник</span>;
    default:
      return null;
  }
};

// --- Helper Functions for Date Parsing/Formatting moved to lib/utils.ts ---

// --- Mock Data Removed ---

// --- DateTime Picker Component ---
const MONTH_NAMES = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
];
const WEEK_DAYS = ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс'];

interface DateTimePickerProps {
  initialDate: Date | null;
  onApply: (date: Date) => void;
  onClose: () => void;
  positionClass?: string;
}

const DateTimePicker: React.FC<DateTimePickerProps> = ({ initialDate, onApply, onClose, positionClass }) => {
  const [selectedDate, setSelectedDate] = useState<Date>(initialDate || new Date());
  const [currentMonth, setCurrentMonth] = useState<Date>(initialDate || new Date());

  // Time state
  const [hours, setHours] = useState<number>((initialDate || new Date()).getHours());
  const [minutes, setMinutes] = useState<number>((initialDate || new Date()).getMinutes());

  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => {
    const day = new Date(year, month, 1).getDay();
    return day === 0 ? 6 : day - 1;
  };

  const handleDayClick = (day: number) => {
    const newDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day, hours, minutes);
    setSelectedDate(newDate);
  };

  const handleTimeChange = (type: 'hours' | 'minutes', val: number) => {
    if (type === 'hours') setHours(val);
    else setMinutes(val);

    // Update selected date immediately visually
    const newDate = new Date(selectedDate);
    if (type === 'hours') newDate.setHours(val);
    else newDate.setMinutes(val);
    setSelectedDate(newDate);
  };

  const applyChanges = () => {
    const finalDate = new Date(selectedDate);
    finalDate.setHours(hours);
    finalDate.setMinutes(minutes);
    onApply(finalDate);
  };

  const renderCalendar = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const days = [];

    for (let i = 0; i < firstDay; i++) days.push(<div key={`empty-${i}`} className="w-10 h-10"></div>);

    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(year, month, i);
      const isSelected = date.getDate() === selectedDate.getDate() &&
        date.getMonth() === selectedDate.getMonth() &&
        date.getFullYear() === selectedDate.getFullYear();
      const isToday = new Date().toDateString() === date.toDateString();

      days.push(
        <button
          key={i}
          type="button"
          onClick={() => handleDayClick(i)}
          className={`
                      w-10 h-10 rounded-lg flex items-center justify-center text-sm transition-colors
                      ${isSelected ? 'bg-neutral-900 text-white font-medium' : 'text-slate-700 hover:bg-slate-100'}
                      ${isToday && !isSelected ? 'text-blue-600 font-bold' : ''}
                  `}
        >
          {i}
        </button>
      );
    }
    return days;
  };

  const scrollRefHours = useRef<HTMLDivElement>(null);
  const scrollRefMinutes = useRef<HTMLDivElement>(null);

  // Auto scroll to selected time
  useEffect(() => {
    if (scrollRefHours.current) {
      const el = scrollRefHours.current.children[hours] as HTMLElement;
      if (el) el.scrollIntoView({ block: 'center' });
    }
    if (scrollRefMinutes.current) {
      // Assuming minutes are 0-59, we render all or steps. Let's render all for precision.
      const el = scrollRefMinutes.current.children[minutes] as HTMLElement;
      if (el) el.scrollIntoView({ block: 'center' });
    }
  }, []);

  return (
    <div className={`absolute z-50 mt-2 bg-white rounded-xl shadow-2xl border border-slate-200 p-4 w-[480px] animate-in fade-in zoom-in-95 duration-200 flex flex-col gap-4 ${positionClass}`} onClick={(e) => e.stopPropagation()}>
      {/* Use items-stretch to let calendar height dictate container height, and time column fill it */}
      <div className="flex gap-4 items-stretch">
        {/* Calendar Section */}
        <div className="flex-1">
          <div className="flex items-center justify-between mb-3 px-1">
            <button type="button" onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))} className="p-1 hover:bg-slate-100 rounded-md text-slate-500"><ChevronLeft className="w-4 h-4" /></button>
            <span className="text-base font-bold text-slate-800 capitalize">{MONTH_NAMES[currentMonth.getMonth()]} {currentMonth.getFullYear()}</span>
            <button type="button" onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))} className="p-1 hover:bg-slate-100 rounded-md text-slate-500"><ChevronRight className="w-4 h-4" /></button>
          </div>
          <div className="grid grid-cols-7 mb-2">
            {WEEK_DAYS.map(d => <div key={d} className="text-center text-xs text-slate-400 uppercase font-medium">{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-y-1 gap-x-0 place-items-center">
            {renderCalendar()}
          </div>
        </div>

        {/* Divider */}
        <div className="w-px bg-slate-100"></div>

        {/* Time Section - height determined by flex stretch, with absolute scrolling inner container */}
        <div className="w-32 flex flex-col">
          <div className="text-center text-xs font-semibold text-slate-500 uppercase mb-2">Время</div>
          <div className="flex-1 relative min-h-0">
            <div className="absolute inset-0 flex gap-2">
              {/* Hours */}
              <div className="flex-1 overflow-y-auto no-scrollbar rounded-lg bg-slate-50 border border-slate-100 h-full" ref={scrollRefHours}>
                {Array.from({ length: 24 }).map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleTimeChange('hours', i)}
                    className={`w-full py-1.5 text-xs font-medium transition-colors ${hours === i ? 'bg-neutral-900 text-white' : 'text-slate-600 hover:bg-slate-200'}`}
                  >
                    {String(i).padStart(2, '0')}
                  </button>
                ))}
              </div>
              {/* Separator */}
              <div className="flex items-center justify-center font-bold text-slate-300 px-0.5">:</div>
              {/* Minutes */}
              <div className="flex-1 overflow-y-auto no-scrollbar rounded-lg bg-slate-50 border border-slate-100 h-full" ref={scrollRefMinutes}>
                {Array.from({ length: 60 }).map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleTimeChange('minutes', i)}
                    className={`w-full py-1.5 text-xs font-medium transition-colors ${minutes === i ? 'bg-neutral-900 text-white' : 'text-slate-600 hover:bg-slate-200'}`}
                  >
                    {String(i).padStart(2, '0')}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex justify-between items-center pt-3 border-t border-slate-100">
        <div className="text-xs text-slate-500 font-medium">
          {selectedDate.toLocaleDateString('ru-RU')} <span className="text-slate-900">{String(hours).padStart(2, '0')}:{String(minutes).padStart(2, '0')}</span>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={onClose} className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">Отмена</button>
          <button type="button" onClick={applyChanges} className="px-3 py-1.5 text-xs font-medium bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition-colors shadow-sm">Применить</button>
        </div>
      </div>
    </div>
  );
};

// --- Payment Modal Component ---

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (amount: number, method: 'cash' | 'bank') => void;
  initialAmount?: string;
}

const PaymentModal: React.FC<PaymentModalProps> = ({ isOpen, onClose, onSave, initialAmount }) => {
  const [amount, setAmount] = useState(initialAmount || '');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bank'>('cash');

  useEffect(() => {
    if (isOpen) {
      setAmount(initialAmount || '');
      setPaymentMethod('cash');
    }
  }, [isOpen, initialAmount]);

  if (!isOpen) return null;

  const handleSubmit = () => {
    const numericAmount = parseInt(amount.replace(/[^\d]/g, '')) || 0;
    if (numericAmount <= 0) {
      alert('Введите сумму оплаты');
      return;
    }
    onSave(numericAmount, paymentMethod);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-neutral-900/50 backdrop-blur-sm animate-in fade-in duration-200 p-4">
      <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-800 text-lg">Принять оплату</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">

          {/* Amount Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Сумма оплаты</label>
            <div className="relative">
              <input
                type="text"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-4 py-3 text-lg font-bold border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 transition-all text-slate-900 placeholder-slate-300"
                placeholder="0 ₸"
              />
            </div>
          </div>

          {/* Payment Method Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Способ оплаты</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPaymentMethod('cash')}
                className={`
                  flex flex-col items-center justify-center gap-2 p-4 rounded-xl border transition-all duration-200 relative
                  ${paymentMethod === 'cash'
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-sm'
                    : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50'
                  }
                `}
              >
                <Banknote className={`w-6 h-6 ${paymentMethod === 'cash' ? 'text-emerald-600' : 'text-slate-400'}`} />
                <span className="text-sm font-semibold">Наличные</span>
                {paymentMethod === 'cash' && (
                  <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-emerald-500" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('bank')}
                className={`
                  flex flex-col items-center justify-center gap-2 p-4 rounded-xl border transition-all duration-200 relative
                  ${paymentMethod === 'bank'
                    ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-sm'
                    : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50'
                  }
                `}
              >
                <CreditCard className={`w-6 h-6 ${paymentMethod === 'bank' ? 'text-blue-600' : 'text-slate-400'}`} />
                <span className="text-sm font-semibold">Банк</span>
                {paymentMethod === 'bank' && (
                  <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-blue-500" />
                )}
              </button>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 bg-white border border-slate-200 text-slate-700 font-medium rounded-xl hover:bg-slate-50 transition-colors shadow-sm"
          >
            Отмена
          </button>
          <button
            onClick={handleSubmit}
            className="flex-1 py-2.5 bg-neutral-900 text-white font-medium rounded-xl hover:bg-neutral-800 transition-colors shadow-md shadow-neutral-900/10"
          >
            Принять оплату
          </button>
        </div>

      </div>
    </div>
  );
};


// --- Form Component for New/Edit Rental ---

interface RentalFormProps {
  initialData?: RentalItem | null;
  onSave: (data: RentalItem) => void;
  onCancel: () => void;
  onDelete?: (id: string) => void;
  isCars: boolean;
  onNavigateToClient?: (clientId: string, fromRentalId?: string) => void;
  onNavigateToVehicle?: (vehicleId: string, fromRentalId?: string) => void;
}

const RentalForm: React.FC<PageProps & {
  initialData?: Partial<RentalItem>,
  isCars: boolean,
  onSave: (data: any) => void,
  onRefresh?: () => Promise<void>,
  onCancel: () => void,
  onDelete?: (id: string) => void
  onNavigateToClient?: (clientId: string, fromRentalId?: string) => void;
  onNavigateToVehicle?: (vehicleId: string, fromRentalId?: string) => void;
  user: UserType | null;
}> = ({ initialData, isCars, onSave, onRefresh, onCancel, onDelete, onNavigateToClient, onNavigateToVehicle, user, currentCompany }) => {
  const isEdit = !!initialData?.id;
  const [formData, setFormData] = useState<Partial<RentalItem>>({
    status: 'incoming' as const,
    vehicle: { name: '', plate: '', image: '' },
    client: { name: '', phone: '', avatarUrl: '' },
    period: { start: '', end: '' },
    amount: '0 ₸',
    payment: 'pending' as const,
    debt: '0 ₸',
    fine: '0 ₸',
    deposit: '0 ₸',
    comment: '',
    ...initialData
  });

  const [history, setHistory] = useState<any[]>([]);
  const isSaving = useRef(false);

  const getStatusLabel = (s: string) => {
    switch (s) {
      case 'incoming': return 'Входящая';
      case 'booked': return 'Забронировано';
      case 'rented': return 'В аренде';
      case 'completed': return 'Завершено';
      case 'overdue': return 'Просрочено';
      case 'emergency': return 'ЧП';
      case 'cancelled': return 'Отменено';
      case 'archive': return 'Архив';
      default: return s;
    }
  };

  const autoSave = async (newData: any) => {
    if (isSaving.current) return;
    isSaving.current = true;
    try {
      await db.rentals.save(newData, currentCompany.id);
    } catch (err) {
      console.error('Auto-save error:', err);
    } finally {
      isSaving.current = false;
    }
  };

  useEffect(() => {
    if (!formData.id) {
      setFormData(prev => ({
        ...prev,
        id: Math.floor(1000 + Math.random() * 9000).toString()
      }));
    }
  }, []);

  useEffect(() => {
    if (initialData?.id || formData.id) {
      loadHistory();
    }
  }, [initialData?.id]);

  const loadHistory = async () => {
    const id = initialData?.id || formData.id;
    if (id) {
      const data = await db.rentals.getHistory(id);
      setHistory(data);
    }
  };

  // Action Menu State
  const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);
  const actionMenuRef = useRef<HTMLDivElement>(null);

  // State for Date Picker Logic
  const [activeDateField, setActiveDateField] = useState<'start' | 'end' | null>(null);
  const datePickerWrapperRef = useRef<HTMLDivElement>(null);

  // State for Client Search & Selection
  const [clientSearchQuery, setClientSearchQuery] = useState('');
  const [isClientSearchFocused, setIsClientSearchFocused] = useState(false);
  const [isNewClientModalOpen, setIsNewClientModalOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchWrapperRef = useRef<HTMLDivElement>(null);

  // State for Vehicle Search & Selection
  const [vehicleSearchQuery, setVehicleSearchQuery] = useState('');
  const [isVehicleSearchFocused, setIsVehicleSearchFocused] = useState(false);
  const [isNewVehicleModalOpen, setIsNewVehicleModalOpen] = useState(false);
  const vehicleSearchInputRef = useRef<HTMLInputElement>(null);
  const vehicleSearchWrapperRef = useRef<HTMLDivElement>(null);

  // Payment Modal State
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  const [allClients, setAllClients] = useState<ClientItem[]>([]);
  const [allVehicles, setAllVehicles] = useState<VehicleItem[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const companyId = currentCompany.id;
      const [clients, vehicles] = await Promise.all([
        db.clients.list(companyId),
        db.vehicles.list(companyId)
      ]);
      setAllClients(clients);
      setAllVehicles(vehicles);
    };
    fetchData();
  }, [isCars]);

  const dbClient = formData.client?.name ? allClients.find(c => c.name === formData.client?.name || c.phone === formData.client?.phone) : undefined;
  const dbVehicle = formData.vehicle?.name ? allVehicles.find(v => v.name === formData.vehicle?.name || v.plate === formData.vehicle?.plate) : undefined;

  // Find the full vehicle object to access tariffs
  const selectedFullVehicle = allVehicles.find(v =>
    v.name === formData.vehicle?.name &&
    v.plate === formData.vehicle?.plate
  );

  const filteredClients = allClients.filter(c =>
    c.name.toLowerCase().includes(clientSearchQuery.toLowerCase()) ||
    c.phone.includes(clientSearchQuery)
  );

  const filteredVehicles = allVehicles.filter(v =>
    v.name.toLowerCase().includes(vehicleSearchQuery.toLowerCase()) ||
    v.plate.toLowerCase().includes(vehicleSearchQuery.toLowerCase())
  );

  // Close picker on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (datePickerWrapperRef.current && !datePickerWrapperRef.current.contains(event.target as Node)) {
        setActiveDateField(null);
      }
      if (searchWrapperRef.current && !searchWrapperRef.current.contains(event.target as Node)) {
        setIsClientSearchFocused(false);
      }
      if (vehicleSearchWrapperRef.current && !vehicleSearchWrapperRef.current.contains(event.target as Node)) {
        setIsVehicleSearchFocused(false);
      }
      if (actionMenuRef.current && !actionMenuRef.current.contains(event.target as Node)) {
        setIsActionMenuOpen(false);
      }
    };
    if (activeDateField || isClientSearchFocused || isVehicleSearchFocused || isActionMenuOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [activeDateField, isClientSearchFocused, isVehicleSearchFocused, isActionMenuOpen]);

  const handleChange = (section: keyof RentalItem, field: string, value: string) => {
    if (section === 'client' || section === 'vehicle' || section === 'period') {
      setFormData(prev => ({
        ...prev,
        [section]: { ...prev[section] as any, [field]: value }
      }));
    } else {
      setFormData(prev => ({ ...prev, [section]: value }));
    }
  };

  const handleDateApply = (date: Date) => {
    const formatted = formatDateTime(date);
    const newData = {
      ...formData,
      period: {
        ...formData.period,
        [activeDateField as string]: formatted
      }
    };
    setFormData(newData);
    setActiveDateField(null);
    autoSave(newData);
    if (onRefresh) onRefresh();
  };

  const handleTopLevelChange = (field: keyof RentalItem, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };
  const handleStatusChange = async (newStatus: RentalStatus) => {
    const id = initialData?.id || formData.id;
    if (!id || !user) return;

    try {
      // 1. Save current state with new status first
      const updatedData = { ...formData, status: newStatus };
      await db.rentals.save(updatedData, currentCompany.id);

      // 2. Add history record
      await db.rentals.addHistory({
        rental_id: id,
        user_id: user.id,
        action_type: 'status_change',
        details: `Статус изменен на ${getStatusLabel(newStatus)}`,
        old_value: formData.status,
        new_value: newStatus
      });

      // 3. Update local state
      setFormData(updatedData);
      setIsActionMenuOpen(false); // Keep this to close the action menu
      loadHistory();
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Status change error:', err);
      alert('Ошибка при смене статуса');
    }
  };





  const getActionConfig = (status: RentalItem['status'] = 'incoming') => {
    switch (status) {
      case 'incoming':
        return {
          main: { label: 'Забронировать', status: 'booked' as const, colorClass: 'bg-indigo-600 hover:bg-indigo-700 text-white' },
          alts: [
            { label: 'Отменить', status: 'cancelled' as const }
          ]
        };
      case 'booked':
        return {
          main: { label: 'Начать аренду', status: 'rented' as const, colorClass: 'bg-emerald-600 hover:bg-emerald-700 text-white' },
          alts: [
            { label: 'Отменить', status: 'cancelled' as const }
          ]
        };
      case 'rented':
        return {
          main: { label: 'Завершить аренду', status: 'completed' as const, colorClass: 'bg-slate-700 hover:bg-slate-800 text-white' },
          alts: [
            { label: 'Просрочено', status: 'overdue' as const },
            { label: 'ЧП (Авария/Угон)', status: 'emergency' as const }
          ]
        };
      case 'completed':
        return {
          main: { label: 'В архив', status: 'archive' as const, colorClass: 'bg-slate-600 hover:bg-slate-700 text-white' },
          alts: []
        };
      case 'cancelled':
        return {
          main: { label: 'Вернуть в работу', status: 'incoming' as const, colorClass: 'bg-blue-600 hover:bg-blue-700 text-white' },
          alts: [
            { label: 'В архив', status: 'archive' as const }
          ]
        };
      case 'overdue':
        return {
          main: { label: 'Завершить аренду', status: 'completed' as const, colorClass: 'bg-slate-700 hover:bg-slate-800 text-white' },
          alts: [
            { label: 'ЧП (Авария/Угон)', status: 'emergency' as const },
            { label: 'В архив', status: 'archive' as const }
          ]
        };
      case 'emergency':
        return {
          main: { label: 'Завершить аренду', status: 'completed' as const, colorClass: 'bg-slate-700 hover:bg-slate-800 text-white' },
          alts: [
            { label: 'В архив', status: 'archive' as const }
          ]
        };
      case 'archive':
        return {
          main: { label: 'Восстановить', status: 'incoming' as const, colorClass: 'bg-blue-600 hover:bg-blue-700 text-white' },
          alts: []
        };
      default:
        return {
          main: { label: 'Сохранить', status: 'incoming' as const, colorClass: 'bg-neutral-900 hover:bg-neutral-800 text-white' },
          alts: []
        };
    }
  };

  const actionConfig = getActionConfig(formData.status);

  const handleSelectClient = (client: ClientItem) => {
    const newData = {
      ...formData,
      client: {
        name: client.name,
        phone: client.phone,
        avatarUrl: client.avatar
      },
      clientId: client.id
    };
    setFormData(newData);
    setClientSearchQuery('');
    setIsClientSearchFocused(false);
    autoSave(newData);
    if (onRefresh) onRefresh();
  };

  const handleSelectVehicle = (vehicle: VehicleItem) => {
    const newData = {
      ...formData,
      vehicle: {
        name: vehicle.name,
        plate: vehicle.plate,
        image: vehicle.image
      },
      vehicleId: vehicle.id,
      tariffId: '' // Reset tariff when vehicle changes
    };
    setFormData(newData);
    setVehicleSearchQuery('');
    setIsVehicleSearchFocused(false);
    autoSave(newData);
    if (onRefresh) onRefresh();
  };

  const handleTariffChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const tId = e.target.value;
    const tariff = selectedFullVehicle?.tariffs.find(t => t.id === tId);
    const newData = {
      ...formData,
      tariffId: tId,
      amount: tariff ? formatCurrency(tariff.price) : formData.amount
    };
    setFormData(newData);
    autoSave(newData);
    if (onRefresh) onRefresh();
  };

  const handleCreateClientSave = async (newClient: ClientItem) => {
    try {
      await db.clients.save(newClient, currentCompany.id);
      setAllClients(prev => [...prev, newClient]);
      handleSelectClient(newClient);
      setIsNewClientModalOpen(false);
    } catch (e) {
      console.error(e);
      alert('Ошибка при создании клиента');
    }
  };

  const handleCreateVehicleSave = async (newVehicle: VehicleItem) => {
    try {
      await db.vehicles.save(newVehicle, currentCompany.id);
      setAllVehicles(prev => [...prev, newVehicle]);
      handleSelectVehicle(newVehicle);
      setIsNewVehicleModalOpen(false);
    } catch (e) {
      console.error(e);
      alert('Ошибка при создании транспорта');
    }
  };

  const handlePaymentSave = async (amount: number, method: 'cash' | 'bank') => {
    const id = initialData?.id || formData.id;
    if (!id || !formData.clientId || !user) {
      alert('Заполните данные аренды перед оплатой');
      return;
    }

    try {
      // 1. Ensure rental is saved/created first
      await db.rentals.save(formData, currentCompany.id);

      // 2. Save payment
      await db.payments.save({
        company_id: currentCompany.id,
        rental_id: id,
        client_id: formData.clientId,
        amount: amount,
        type: 'income',
        method: method,
        comment: `Оплата по аренде #${id}`,
        responsible_user_id: user.id
      });

      // 3. Add to history
      await db.rentals.addHistory({
        rental_id: id,
        user_id: user.id,
        action_type: 'payment',
        details: `Принята оплата: ${formatCurrency(amount)} (${method === 'cash' ? 'Наличные' : 'Безнал'})`
      });

      // 4. Update local debt state and auto-save it
      const currentDebt = parseInt(formData.debt?.replace(/[^\d]/g, '') || '0');
      const newDebt = Math.max(0, currentDebt - amount);
      const newData = { ...formData, debt: formatCurrency(newDebt) };
      setFormData(newData);
      await db.rentals.save(newData, currentCompany.id);

      alert('Оплата принята');
      loadHistory();
      setIsPaymentModalOpen(false);
      if (onRefresh) onRefresh();
    } catch (e) {
      console.error(e);
      alert('Ошибка при сохранении оплаты: ' + (e as any).message);
    }
  };

  const handleSaveComment = async () => {
    const id = initialData?.id || formData.id;
    if (!id || !user) return;

    try {
      // 1. Save rental first to ensure comment is in DB
      await db.rentals.save(formData, currentCompany.id);

      // 2. Add history record
      await db.rentals.addHistory({
        rental_id: id,
        user_id: user.id,
        action_type: 'comment',
        details: `Добавлен комментарий`,
        new_value: formData.comment
      });

      loadHistory();
      if (onRefresh) onRefresh();
      alert('Комментарий сохранен');
    } catch (e) {
      console.error(e);
      alert('Ошибка при сохранении комментария');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (initialData?.id && user && formData.status !== initialData.status) {
      try {
        await db.rentals.addHistory({
          rental_id: initialData.id,
          user_id: user.id,
          action_type: 'status_change',
          details: `Статус изменен с ${getStatusLabel(initialData.status)} на ${getStatusLabel(formData.status)}`,
          old_value: initialData.status,
          new_value: formData.status
        });
      } catch (e) {
        console.error(e);
      }
    }
    const finalData = {
      ...formData,
      id: formData.id || '',
      vehicle: {
        name: formData.vehicle?.name || 'Unknown',
        plate: formData.vehicle?.plate || '---',
        image: formData.vehicle?.image || 'https://via.placeholder.com/150'
      },
      client: {
        name: formData.client?.name || 'Unknown',
        phone: formData.client?.phone || '',
        avatarUrl: formData.client?.avatarUrl || 'https://ui-avatars.com/api/?name=U&background=random'
      },
      period: {
        start: formData.period?.start || '',
        end: formData.period?.end || ''
      }
    } as RentalItem;

    onSave(finalData);
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 animate-in fade-in slide-in-from-right-4 duration-300 relative">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-8 py-4 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto flex items-center justify-between w-full">
          <div className="flex items-center gap-4">
            <button type="button" onClick={onCancel} className="p-2 -ml-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                {isEdit ? `Аренда #${initialData.id}` : 'Новая аренда'}
                {isEdit && getStatusBadge(formData.status || 'incoming')}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {isEdit ? (
              null
            ) : (
              <>
                <button type="button" onClick={onCancel} className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition-colors">Отмена</button>
                <button onClick={handleSubmit} className="flex items-center gap-2 px-6 py-2 bg-neutral-900 text-white font-semibold rounded-xl hover:bg-neutral-800 transition-all shadow-lg shadow-neutral-200 active:scale-[0.98]">
                  Создать
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-8">
        <form onSubmit={handleSubmit} className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8 pb-10">

          {/* Left Column (Details) */}
          <div className="lg:col-span-2 space-y-6">

            {/* Client Card */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 relative z-20">
              <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                Клиент
              </h3>

              {formData.client?.name ? (
                <div
                  onClick={() => dbClient && onNavigateToClient?.(dbClient.id, initialData?.id)}
                  className={`
                                    bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-5 relative group transition-all
                                    ${dbClient ? 'hover:border-neutral-400 hover:shadow-md cursor-pointer' : ''}
                                `}
                >
                  <img
                    src={dbClient?.avatar || formData.client.avatarUrl || 'https://ui-avatars.com/api/?name=C&background=f1f5f9'}
                    alt="avatar"
                    className="w-16 h-16 rounded-full object-cover border-2 border-slate-100 flex-shrink-0"
                  />
                  <div className="flex flex-col gap-1 min-w-0 flex-1">
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-slate-900 text-lg truncate">{formData.client.name}</span>
                      {dbClient && getClientRatingBadge(dbClient.rating)}
                    </div>
                    <div className="flex items-center gap-2 text-slate-500 font-medium text-sm">
                      <span>{formData.client.phone}</span>
                    </div>
                  </div>

                  {dbClient && (
                    <div className="p-2 text-slate-300 group-hover:text-slate-600 transition-colors">
                      <ChevronRightIcon className="w-6 h-6" />
                    </div>
                  )}

                  {!dbClient && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleChange('client', 'name', ''); handleChange('client', 'phone', ''); }}
                      className="absolute top-2 right-2 text-slate-400 hover:text-red-500 p-1"
                      title="Сменить клиента"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ) : (
                <div className="flex flex-col md:flex-row gap-6 items-start">
                  {/* Search & Add Client Interface */}
                  <div className="flex-shrink-0 flex flex-col items-center gap-2 pt-1">
                    <div className="w-16 h-16 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400">
                      <User className="w-8 h-8" />
                    </div>
                  </div>
                  <div className="flex-1 w-full space-y-3" ref={searchWrapperRef}>
                    <label className="text-sm font-medium text-slate-700 block">Поиск или создание клиента</label>
                    <div className="flex gap-2 relative">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          type="text"
                          ref={searchInputRef}
                          value={clientSearchQuery}
                          onFocus={() => setIsClientSearchFocused(true)}
                          onChange={(e) => setClientSearchQuery(e.target.value)}
                          className="w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 transition-all bg-white shadow-sm"
                          placeholder="Имя или телефон клиента..."
                        />
                        {/* Dropdown Results */}
                        {isClientSearchFocused && (
                          <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-slate-200 max-h-60 overflow-y-auto z-50 animate-in fade-in zoom-in-95 duration-100">
                            {filteredClients.length > 0 ? (
                              filteredClients.map(client => (
                                <button
                                  key={client.id}
                                  type="button"
                                  onMouseDown={() => handleSelectClient(client)}
                                  className="w-full flex items-center gap-3 p-3 hover:bg-slate-50 transition-colors text-left border-b border-slate-50 last:border-0"
                                >
                                  {client.avatar ? (
                                    <img
                                      src={client.avatar}
                                      alt={client.name}
                                      className="w-8 h-8 rounded-full object-cover bg-slate-100 border border-slate-200"
                                      onError={(e) => {
                                        e.currentTarget.style.display = 'none';
                                        e.currentTarget.nextElementSibling?.classList.remove('hidden');
                                      }}
                                    />
                                  ) : null}
                                  <div className={`w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center ${client.avatar ? 'hidden' : ''}`}>
                                    <User className="w-4 h-4 text-slate-400" />
                                  </div>
                                  <div className="flex flex-col min-w-0">
                                    <span className="text-sm font-semibold text-slate-900 truncate">{client.name}</span>
                                    <span className="text-xs text-slate-500 font-mono">{client.phone}</span>
                                  </div>
                                </button>
                              ))
                            ) : (
                              <div className="p-4 text-center text-sm text-slate-400">
                                Клиентов не найдено
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsNewClientModalOpen(true)}
                        className="px-4 py-2.5 bg-neutral-900 text-white rounded-xl font-medium text-sm hover:bg-neutral-800 transition-colors shadow-sm flex items-center gap-2 flex-shrink-0"
                      >
                        <Plus className="w-4 h-4" />
                        <span className="hidden sm:inline">Новый клиент</span>
                        <span className="inline sm:hidden">Новый</span>
                      </button>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <div className="text-xs text-slate-400">Недавние:</div>
                      {allClients.slice(0, 3).map(c => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => handleSelectClient(c)}
                          className="text-xs px-2 py-0.5 bg-slate-100 rounded-md text-slate-600 hover:bg-slate-200 hover:text-slate-900 transition-colors"
                        >
                          {c.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Vehicle Card */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 relative z-10">
              <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                Транспорт
              </h3>

              {formData.vehicle?.name ? (
                <div
                  onClick={() => dbVehicle && onNavigateToVehicle?.(dbVehicle.id, initialData?.id)}
                  className={`
                                    bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-5 relative group transition-all
                                    ${dbVehicle ? 'hover:border-neutral-400 hover:shadow-md cursor-pointer' : ''}
                                `}
                >
                  <img
                    src={dbVehicle?.image || formData.vehicle.image || 'https://via.placeholder.com/150'}
                    alt="vehicle"
                    className="w-20 h-20 rounded-xl object-cover border border-slate-200 bg-slate-100 flex-shrink-0"
                  />
                  <div className="flex flex-col gap-1 min-w-0 flex-1">
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-slate-900 text-lg truncate">{formData.vehicle.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center justify-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200 font-mono whitespace-nowrap">
                        {formData.vehicle.plate}
                      </span>
                    </div>
                  </div>

                  {dbVehicle && (
                    <div className="p-2 text-slate-300 group-hover:text-slate-600 transition-colors">
                      <ChevronRightIcon className="w-6 h-6" />
                    </div>
                  )}

                  {!dbVehicle && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleChange('vehicle', 'name', ''); handleChange('vehicle', 'plate', ''); }}
                      className="absolute top-2 right-2 text-slate-400 hover:text-red-500 p-1"
                      title="Сменить транспорт"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ) : (
                <div className="flex flex-col md:flex-row gap-6 items-start">
                  <div className="flex-shrink-0 flex flex-col items-center gap-2 pt-1">
                    <div className="w-16 h-16 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 overflow-hidden">
                      {formData.vehicle?.image && <img src={formData.vehicle.image} alt="vehicle" className="w-full h-full object-cover" />}
                      {!formData.vehicle?.image && (
                        <div className="w-full h-full flex items-center justify-center text-slate-400">
                          {currentCompany.type === 'cars' ? <Car className="w-8 h-8" /> : (currentCompany.type === 'moto' ? <Zap className="w-8 h-8" /> : <Bike className="w-8 h-8" />)}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex-1 w-full space-y-3" ref={vehicleSearchWrapperRef}>
                    <label className="text-sm font-medium text-slate-700 block">Поиск или создание транспорта</label>
                    <div className="flex gap-2 relative">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          type="text"
                          ref={vehicleSearchInputRef}
                          value={vehicleSearchQuery}
                          onFocus={() => setIsVehicleSearchFocused(true)}
                          onChange={(e) => setVehicleSearchQuery(e.target.value)}
                          className="w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 transition-all bg-white shadow-sm"
                          placeholder="Название или гос. номер..."
                        />
                        {/* Dropdown Results */}
                        {isVehicleSearchFocused && (
                          <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-slate-200 max-h-60 overflow-y-auto z-50 animate-in fade-in zoom-in-95 duration-100">
                            {filteredVehicles.length > 0 ? (
                              filteredVehicles.map(vehicle => (
                                <button
                                  key={vehicle.id}
                                  type="button"
                                  onMouseDown={() => handleSelectVehicle(vehicle)}
                                  className="w-full flex items-center gap-3 p-3 hover:bg-slate-50 transition-colors text-left border-b border-slate-50 last:border-0"
                                >
                                  {vehicle.image ? (
                                    <img
                                      src={vehicle.image}
                                      alt={vehicle.name}
                                      className="w-10 h-10 rounded-lg object-cover bg-slate-100 border border-slate-200"
                                      onError={(e) => {
                                        e.currentTarget.style.display = 'none';
                                        e.currentTarget.nextElementSibling?.classList.remove('hidden');
                                      }}
                                    />
                                  ) : null}
                                  <div className={`w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center ${vehicle.image ? 'hidden' : ''}`}>
                                    <Camera className="w-4 h-4 text-slate-300" />
                                  </div>
                                  <div className="flex flex-col min-w-0">
                                    <span className="text-sm font-semibold text-slate-900 truncate">{vehicle.name}</span>
                                    <span className="text-xs text-slate-500 font-mono bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 inline-block mt-1 w-fit">{vehicle.plate}</span>
                                  </div>
                                </button>
                              ))
                            ) : (
                              <div className="p-4 text-center text-sm text-slate-400">
                                Транспорт не найден
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsNewVehicleModalOpen(true)}
                        className="px-4 py-2.5 bg-neutral-900 text-white rounded-xl font-medium text-sm hover:bg-neutral-800 transition-colors shadow-sm flex items-center gap-2 flex-shrink-0"
                      >
                        <Plus className="w-4 h-4" />
                        <span className="hidden sm:inline">Новый транспорт</span>
                        <span className="inline sm:hidden">Новый</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Period with Date Time Picker */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6" ref={datePickerWrapperRef}>
              <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                Период аренды
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
                {/* Start Date */}
                <div className="space-y-1.5 relative">
                  <label className="text-sm font-medium text-slate-700">Начало аренды</label>
                  <div
                    className="relative cursor-pointer group"
                    onClick={() => setActiveDateField('start')}
                  >
                    <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-hover:text-neutral-900 transition-colors" />
                    <input
                      type="text"
                      readOnly
                      value={formData.period?.start}
                      className="w-full pl-10 pr-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 transition-all bg-white cursor-pointer select-none"
                      placeholder="ДД.ММ.ГГГГ, ЧЧ:ММ"
                    />
                  </div>
                  {activeDateField === 'start' && (
                    <DateTimePicker
                      initialDate={parseDateTime(formData.period?.start || '')}
                      onApply={handleDateApply}
                      onClose={() => setActiveDateField(null)}
                      positionClass="top-full left-0"
                    />
                  )}
                </div>

                {/* End Date */}
                <div className="space-y-1.5 relative">
                  <label className="text-sm font-medium text-slate-700">Конец аренды</label>
                  <div
                    className="relative cursor-pointer group"
                    onClick={() => setActiveDateField('end')}
                  >
                    <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-hover:text-neutral-900 transition-colors" />
                    <input
                      type="text"
                      readOnly
                      value={formData.period?.end}
                      className="w-full pl-10 pr-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 transition-all bg-white cursor-pointer select-none"
                      placeholder="ДД.ММ.ГГГГ, ЧЧ:ММ"
                    />
                  </div>
                  {activeDateField === 'end' && (
                    <DateTimePicker
                      initialDate={parseDateTime(formData.period?.end || '')}
                      onApply={handleDateApply}
                      onClose={() => setActiveDateField(null)}
                      positionClass="top-full left-0 md:left-auto md:right-0"
                    />
                  )}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  Комментарий
                </h3>
                <button
                  type="button"
                  onClick={handleSaveComment}
                  className="flex items-center gap-2 px-3 py-1.5 bg-neutral-900 text-white text-xs font-semibold rounded-lg hover:bg-neutral-800 transition-colors shadow-sm"
                >
                  <Save className="w-3.5 h-3.5" />
                  Сохранить
                </button>
              </div>
              <textarea
                value={formData.comment}
                onChange={(e) => handleTopLevelChange('comment', e.target.value)}
                onBlur={() => autoSave(formData)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 transition-all h-32 resize-none"
                placeholder="Заметки о поездке..."
              />
            </div>

            {/* History Section */}
            {initialData?.id && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-slate-400" />
                  История изменений
                </h3>
                <div className="space-y-4">
                  {history.length > 0 ? (
                    history.map((h, idx) => (
                      <div key={h.id || idx} className="flex gap-4 relative">
                        {idx !== history.length - 1 && (
                          <div className="absolute left-[18px] top-8 bottom-[-16px] w-[2px] bg-slate-100" />
                        )}
                        <div className="flex-shrink-0">
                          <img
                            src={h.user?.avatarUrl || 'https://ui-avatars.com/api/?name=S&background=ddd&color=333'}
                            alt={h.user?.name || 'System'}
                            className="w-[38px] h-[38px] rounded-full border-2 border-white shadow-sm ring-1 ring-slate-100 object-cover"
                          />
                        </div>
                        <div className="flex-1 pt-0.5">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-[14px] text-slate-900">{h.user?.name || 'Система'}</span>
                            <span className="text-[11px] font-medium text-slate-500 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">
                              {h.date}
                            </span>
                          </div>
                          <p className="text-[13px] text-slate-600 leading-relaxed font-medium">
                            {h.details}
                          </p>
                          {h.action === 'comment' && h.newValue && (
                            <div className="mt-2 p-2.5 bg-slate-50 border border-slate-100 rounded-lg text-slate-700 text-[13px] italic line-clamp-3">
                              "{h.newValue}"
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 bg-slate-50 border border-dashed border-slate-200 rounded-xl">
                      <p className="text-sm text-slate-400 font-medium">История пуста</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right Column (Financials) */}
          <div className="space-y-6">
            {/* Action Buttons Section */}
            <div className="flex flex-col gap-2 relative" ref={actionMenuRef}>
              <div className="flex rounded-xl shadow-lg shadow-neutral-900/5 transition-all">
                {/* Main Action Button */}
                <button
                  type="button"
                  onClick={() => handleStatusChange(actionConfig.main.status)}
                  className={`flex-1 py-4 font-bold text-[16px] transition-colors ${actionConfig.alts.length > 0 ? 'rounded-l-2xl' : 'rounded-2xl'} ${actionConfig.main.colorClass}`}
                >
                  {actionConfig.main.label}
                </button>

                {/* Dropdown Toggle */}
                {actionConfig.alts.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setIsActionMenuOpen(!isActionMenuOpen)}
                    className={`px-4 border-l border-white/20 rounded-r-2xl transition-colors flex items-center justify-center ${actionConfig.main.colorClass}`}
                  >
                    <ChevronDown className={`w-5 h-5 transition-transform ${isActionMenuOpen ? 'rotate-180' : ''}`} />
                  </button>
                )}
              </div>

              {/* Dropdown Menu - Full Width */}
              {isActionMenuOpen && actionConfig.alts.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 w-full bg-white rounded-xl shadow-xl border border-slate-200 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                  <div className="py-1">
                    {actionConfig.alts.map((alt, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleStatusChange(alt.status)}
                        className="w-full text-left px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors flex items-center gap-2 border-b border-slate-50 last:border-0"
                      >
                        {alt.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                Финансы
              </h3>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Статус оплаты</label>
                  <select
                    value={formData.payment}
                    onChange={(e) => {
                      const val = e.target.value as any;
                      handleTopLevelChange('payment', val);
                      const newData = { ...formData, payment: val };
                      autoSave(newData);
                      if (onRefresh) onRefresh();
                    }}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 transition-all bg-white"
                  >
                    <option value="pending">Ожидает</option>
                    <option value="partially">Частично</option>
                    <option value="paid">Оплачено</option>
                  </select>
                </div>

                <div className="pt-2 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">Сумма аренды</span>
                    <input
                      type="text"
                      value={formData.amount}
                      onChange={(e) => handleTopLevelChange('amount', e.target.value)}
                      onBlur={() => autoSave(formData)}
                      className="w-32 text-right px-2 py-1 border border-slate-200 rounded bg-slate-50 focus:bg-white focus:outline-none focus:border-neutral-500 font-bold text-slate-900"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">Залог</span>
                    <input
                      type="text"
                      value={formData.deposit}
                      onChange={(e) => handleTopLevelChange('deposit', e.target.value)}
                      onBlur={() => autoSave(formData)}
                      className="w-32 text-right px-2 py-1 border border-slate-200 rounded bg-slate-50 focus:bg-white focus:outline-none focus:border-neutral-500 font-medium text-emerald-600"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">Штрафы</span>
                    <input
                      type="text"
                      value={formData.fine}
                      onChange={(e) => handleTopLevelChange('fine', e.target.value)}
                      onBlur={() => autoSave(formData)}
                      className="w-32 text-right px-2 py-1 border border-slate-200 rounded bg-slate-50 focus:bg-white focus:outline-none focus:border-neutral-500 font-medium text-red-600"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">Долг клиента</span>
                    <input
                      type="text"
                      value={formData.debt}
                      onChange={(e) => handleTopLevelChange('debt', e.target.value)}
                      onBlur={() => autoSave(formData)}
                      className="w-32 text-right px-2 py-1 border border-slate-200 rounded bg-slate-50 focus:bg-white focus:outline-none focus:border-neutral-500 font-medium text-red-600"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsPaymentModalOpen(true)}
                    className="w-full mt-2 py-2.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl font-medium hover:bg-emerald-100 transition-colors flex items-center justify-center gap-2"
                  >
                    <Wallet className="w-4 h-4" />
                    Принять оплату
                  </button>
                </div>
              </div>
            </div>

            {/* Tariff Block */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                Тариф
              </h3>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Выберите тариф</label>
                <div className="relative">
                  <select
                    value={formData.tariffId || ''}
                    onChange={handleTariffChange}
                    disabled={!selectedFullVehicle || !selectedFullVehicle.tariffs || selectedFullVehicle.tariffs.length === 0}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 transition-all bg-white appearance-none disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed"
                  >
                    <option value="">{!selectedFullVehicle ? 'Сначала выберите транспорт' : 'Не выбран'}</option>
                    {selectedFullVehicle?.tariffs.map(t => (
                      <option key={t.id} value={t.id}>{t.name} ({t.price})</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
                {selectedFullVehicle && selectedFullVehicle.tariffs.length === 0 && (
                  <p className="text-xs text-orange-500 mt-1">Для этого транспорта нет активных тарифов</p>
                )}
              </div>
            </div>

            {isEdit && onDelete && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => initialData?.id && onDelete(initialData.id)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-50 text-red-600 border border-red-100 rounded-xl hover:bg-red-100 transition-colors font-medium"
                >
                  <Trash2 className="w-4 h-4" />
                  Удалить аренду
                </button>
              </div>
            )}
          </div>
        </form>
      </div>

      {/* Create Client Modal */}
      {isNewClientModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-neutral-900/50 backdrop-blur-sm animate-in fade-in duration-200 p-4">
          <div className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl flex flex-col h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <ClientForm
              initialData={null}
              onSave={handleCreateClientSave}
              onCancel={() => setIsNewClientModalOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Create Vehicle Modal */}
      {isNewVehicleModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-neutral-900/50 backdrop-blur-sm animate-in fade-in duration-200 p-4">
          <div className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl flex flex-col h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <VehicleForm
              initialData={null}
              isCars={isCars}
              onSave={handleCreateVehicleSave}
              onCancel={() => setIsNewVehicleModalOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Payment Modal */}
      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        onSave={handlePaymentSave}
        initialAmount={formData.debt && formData.debt !== '0 ₸' ? formData.debt.replace(/[^\d]/g, '') : ''}
      />
    </div>
  );
};


// --- DateRangePicker Component ---

const MONTH_NAMES_FILTER = [
  'январь', 'февраль', 'март', 'апрель', 'май', 'июнь',
  'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'
];

export interface DateRangePickerProps {
  onApply: (start: Date | null, end: Date | null) => void;
  onClose: () => void;
  initialStart: Date | null;
  initialEnd: Date | null;
}

export const DateRangePicker: React.FC<DateRangePickerProps> = ({ onApply, onClose, initialStart, initialEnd }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [startDate, setStartDate] = useState<Date | null>(initialStart);
  const [endDate, setEndDate] = useState<Date | null>(initialEnd);
  const [hoverDate, setHoverDate] = useState<Date | null>(null);

  const handleDayClick = (date: Date) => {
    if (!startDate || (startDate && endDate)) {
      setStartDate(date);
      setEndDate(null);
    } else {
      if (date < startDate) {
        setEndDate(startDate);
        setStartDate(date);
      } else {
        setEndDate(date);
      }
    }
  };

  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => {
    const day = new Date(year, month, 1).getDay();
    return day === 0 ? 6 : day - 1;
  };
  const isSameDay = (d1: Date, d2: Date | null) => d2 && d1.getDate() === d2.getDate() && d1.getMonth() === d2.getMonth() && d1.getFullYear() === d2.getFullYear();

  const isInRange = (date: Date) => {
    if (startDate && endDate) return date > startDate && date < endDate;
    if (startDate && hoverDate && !endDate) {
      const start = startDate < hoverDate ? startDate : hoverDate;
      const end = startDate < hoverDate ? hoverDate : startDate;
      return date > start && date < end;
    }
    return false;
  };

  const handleQuickFilter = (type: 'currentYear' | 'currentMonth' | 'lastMonth' | 'lastYear' | 'all') => {
    const now = new Date();
    let start: Date | null = null;
    let end: Date | null = null;
    switch (type) {
      case 'currentYear': start = new Date(now.getFullYear(), 0, 1); end = new Date(now.getFullYear(), 11, 31); break;
      case 'currentMonth': start = new Date(now.getFullYear(), now.getMonth(), 1); end = new Date(now.getFullYear(), now.getMonth() + 1, 0); break;
      case 'lastMonth': start = new Date(now.getFullYear(), now.getMonth() - 1, 1); end = new Date(now.getFullYear(), now.getMonth(), 0); break;
      case 'lastYear': start = new Date(now.getFullYear() - 1, 0, 1); end = new Date(now.getFullYear() - 1, 11, 31); break;
      case 'all': start = null; end = null; break;
    }
    setStartDate(start);
    setEndDate(end);
    if (start) setCurrentDate(new Date(start));
  };

  const renderMonth = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const dateForDisplay = new Date(year, month, 1);
    const today = new Date();
    const displayYear = dateForDisplay.getFullYear();
    const displayMonth = dateForDisplay.getMonth();
    const daysInMonth = getDaysInMonth(displayYear, displayMonth);
    const firstDay = getFirstDayOfMonth(displayYear, displayMonth);
    const days = [];

    for (let i = 0; i < firstDay; i++) days.push(<div key={`empty-${i}`} className="w-10 h-9"></div>);
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(displayYear, displayMonth, i);
      let visualStart = startDate;
      let visualEnd = endDate;
      if (!endDate && startDate && hoverDate) {
        visualStart = hoverDate < startDate ? hoverDate : startDate;
        visualEnd = hoverDate < startDate ? startDate : hoverDate;
      }
      const isVisualStart = isSameDay(date, visualStart);
      const isVisualEnd = isSameDay(date, visualEnd);
      const inRange = isInRange(date);
      const isToday = isSameDay(date, today);

      const gridIndex = firstDay + i - 1;
      const colIndex = gridIndex % 7;

      let bgClass = '';
      let textClass = 'text-slate-700 hover:bg-slate-100';
      let ringClass = '';
      let roundedClass = 'rounded-md';
      let widthClass = 'w-9 mx-auto';
      let zIndexClass = 'z-10';

      const isSelected = isVisualStart || isVisualEnd || inRange;
      if (isSelected) {
        widthClass = 'w-full';
        if (isVisualStart || isVisualEnd) {
          bgClass = 'bg-neutral-900 text-white hover:bg-neutral-800';
          textClass = 'text-white';
          zIndexClass = 'z-20';
          if (isToday) ringClass = 'ring-2 ring-white ring-inset';
        } else {
          bgClass = 'bg-slate-100';
          textClass = 'text-slate-700';
          zIndexClass = 'z-10';
          if (isToday) ringClass = 'ring-2 ring-neutral-500 ring-inset';
        }
        const isLeftEdge = isVisualStart || colIndex === 0;
        const isRightEdge = isVisualEnd || colIndex === 6;
        if (isLeftEdge && isRightEdge) roundedClass = 'rounded-md';
        else if (isLeftEdge) roundedClass = 'rounded-l-md rounded-r-none';
        else if (isRightEdge) roundedClass = 'rounded-r-md rounded-l-none';
        else roundedClass = 'rounded-none';
        if (!isVisualStart && colIndex !== 0) widthClass = 'w-[calc(100%_+_1px)] -ml-[1px]';
      } else if (isToday) ringClass = 'ring-1 ring-neutral-600 font-bold text-neutral-700';

      days.push(
        <button type="button" key={i} onClick={() => handleDayClick(date)} onMouseEnter={() => setHoverDate(date)} onMouseLeave={() => setHoverDate(null)} className={`h-9 text-sm font-medium flex items-center justify-center relative ${zIndexClass} ${widthClass} ${roundedClass} ${bgClass} ${textClass} ${ringClass} transition-colors`}>{i}</button>
      );
    }
    return (
      <div className="w-[300px]">
        <div className="flex items-center justify-between mb-4 px-1">
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => setCurrentDate(new Date(currentDate.getFullYear() - 1, currentDate.getMonth(), 1))} className="p-1 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-700"><ChevronsLeft className="w-4 h-4" /></button>
            <button type="button" onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))} className="p-1 hover:bg-slate-100 rounded-full text-slate-500 hover:text-slate-700"><ChevronLeft className="w-4 h-4" /></button>
          </div>
          <span className="text-[15px] font-medium text-slate-800 capitalize select-none">{MONTH_NAMES[currentDate.getMonth()]} {currentDate.getFullYear()}</span>
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))} className="p-1 hover:bg-slate-100 rounded-full text-slate-500 hover:text-slate-700"><ChevronRight className="w-4 h-4" /></button>
            <button type="button" onClick={() => setCurrentDate(new Date(currentDate.getFullYear() + 1, currentDate.getMonth(), 1))} className="p-1 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-700"><ChevronsRight className="w-4 h-4" /></button>
          </div>
        </div>
        <div className="grid grid-cols-7 mb-2">{WEEK_DAYS.map(d => <div key={d} className="text-center text-xs text-slate-400 font-medium uppercase py-1 select-none">{d}</div>)}</div>
        <div className="grid grid-cols-7 gap-y-1 gap-x-0">{days}</div>
      </div>
    );
  };

  return (
    <div className="absolute top-full left-0 mt-2 bg-white rounded-xl shadow-2xl border border-slate-200 p-0 flex flex-col md:flex-row z-50 animate-in fade-in zoom-in-95 duration-200 origin-top-left w-fit max-w-[90vw] overflow-hidden" onClick={(e) => e.stopPropagation()}>
      <div className="p-6">
        {renderMonth()}
      </div>
      <div className="w-full md:w-48 border-t md:border-t-0 md:border-l border-slate-100 p-6 bg-slate-50/50 flex flex-col justify-between">
        <div className="space-y-2 mb-4 md:mb-0">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Быстрый выбор</span>
          <button type="button" onClick={() => handleQuickFilter('currentMonth')} className="w-full text-left text-sm text-slate-600 hover:text-neutral-900 py-1.5 font-medium transition-colors hover:bg-slate-100 rounded px-2 -ml-2">Текущий месяц</button>
          <button type="button" onClick={() => handleQuickFilter('lastMonth')} className="w-full text-left text-sm text-slate-600 hover:text-neutral-900 py-1.5 font-medium transition-colors hover:bg-slate-100 rounded px-2 -ml-2">Прошлый месяц</button>
          <button type="button" onClick={() => handleQuickFilter('currentYear')} className="w-full text-left text-sm text-slate-600 hover:text-neutral-900 py-1.5 font-medium transition-colors hover:bg-slate-100 rounded px-2 -ml-2">Текущий год</button>
          <button type="button" onClick={() => handleQuickFilter('all')} className="w-full text-left text-sm text-slate-600 hover:text-neutral-900 py-1.5 font-medium transition-colors hover:bg-slate-100 rounded px-2 -ml-2">За все время</button>
        </div>
        <div className="flex flex-col gap-2 mt-4 pt-4 border-t border-slate-200/50">
          <button type="button" onClick={onClose} className="w-full py-2 text-sm text-slate-500 hover:text-slate-700 transition-colors">Отмена</button>
          <button type="button" onClick={() => onApply(startDate, endDate)} className="w-full py-2 bg-neutral-900 text-white rounded-lg text-sm font-medium hover:bg-neutral-800 transition-colors shadow-sm">Применить</button>
        </div>
      </div>
    </div>
  );
};

export const Rentals: React.FC<PageProps> = ({ currentCompany, onNavigateToClient, onNavigateToVehicle, initialRentalId, user }) => {
  const [activeTab, setActiveTab] = useState<TabId>('all');
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [dateRange, setDateRange] = useState<{ start: Date | null, end: Date | null }>({ start: null, end: null });
  const [searchQuery, setSearchQuery] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'paid' | 'partially' | 'pending'>('all');
  const [isPaymentFilterOpen, setIsPaymentFilterOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  // New States for Navigation
  const [pageView, setPageView] = useState<'list' | 'form'>('list');
  const [selectedRental, setSelectedRental] = useState<RentalItem | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [rentalsData, setRentalsData] = useState<RentalItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchRentals = async () => {
    setIsLoading(true);
    try {
      const data = await db.rentals.list(currentCompany.id, activeTab);
      setRentalsData(data);
    } catch (err) {
      console.error('Failed to fetch rentals:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRentals();
  }, [currentCompany, activeTab]);


  useEffect(() => {
    if (initialRentalId && rentalsData.length > 0) {
      const rentalToRestore = rentalsData.find(r => r.id === initialRentalId);
      if (rentalToRestore) {
        setSelectedRental(rentalToRestore);
        setPageView('form');
      }
    }
  }, [initialRentalId, rentalsData]);

  const datePickerRef = useRef<HTMLDivElement>(null);
  const paymentFilterRef = useRef<HTMLDivElement>(null);

  const filteredData = rentalsData.filter(item => {
    if (activeTab !== 'all' && item.status !== activeTab) return false;
    if (paymentFilter !== 'all' && item.payment !== paymentFilter) return false;
    if (searchQuery) {
      const lowerQ = searchQuery.toLowerCase();
      if (!item.client.name.toLowerCase().includes(lowerQ) && !item.vehicle.name.toLowerCase().includes(lowerQ) && !item.vehicle.plate.toLowerCase().includes(lowerQ)) return false;
    }
    if (dateRange.start && dateRange.end) {
      const itemDate = parseDateTime(item.period.start);
      const start = new Date(dateRange.start);
      start.setHours(0, 0, 0, 0);
      const end = new Date(dateRange.end);
      end.setHours(23, 59, 59, 999);

      if (itemDate < start || itemDate > end) return false;
    }
    return true;
  });

  const hasData = filteredData.length > 0;
  const getTabCount = (tabId: TabId) => tabId === 'all' ? rentalsData.length : rentalsData.filter(item => item.status === tabId).length;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) setIsDatePickerOpen(false);
      if (paymentFilterRef.current && !paymentFilterRef.current.contains(event.target as Node)) setIsPaymentFilterOpen(false);
    };
    if (isDatePickerOpen || isPaymentFilterOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isDatePickerOpen, isPaymentFilterOpen]);

  const getDateLabel = () => dateRange.start && dateRange.end ? `${dateRange.start.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })} - ${dateRange.end.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}` : 'Все даты';
  const getPaymentLabel = () => {
    switch (paymentFilter) { case 'paid': return 'Оплачено'; case 'partially': return 'Частично'; case 'pending': return 'Ожидает'; default: return 'Статус оплаты'; }
  };

  // --- Handlers ---
  const handleCreateNew = () => {
    setSelectedRental(null);
    setPageView('form');
  };

  const handleRowClick = (item: RentalItem) => {
    setSelectedRental(item);
    setPageView('form');
  };

  const handleSaveRental = async (data: RentalItem) => {
    try {
      await db.rentals.save(data, currentCompany.id);
      await fetchRentals();
      setPageView('list');
      setSelectedRental(null);
    } catch (err) {
      console.error('Save error:', err);
      alert('Ошибка при сохранении: ' + (err as any).message);
    }
  };

  const handleDeleteRental = async (id: string) => {
    if (!confirm('Вы уверены, что хотите удалить эту аренду?')) return;
    try {
      await db.rentals.delete(id);
      await fetchRentals();
      setPageView('list');
      setSelectedRental(null);
      setSelectedIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
    } catch (err) {
      console.error('Delete error:', err);
      alert('Ошибка при удалении: ' + (err as any).message);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (window.confirm(`Вы уверены, что хотите удалить выбранные аренды (${selectedIds.size})?`)) {
      try {
        await db.rentals.deleteBulk(Array.from(selectedIds));
        await fetchRentals();
        setSelectedIds(new Set());
      } catch (err) {
        alert('Ошибка при массовом удалении: ' + (err as any).message);
      }
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(filteredData.map(r => r.id)));
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

  if (pageView === 'form') {
    return (
      <RentalForm
        initialData={selectedRental}
        isCars={currentCompany.type === 'cars'}
        onSave={handleSaveRental}
        onCancel={() => { setPageView('list'); setSelectedRental(null); }}
        onDelete={handleDeleteRental}
        onNavigateToClient={onNavigateToClient}
        onNavigateToVehicle={onNavigateToVehicle}
        user={user}
        currentCompany={currentCompany}
        onRefresh={fetchRentals}
      />
    );
  }

  const hasDateRange = !!(dateRange.start && dateRange.end);

  return (
    <div className="flex flex-col h-full">
      {/* Static Header Section (Tabs + Filters) */}
      <div className="flex-shrink-0 bg-slate-50 z-20">
        <div className="bg-white border-b border-slate-200 px-8 shadow-sm">
          <div className="flex items-center gap-6 overflow-x-auto hide-scrollbar">
            {tabs.map((tab) => {
              const count = getTabCount(tab.id);
              return (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`py-4 text-[14px] font-medium border-b-2 transition-all duration-200 whitespace-nowrap outline-none flex items-center gap-2 ${activeTab === tab.id ? 'border-neutral-900 text-neutral-900' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}>
                  {tab.label}
                  {count > 0 && <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold leading-none ${activeTab === tab.id ? 'bg-neutral-100 text-neutral-900' : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200'}`}>{count}</span>}
                </button>
              );
            })}
          </div>
        </div>
        <div className="px-8 py-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Search className="h-4 w-4 text-slate-400 group-focus-within:text-neutral-500 transition-colors" /></div>
              <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="block w-64 pl-10 pr-3 py-2 border border-slate-200 rounded-lg leading-5 bg-white placeholder-slate-400 focus:outline-none focus:placeholder-slate-300 focus:border-neutral-500 focus:ring-1 focus:ring-neutral-500 sm:text-sm transition-all" placeholder="Поиск по таблице..." />
            </div>
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
            <div className="relative" ref={paymentFilterRef}>
              <button onClick={() => setIsPaymentFilterOpen(!isPaymentFilterOpen)} className={`flex items-center gap-2 px-3 py-2 border rounded-lg text-sm font-medium transition-colors ${isPaymentFilterOpen || paymentFilter !== 'all' ? 'bg-slate-50 border-slate-300 text-slate-800' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-800'}`}><CreditCard className="w-4 h-4" /><span>{getPaymentLabel()}</span></button>
              {isPaymentFilterOpen && (
                <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-slate-200 z-50 animate-in fade-in zoom-in-95 duration-100 overflow-hidden"><div className="p-1">{[{ id: 'paid', label: 'Оплачено', icon: Check, color: 'text-emerald-600' }, { id: 'partially', label: 'Частично', icon: Hourglass, color: 'text-orange-600' }, { id: 'pending', label: 'Ожидает', icon: AlertCircle, color: 'text-slate-500' }].map((opt) => (<button key={opt.id} onClick={() => { if (paymentFilter === opt.id) { setPaymentFilter('all'); } else { setPaymentFilter(opt.id as any); } setIsPaymentFilterOpen(false); }} className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors ${paymentFilter === opt.id ? 'bg-neutral-50 text-neutral-900 font-medium' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}>{opt.icon && <opt.icon className={`w-4 h-4 ${opt.color}`} />}{!opt.icon && <span className="w-4 h-4 block"></span>}{opt.label}</button>))}</div></div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4">
            {selectedIds.size > 0 && (
              <button onClick={handleBulkDelete} className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm">
                <Trash2 className="w-4 h-4" />
                <span>Удалить ({selectedIds.size})</span>
              </button>
            )}
            <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200">
              <button onClick={() => setViewMode('table')} className={`p-1.5 rounded-md transition-all ${viewMode === 'table' ? 'bg-white shadow-sm text-neutral-900' : 'text-slate-500 hover:text-slate-700'}`}><LayoutList className="w-4 h-4" /></button>
              <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm text-neutral-900' : 'text-slate-500 hover:text-slate-700'}`}><LayoutGrid className="w-4 h-4" /></button>
            </div>
            <button onClick={handleCreateNew} className="bg-neutral-900 hover:bg-neutral-800 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm shadow-neutral-200">Новая аренда</button>
          </div>
        </div>
      </div>

      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-auto px-8 pb-4 w-full animate-in fade-in slide-in-from-bottom-2 duration-300">
        {hasData ? (
          viewMode === 'table' ? (
            <RentalsTable
              data={filteredData}
              isCars={currentCompany.type === 'cars'}
              onRowClick={handleRowClick}
              selectedIds={selectedIds}
              onSelectAll={handleSelectAll}
              onSelectOne={handleSelectOne}
              onDelete={handleDeleteRental}
            />
          ) : (
            <RentalsGrid data={filteredData} onCardClick={handleRowClick} />
          )
        ) : (
          <EmptyState activeTab={activeTab} />
        )}
      </div>
    </div>
  );
};

// ... (EmptyState remains the same) ...
const EmptyState: React.FC<{ activeTab: TabId }> = ({ activeTab }) => {
  const currentTab = tabs.find(t => t.id === activeTab);
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center bg-white rounded-xl border border-slate-200 border-dashed shadow-sm mt-4">
      <div className="w-12 h-12 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center mb-3"><Search className="w-6 h-6" /></div>
      <h3 className="text-sm font-medium text-slate-900">Список пуст</h3>
      <p className="text-sm text-slate-500 mt-1 max-w-xs mx-auto">{activeTab === 'all' ? 'Записей не найдено. Измените параметры поиска.' : `В разделе «${currentTab?.label}» пока нет записей.`}</p>
    </div>
  );
};

// --- Updated Grid Component ---

export const RentalsGrid: React.FC<{ data: RentalItem[], className?: string, onCardClick?: (item: RentalItem) => void }> = ({ data, className, onCardClick }) => {

  // Helpers for card styling
  const getCardHeaderStyle = (status: string) => {
    switch (status) {
      case 'incoming': return 'bg-neutral-900';
      case 'booked': return 'bg-indigo-700';
      case 'rented': return 'bg-emerald-700';
      case 'completed': return 'bg-slate-600';
      case 'overdue': return 'bg-red-700';
      case 'emergency': return 'bg-orange-700';
      case 'cancelled': return 'bg-slate-500';
      case 'archive': return 'bg-slate-400';
      default: return 'bg-neutral-900';
    }
  };

  const getStatusTextColor = (status: string) => {
    switch (status) {
      case 'incoming': return 'text-neutral-900';
      case 'booked': return 'text-indigo-700';
      case 'rented': return 'text-emerald-700';
      case 'completed': return 'text-slate-600';
      case 'overdue': return 'text-red-700';
      case 'emergency': return 'text-orange-700';
      case 'cancelled': return 'text-slate-500';
      default: return 'text-neutral-900';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'incoming': return 'Входящая';
      case 'booked': return 'Забронировано';
      case 'rented': return 'В аренде';
      case 'completed': return 'Завершено';
      case 'overdue': return 'Просрочено';
      case 'emergency': return 'ЧП';
      case 'cancelled': return 'Отменено';
      case 'archive': return 'Архив';
      default: return status;
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const gridClass = className || "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6";

  return (
    <div className={gridClass}>
      {data.map(item => {
        const headerColorClass = getCardHeaderStyle(item.status);
        const statusTextColor = getStatusTextColor(item.status);

        return (
          <div
            key={item.id}
            onClick={() => onCardClick && onCardClick(item)}
            className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 border border-slate-200 group flex flex-col cursor-pointer"
          >
            {/* Colored Header */}
            <div className={`${headerColorClass} p-5 text-white flex flex-col gap-4`}>
              {/* Top Row: Status & ID */}
              <div className="flex justify-between items-center">
                <span className={`bg-white ${statusTextColor} px-3 py-1.5 rounded-full text-xs font-bold shadow-sm`}>
                  {getStatusText(item.status)}
                </span>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); copyToClipboard(item.id); }}
                  className="flex items-center gap-2 text-white/90 hover:text-white transition-colors"
                  title="Скопировать номер"
                >
                  <Copy className="w-4 h-4" />
                  <span className="text-sm font-medium">{item.id}</span>
                </button>
              </div>

              {/* Dates Row */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white/10 rounded-xl p-3 backdrop-blur-sm border border-white/10">
                  <span className="text-[11px] text-white/80 block mb-1">Дата начала</span>
                  <span className="text-[14px] font-semibold block whitespace-nowrap">{item.period.start}</span>
                </div>
                <div className="bg-white/10 rounded-xl p-3 backdrop-blur-sm border border-white/10">
                  <span className="text-[11px] text-white/80 block mb-1">Дата конца</span>
                  <span className="text-[14px] font-semibold block whitespace-nowrap">{item.period.end}</span>
                </div>
              </div>

              {/* Contact Block */}
              <div className="bg-white/10 rounded-xl p-3 backdrop-blur-sm border border-white/10 flex items-center gap-3">
                <img
                  src={item.client.avatarUrl}
                  className="w-10 h-10 rounded-full border border-white/20 object-cover"
                  alt={item.client.name}
                />
                <div className="min-w-0">
                  <p className="font-semibold text-sm truncate text-white">{item.client.name}</p>
                  <p className="text-xs text-white/80 font-medium truncate">{item.client.phone}</p>
                </div>
              </div>
            </div>

            {/* Body - White Area */}
            <div className="p-5 flex-1 bg-white">
              <div className="flex justify-between items-center gap-3">
                {/* Left Group: Vehicle Info */}
                <div className="flex gap-4 overflow-hidden h-14">
                  {item.vehicle.image ? (
                    <img
                      src={item.vehicle.image}
                      alt={item.vehicle.name}
                      className="w-14 h-14 rounded-xl object-cover flex-shrink-0 border border-slate-200 bg-slate-100"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        e.currentTarget.nextElementSibling?.classList.remove('hidden');
                      }}
                    />
                  ) : null}
                  <div className={`w-14 h-14 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center flex-shrink-0 ${item.vehicle.image ? 'hidden' : ''}`}>
                    <Camera className="w-6 h-6 text-slate-300" />
                  </div>
                  <div className="flex flex-col justify-between min-w-0 py-0.5">
                    <h4 className="font-bold text-slate-900 text-[15px] truncate leading-tight">{item.vehicle.name}</h4>
                    <div className="flex">
                      <span className={`${BADGE_BASE_CLASS} bg-slate-100 text-slate-600 border-slate-200 font-mono`}>
                        {item.vehicle.plate}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right Group: Price & Payment Badge */}
                <div className="text-right flex-shrink-0 flex flex-col justify-between h-14 items-end py-0.5">
                  <div className="text-[17px] font-bold text-slate-900 tracking-tight leading-none">{item.amount}</div>
                  <div className="flex justify-end">
                    {getPaymentBadge(item.payment)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  )
}

// --- Table Component ---
export const RentalsTable: React.FC<{
  data: RentalItem[],
  isCars: boolean,
  className?: string,
  onRowClick?: (item: RentalItem) => void,
  selectedIds?: Set<string>,
  onSelectAll?: (checked: boolean) => void,
  onSelectOne?: (id: string) => void,
  onDelete?: (id: string) => void
}> = ({ data, isCars, className, onRowClick, selectedIds, onSelectAll, onSelectOne, onDelete }) => {
  const [columns, setColumns] = useState<ColumnConfig[]>([
    { id: 'checkbox', label: '', visible: true, width: 'w-12' },
    { id: 'id', label: 'Номер', visible: true, width: 'w-16' },
    { id: 'vehicle', label: isCars ? 'Автомобиль' : 'Мопед', visible: true, width: 'min-w-[200px]' },
    { id: 'status', label: 'Статус', visible: true, width: 'min-w-[120px]' },
    { id: 'client', label: 'Клиент', visible: true, width: 'min-w-[220px]' },
    { id: 'period', label: 'Период', visible: true, width: 'min-w-[160px]' },
    { id: 'payment', label: 'Оплата', visible: true, width: 'min-w-[100px]' },
    { id: 'amount', label: 'Сумма', visible: true, width: 'min-w-[100px]' },
    { id: 'debt', label: 'Долг', visible: true, width: 'min-w-[100px]' },
    { id: 'fine', label: 'Штраф', visible: true, width: 'min-w-[100px]' },
    { id: 'deposit', label: 'Залог', visible: true, width: 'min-w-[100px]' },
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

  const outerClass = className || "bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col";
  const innerClass = className ? "overflow-x-auto w-full" : "overflow-x-auto w-full rounded-xl";

  return (
    <>
      <div className={outerClass}>
        {/* Table Container */}
        <div className={innerClass}>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                {columns.map((col) => {
                  if (!col.visible) return null;

                  // Sticky Header Logic: Use sticky top-0. z-10 ensures it stays above row content.
                  const stickyClass = "sticky top-0 z-10 bg-slate-50 shadow-[0_1px_0_0_#e2e8f0]";

                  if (col.id === 'actions') {
                    return (
                      <th key={col.id} className={`px-4 py-3 w-12 text-center align-middle ${stickyClass}`}>
                        <button type="button" ref={settingsButtonRef} onClick={handleSettingsClick} className={`p-1.5 rounded-md transition-colors ${settingsOpen ? 'bg-neutral-100 text-neutral-600' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'}`}><Settings className="w-4 h-4" /></button>
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
                  if (['amount', 'debt', 'fine', 'deposit'].includes(col.id as string)) alignClass = 'text-right';
                  return <th key={col.id as string} className={`px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap align-middle ${col.width || ''} ${alignClass} ${stickyClass}`}>{col.label}</th>;
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.map((item) => (
                <tr
                  key={item.id}
                  onClick={() => onRowClick && onRowClick(item)}
                  className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                >
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
                        {onDelete && (
                          <div className="flex items-center justify-center gap-2">
                            <button onClick={() => onDelete(item.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-all"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        )}
                      </td>
                    );
                    if (col.id === 'id') return <td key={`${item.id}-id`} className="px-4 py-3 align-middle"><span className="text-[13px] font-semibold text-slate-700">{item.id}</span></td>;
                    if (col.id === 'vehicle') return <td key={`${item.id}-vehicle`} className="px-4 py-3 align-middle"><div className="flex items-center gap-3"><div className="w-9 h-9 flex-shrink-0 relative">{item.vehicle.image ? (<img src={item.vehicle.image} alt={item.vehicle.name} className="w-9 h-9 rounded-lg object-cover bg-slate-100 border border-slate-200 block" onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.parentElement?.querySelector('.placeholder')?.classList.remove('hidden'); }} />) : null}<div className={`placeholder absolute inset-0 w-9 h-9 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center ${item.vehicle.image ? 'hidden' : ''}`}><Camera className="w-4 h-4 text-slate-300" /></div></div><div className="flex flex-col min-w-0"><span className="font-semibold text-slate-800 text-[13px] leading-tight truncate">{item.vehicle.name}</span><span className="text-[11px] font-medium text-slate-500 font-mono mt-0.5">{item.vehicle.plate}</span></div></div></td>;
                    if (col.id === 'client') return <td key={`${item.id}-client`} className="px-4 py-3 align-middle"><div className="flex items-center gap-3"><img src={item.client.avatarUrl} alt="avatar" className="w-9 h-9 rounded-full object-cover bg-slate-100 border border-slate-200 flex-shrink-0" /><div className="flex flex-col min-w-0"><span className="font-semibold text-slate-900 text-[13px] leading-tight truncate">{item.client.name}</span><span className="text-[11px] text-slate-500 mt-0.5">{item.client.phone}</span></div></div></td>;
                    if (col.id === 'period') return <td key={`${item.id}-period`} className="px-4 py-3 align-middle"><div className="flex flex-col gap-1.5 font-mono text-[11px]"><span className="font-medium text-slate-700 whitespace-nowrap leading-none flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0"></span>{item.period.start}</span><span className="font-medium text-slate-700 whitespace-nowrap leading-none flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0"></span>{item.period.end}</span></div></td>;
                    if (col.id === 'status') return <td key={`${item.id}-status`} className="px-4 py-3 align-middle text-left">{getStatusBadge(item.status)}</td>;
                    if (col.id === 'payment') return <td key={`${item.id}-payment`} className="px-4 py-3 align-middle text-left">{getPaymentBadge(item.payment)}</td>;
                    if (['amount', 'debt', 'fine', 'deposit'].includes(col.id as string)) {
                      const val = item[col.id as keyof RentalItem];
                      const isDebt = col.id === 'debt' && val !== '0 ₸'; const isFine = col.id === 'fine' && val !== '0 ₸';
                      return <td key={`${item.id}-${col.id}`} className="px-4 py-3 align-middle text-right"><span className={`text-[13px] whitespace-nowrap font-medium ${isDebt || isFine ? 'text-red-600' : 'text-slate-600'}`}>{val as string}</span></td>
                    }
                    return <td key={`${item.id}-${col.id}`} className="px-4 py-3 align-middle text-[13px] text-slate-600 whitespace-nowrap">{String(item[col.id as keyof RentalItem] || '')}</td>;
                  })}
                </tr>
              ))}
              <tr className="h-2"></tr>
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
