import { LucideIcon } from 'lucide-react';

export type PageId = 'dashboard' | 'finance' | 'rentals' | 'warehouse' | 'clients' | 'settings';

export interface NavItem {
  id: PageId;
  label: string;
  icon: LucideIcon;
}

export interface User {
  name: string;
  email: string;
  avatarUrl: string;
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
    status: 'incoming' | 'rented' | 'completed' | 'cancelled' | 'overdue';
  };
  createdAt: string;
  channel: 'website' | 'whatsapp' | 'telegram' | 'instagram' | 'phone' | 'recommendation' | 'old_client';
}