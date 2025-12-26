import { ClientItem } from './types';

// Client Data
export const initialCarClients: ClientItem[] = [
  {
    id: 'c1',
    avatar: 'https://ui-avatars.com/api/?name=Alexander+Ivanov&background=e2e8f0&color=475569',
    name: 'Александр Иванов',
    phone: '+7 (777) 123-45-67',
    emergencyContacts: [{
        name: 'Светлана Иванова',
        phone: '+7 (701) 111-22-33',
        avatar: 'https://ui-avatars.com/api/?name=Svetlana+Ivanova&background=fce7f3&color=db2777'
    }],
    documents: [{
        type: 'id_card',
        number: '123456789',
        iin: '900101300456',
        images: ['https://images.unsplash.com/photo-1549923746-c502d488b3ea?auto=format&fit=crop&q=80&w=600&h=400'],
        dateOfBirth: '1990-01-01',
        issueDate: '2020-05-15',
        expiryDate: '2030-05-15',
        issuedBy: 'МВД РК'
    }],
    rating: 'trusted',
    rentalCount: 0, 
    totalAmount: '1 250 000 ₸',
    paidAmount: '1 250 000 ₸',
    debtAmount: '0 ₸',
    overdueCount: 0,
    createdAt: '10.01.2023',
    channel: 'instagram'
  },
  {
    id: 'c2',
    avatar: 'https://ui-avatars.com/api/?name=Maria+Smirnova&background=fce7f3&color=db2777',
    name: 'Мария Смирнова',
    phone: '+7 (777) 987-65-43',
    emergencyContacts: [{
        name: 'Олег Смирнов',
        phone: '+7 (705) 333-44-55',
        avatar: 'https://ui-avatars.com/api/?name=Oleg+Smirnov&background=dbeafe&color=2563eb'
    }],
    documents: [{
        type: 'passport',
        number: '987654321',
        iin: '950515400123',
        images: []
    }],
    rating: 'caution',
    rentalCount: 0,
    totalAmount: '270 000 ₸',
    paidAmount: '200 000 ₸',
    debtAmount: '70 000 ₸',
    overdueCount: 1,
    overdueAmount: '70 000 ₸',
    createdAt: '15.03.2023',
    channel: 'whatsapp'
  },
];

export const initialScootClients: ClientItem[] = [
  {
    id: 's1',
    avatar: 'https://ui-avatars.com/api/?name=Alina+Petrova&background=fce7f3&color=db2777',
    name: 'Алина Петрова',
    phone: '+7 (701) 987-65-43',
    emergencyContacts: [{
        name: 'Мама',
        phone: '+7 (701) 000-00-00',
        avatar: 'https://ui-avatars.com/api/?name=Mama&background=fef3c7&color=d97706'
    }],
    documents: [{
        type: 'id_card',
        number: '111222333',
        iin: '020505400111',
        images: []
    }],
    rating: 'trusted',
    rentalCount: 0,
    totalAmount: '12 500 ₸',
    paidAmount: '12 500 ₸',
    debtAmount: '0 ₸',
    overdueCount: 0,
    createdAt: '01.09.2023',
    channel: 'instagram'
  },
];

// Vehicle Interfaces for Data
export interface Tariff {
    id: string;
    name: string;
    period: string;
    days: string;
    price: string;
    isAllDays?: boolean;
    weekDays?: string[];
  }
  
export interface VehicleItem {
    id: string;
    image: string;
    name: string;
    plate: string;
    status: 'available' | 'rented' | 'maintenance';
    techPassport: string;
    vin: string;
    color: string;
    mileage: string;
    condition: 'new' | 'good' | 'broken';
    insuranceDate: string;
    inspectionDate: string;
    tariffs: Tariff[];
  }

// Vehicle Data
export const initialCarVehicles: VehicleItem[] = [
    {
      id: 'v1',
      image: 'https://images.unsplash.com/photo-1609521263047-f8f205293f24?auto=format&fit=crop&q=80&w=300&h=300',
      name: 'Kia K5',
      plate: '777 ABC 02',
      status: 'rented',
      techPassport: 'KZ 12345678',
      vin: 'KNA1234567890ABC',
      color: 'Серый металлик',
      mileage: '45 000 км',
      condition: 'good',
      insuranceDate: '12.05.2024',
      inspectionDate: '10.05.2024',
      tariffs: [
          { id: 't1', name: 'Сутки', period: 'День (1 д.)', days: '1', price: '25 000 ₸', isAllDays: true, weekDays: [] },
          { id: 't2', name: 'Неделя', period: 'Неделя (7 д.)', days: '7', price: '150 000 ₸', isAllDays: true, weekDays: [] },
      ]
    },
    {
      id: 'v2',
      image: 'https://images.unsplash.com/photo-1621007947382-bb3c3968e3bb?auto=format&fit=crop&q=80&w=300&h=300',
      name: 'Toyota Camry 70',
      plate: '098 KZ 02',
      status: 'available',
      techPassport: 'KZ 87654321',
      vin: 'JT11234567890DEF',
      color: 'Белый перламутр',
      mileage: '78 500 км',
      condition: 'good',
      insuranceDate: '01.01.2025',
      inspectionDate: '15.12.2024',
      tariffs: [
          { id: 't1', name: 'Сутки', period: 'День (1 д.)', days: '1', price: '30 000 ₸', isAllDays: true },
      ]
    },
    {
      id: 'v3',
      image: 'https://images.unsplash.com/photo-1619682817481-e994891cd1f5?auto=format&fit=crop&q=80&w=300&h=300',
      name: 'Hyundai Elantra',
      plate: '123 KZA 02',
      status: 'maintenance',
      techPassport: 'KZ 55443322',
      vin: 'KMH1234567890GHI',
      color: 'Черный',
      mileage: '12 300 км',
      condition: 'broken',
      insuranceDate: '20.08.2024',
      inspectionDate: '19.08.2024',
      tariffs: []
    }
  ];
  
  export const initialScootVehicles: VehicleItem[] = [
    {
      id: 's1',
      image: 'https://images.unsplash.com/photo-1595166668700-141680d2204c?auto=format&fit=crop&q=80&w=300&h=300',
      name: 'Ninebot Max G30',
      plate: '#405',
      status: 'rented',
      techPassport: 'N/A',
      vin: 'SN:123456789',
      color: 'Черный',
      mileage: '1 200 км',
      condition: 'good',
      insuranceDate: '-',
      inspectionDate: '01.10.2023',
      tariffs: [
          { id: 't1', name: 'Минутный', period: 'Минута', days: '-', price: '45 ₸', isAllDays: true },
      ]
    },
    {
      id: 's2',
      image: 'https://images.unsplash.com/photo-1591963964952-b4c6e987c65c?auto=format&fit=crop&q=80&w=300&h=300',
      name: 'Xiaomi Pro 2',
      plate: '#112',
      status: 'available',
      techPassport: 'N/A',
      vin: 'SN:987654321',
      color: 'Серый',
      mileage: '450 км',
      condition: 'new',
      insuranceDate: '-',
      inspectionDate: '15.10.2023',
      tariffs: []
    }
  ];