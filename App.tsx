import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Navbar } from './components/Navbar';
import { PageId, Company, User as UserType } from './types';
import { Dashboard } from './components/pages/Dashboard';
import { Finance } from './components/pages/Finance';
import { Rentals } from './components/pages/Rentals';
import { Warehouse } from './components/pages/Warehouse';
import { Clients } from './components/pages/Clients';
import { Settings } from './components/pages/Settings';
import { Login } from './components/pages/Login';

const companies: Company[] = [
  { id: 'cars', name: 'KazDream Cars', email: 'info@dreamrent.kz', type: 'cars' },
  { id: 'scoots', name: 'KazDream Scoots', email: 'info@dreamrent.kz', type: 'scoots' },
  { id: 'evmoto', name: 'KazDream EV moto', email: 'info@evmoto.kz', type: 'moto' },
];

const App: React.FC = () => {
  // Simple path parsing for initial state
  const getInitialState = () => {
    const path = typeof window !== 'undefined' ? window.location.pathname.split('/').filter(Boolean) : [];
    // Path structure: /companyId/pageId
    const initialCompany = companies.find(c => c.id === path[0]) || companies[0];
    const initialPage = (path[1] as PageId) || 'dashboard';

    // Check if initialPage is valid
    const validPages: PageId[] = ['dashboard', 'finance', 'rentals', 'warehouse', 'clients', 'settings'];
    const finalPage = validPages.includes(initialPage) ? initialPage : 'dashboard';

    return { initialCompany, finalPage };
  };

  const { initialCompany, finalPage } = getInitialState();

  const [user, setUser] = useState<UserType | null>(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('dreamrent_user') : null;
    return saved ? JSON.parse(saved) : null;
  });

  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return typeof window !== 'undefined' && localStorage.getItem('dreamrent_auth') === 'true';
  });

  const filteredCompanies = user?.companyId
    ? companies.filter(c => c.id === user.companyId)
    : companies;

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  // Set Dashboard as default (Main Page)
  const [activePage, setActivePage] = useState<PageId>(finalPage);
  const [selectedCompany, setSelectedCompany] = useState<Company>(() => {
    if (user?.role === 'manager' && user.companyId) {
      return companies.find(c => c.id === user.companyId) || companies[0];
    }
    return initialCompany;
  });

  // Effect to sync company when user changes (e.g. login)
  useEffect(() => {
    if (user?.role === 'manager' && user.companyId) {
      const company = companies.find(c => c.id === user.companyId);
      if (company && selectedCompany.id !== user.companyId) {
        setSelectedCompany(company);
      }
    }
  }, [user, selectedCompany]);

  // State for specific client navigation
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

  // State for specific vehicle navigation
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);

  // State to remember where we came from (e.g., Rentals) to support "Back" button
  const [returnPage, setReturnPage] = useState<PageId | null>(null);

  // State to remember which Rental we were viewing when we navigated to a client/vehicle
  const [returnRentalId, setReturnRentalId] = useState<string | null>(null);

  // Simulate URL routing update
  useEffect(() => {
    try {
      const path = `/${selectedCompany.id}/${activePage}`;
      // Check if history API is available and writable
      if (typeof window !== 'undefined' && window.history && window.history.replaceState) {
        window.history.replaceState(null, '', path);
      }
    } catch (e) {
      // Ignore security errors in sandboxed environments (e.g. iframes)
      console.warn('Navigation update failed (likely due to sandbox restrictions):', e);
    }
    document.title = `Dream Rent - ${selectedCompany.name} - ${activePage}`;
  }, [activePage, selectedCompany]);

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  const getPageTitle = (id: PageId): string => {
    switch (id) {
      case 'dashboard': return 'Главная';
      case 'finance': return 'Финансы';
      case 'rentals': return 'Аренды';
      case 'warehouse': return 'Склад';
      case 'clients': return 'Клиенты';
      case 'settings': return 'Настройки';
      default: return '';
    }
  };

  const handleNavigateToClient = (clientId: string, fromRentalId?: string) => {
    setReturnPage(activePage); // Remember we came from here (e.g., 'rentals')
    if (fromRentalId) {
      setReturnRentalId(fromRentalId);
    }
    setSelectedClientId(clientId);
    setActivePage('clients');
  };

  const handleNavigateToVehicle = (vehicleId: string, fromRentalId?: string) => {
    setReturnPage(activePage); // Remember we came from here (e.g., 'rentals')
    if (fromRentalId) {
      setReturnRentalId(fromRentalId);
    }
    setSelectedVehicleId(vehicleId);
    setActivePage('warehouse');
  };

  // Logic to return to the previous page if we navigated deeply
  const handleBackToPrevious = () => {
    if (returnPage) {
      setActivePage(returnPage);
      setReturnPage(null);
      setSelectedClientId(null);
      setSelectedVehicleId(null);
      // Note: We do NOT clear returnRentalId here,
      // because the Rentals component needs to consume it on mount.
      // It should handle the state restoration.
    } else {
      // Fallback: just clear selection
      setSelectedClientId(null);
      setSelectedVehicleId(null);
      setReturnRentalId(null);
    }
  };

  // Reset selected client/vehicle when navigating away via Sidebar
  const handlePageChange = (page: PageId) => {
    setActivePage(page);
    if (page !== 'clients') {
      setSelectedClientId(null);
    }
    if (page !== 'warehouse') {
      setSelectedVehicleId(null);
    }

    // Clear navigation history if manually changing pages
    setReturnPage(null);
    setReturnRentalId(null);
  };

  const handleLogin = (userData: UserType) => {
    setUser(userData);
    setIsAuthenticated(true);
    localStorage.setItem('dreamrent_auth', 'true');
    localStorage.setItem('dreamrent_user', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem('dreamrent_auth');
    localStorage.removeItem('dreamrent_user');
  };

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Sidebar */}
      <Sidebar
        isCollapsed={isSidebarCollapsed}
        toggleSidebar={toggleSidebar}
        activePage={activePage}
        onNavigate={handlePageChange}
        companies={filteredCompanies}
        selectedCompany={selectedCompany}
        onSelectCompany={setSelectedCompany}
        user={user}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Navbar title={getPageTitle(activePage)} onLogout={handleLogout} user={user} />

        {/* Changed from overflow-y-auto to overflow-hidden + relative to support internal scrolling pages */}
        <main className="flex-1 flex flex-col bg-slate-50 overflow-hidden relative">
          {/* 
            Adding key={selectedCompany.id} forces React to remount the component 
            when the company changes, ensuring distinct state and re-triggering animations.
          */}
          {activePage === 'dashboard' && <Dashboard key={selectedCompany.id} currentCompany={selectedCompany} user={user} />}
          {activePage === 'finance' && <Finance key={selectedCompany.id} currentCompany={selectedCompany} user={user} />}
          {activePage === 'rentals' && (
            <Rentals
              key={selectedCompany.id}
              currentCompany={selectedCompany}
              onNavigateToClient={handleNavigateToClient}
              onNavigateToVehicle={handleNavigateToVehicle}
              initialRentalId={returnRentalId} // Pass the ID to restore
              user={user}
            />
          )}
          {activePage === 'warehouse' && (
            <Warehouse
              key={selectedCompany.id}
              currentCompany={selectedCompany}
              initialSelectedVehicleId={selectedVehicleId}
              onBack={handleBackToPrevious}
              user={user}
            />
          )}
          {activePage === 'clients' && (
            <Clients
              key={selectedCompany.id}
              currentCompany={selectedCompany}
              initialSelectedClientId={selectedClientId}
              onBack={handleBackToPrevious}
              user={user}
            />
          )}
          {activePage === 'settings' && <Settings currentCompany={selectedCompany} user={user} />}
        </main>
      </div>
    </div>
  );
};

export default App;