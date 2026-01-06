import { LucideIcon } from 'lucide-react';

export type PageId = 'dashboard' | 'finance' | 'rentals' | 'warehouse' | 'clients' | 'settings';

export interface NavItem {
  id: PageId;
  label: string;
  icon: LucideIcon;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl: string;
  role: 'admin' | 'manager';
  companyId?: string | null;
}

export interface Company {
  id: string;
  name: string;
  email: string;
  type: 'cars' | 'scoots';
}

export interface SidebarProps {
  isCollapsed: boolean;
  toggleSidebar: () => void;
  activePage: PageId;
  onNavigate: (page: PageId) => void;
  // New props for company management
  companies: Company[];
  selectedCompany: Company;
  onSelectCompany: (company: Company) => void;
  user: User | null;
}

export interface PageProps {
  currentCompany: Company;
  // Callback for navigation between pages (e.g. Rentals -> Client Details)
  // Updated to allow passing the ID of the rental we are navigating FROM
  onNavigateToClient?: (clientId: string, fromRentalId?: string) => void;
  // Callback for navigation to vehicle details
  onNavigateToVehicle?: (vehicleId: string, fromRentalId?: string) => void;

  // Prop to handle incoming navigation (e.g. opening specific client)
  initialSelectedClientId?: string | null;
  // Prop to handle incoming navigation (e.g. opening specific vehicle)
  initialSelectedVehicleId?: string | null;

  // Prop to handle restoring specific rental state
  initialRentalId?: string | null;
  // Handler to return to the previous page (global navigation)
  onBack?: () => void;
}

// Client Interfaces
export interface ClientDocument {
  type: 'id_card' | 'passport';
  number: string;
  iin: string;
  images: string[];
  dateOfBirth?: string;
  issueDate?: string;
  expiryDate?: string;
  issuedBy?: string;
}

export interface ClientContact {
  name: string;
  phone: string;
  avatar: string;
}

export interface ClientItem {
  id: string;
  avatar: string;
  name: string;
  phone: string;

  emergencyContacts: ClientContact[];
  documents: ClientDocument[];

  rating: 'trusted' | 'caution' | 'blacklist';
  rentalCount: number;
  totalAmount: string;
  paidAmount: string;
  debtAmount: string;
  overdueCount: number;
  overdueAmount?: string;
  lastRental?: {
    id: string;
    date: string;
    status: 'incoming' | 'rented' | 'completed' | 'cancelled' | 'overdue' | 'booked' | 'emergency' | 'archive';
  };
  createdAt: string;
  channel: 'website' | 'whatsapp' | 'telegram' | 'instagram' | 'phone' | 'recommendation' | 'old_client';
}

// Vehicle Interfaces
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

// Rental Interfaces
export type RentalStatus = 'incoming' | 'rented' | 'completed' | 'cancelled' | 'overdue' | 'booked' | 'emergency' | 'archive';

export interface RentalItem {
  id: string;
  status: RentalStatus;
  vehicle: {
    name: string;
    plate: string;
    image: string;
  };
  client: {
    name: string;
    phone: string;
    avatarUrl: string;
  };
  period: {
    start: string;
    end: string;
  };
  amount: string;
  payment: 'paid' | 'partially' | 'pending';
  debt: string;
  fine: string;
  deposit: string;
  comment: string;
  tariffId?: string;
  clientId?: string;
  vehicleId?: string;
}