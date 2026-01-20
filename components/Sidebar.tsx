import React, { useState } from 'react';
import {
  Wallet,
  Clipboard,
  Warehouse,
  Users,
  Settings,
  ChevronLeft,
  Menu,
  ChevronsUpDown,
  Car,
  Bike,
  Check,
  LayoutDashboard,
  Zap
} from 'lucide-react';
import { NavItem, SidebarProps } from '../types';

const navItems: NavItem[] = [
  { id: 'dashboard', label: 'Главная', icon: LayoutDashboard },
  { id: 'finance', label: 'Финансы', icon: Wallet },
  { id: 'rentals', label: 'Аренды', icon: Clipboard },
  { id: 'warehouse', label: 'Склад', icon: Warehouse },
  { id: 'clients', label: 'Клиенты', icon: Users },
  { id: 'settings', label: 'Настройки', icon: Settings },
];

export const Sidebar: React.FC<SidebarProps> = ({
  isCollapsed,
  toggleSidebar,
  activePage,
  onNavigate,
  companies,
  selectedCompany,
  onSelectCompany,
  user
}) => {
  const [isCompanyMenuOpen, setIsCompanyMenuOpen] = useState(false);

  const canSwitchCompanies = user?.role === 'admin' || companies.length > 1;

  const getCompanyIcon = (type: string) => {
    switch (type) {
      case 'cars': return Car;
      case 'moto': return Zap;
      default: return Bike;
    }
  };

  const CompanyIcon = getCompanyIcon(selectedCompany.type);

  return (
    <aside
      className={`
        h-screen bg-neutral-950 text-white flex flex-col 
        transition-all duration-300 ease-in-out shadow-xl z-20 border-r border-white/5
        ${isCollapsed ? 'w-20' : 'w-72'}
      `}
    >
      {/* Header: Logo & Toggle */}
      <div className={`
        flex items-center h-20 flex-shrink-0 border-b border-white/10
        ${isCollapsed ? 'justify-center' : 'justify-between px-6'}
      `}>
        {!isCollapsed && (
          <div className="flex items-center overflow-hidden animate-in fade-in duration-300">
            <span className="font-bold text-2xl tracking-tight whitespace-nowrap text-white">Dream Rent</span>
          </div>
        )}

        <button
          onClick={toggleSidebar}
          className="p-2 rounded-lg hover:bg-neutral-800 transition-colors text-neutral-500 hover:text-neutral-300"
          aria-label={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {isCollapsed ? <Menu className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 py-6 space-y-1 overflow-y-auto overflow-x-hidden">
        {navItems
          .filter(item => {
            if (item.id === 'finance') return user?.role === 'admin';
            return true;
          })
          .map((item) => {
            const isActive = activePage === item.id;
            return (
              <div key={item.id} className="relative px-3">
                {/* Active Indicator Line */}
                {isActive && (
                  <div
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white rounded-r-full shadow-[0_0_8px_rgba(255,255,255,0.4)] transition-all duration-300"
                  />
                )}

                <button
                  onClick={() => onNavigate(item.id)}
                  className={`
                  w-full flex items-center p-3 rounded-xl transition-all duration-200 group
                  ${isActive
                      ? 'bg-neutral-900 text-white'
                      : 'text-neutral-500 hover:bg-neutral-900/50 hover:text-neutral-300'
                    }
                  ${isCollapsed ? 'justify-center' : 'justify-start'}
                `}
                  title={isCollapsed ? item.label : undefined}
                >
                  <item.icon className={`
                  w-5 h-5 flex-shrink-0 transition-colors 
                  ${isCollapsed ? '' : 'mr-3.5'} 
                  ${isActive ? 'text-white' : 'text-neutral-500 group-hover:text-neutral-300'}
                `} />

                  {!isCollapsed && (
                    <span className={`whitespace-nowrap overflow-hidden animate-in fade-in duration-300 text-[14px] ${isActive ? 'font-medium' : 'font-normal'}`}>
                      {item.label}
                    </span>
                  )}

                  {isCollapsed && (
                    <div className="absolute left-14 ml-2 bg-neutral-900 text-white text-sm px-3 py-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-xl border border-neutral-800 font-medium">
                      {item.label}
                    </div>
                  )}
                </button>
              </div>
            );
          })}
      </nav>

      {/* Company Switcher Area */}
      <div className={`border-t border-white/10 relative flex-shrink-0 ${isCollapsed ? 'p-3' : 'p-4'}`}>

        {/* Company Menu Dropdown */}
        {isCompanyMenuOpen && canSwitchCompanies && (
          <div className={`
            absolute bottom-full left-4 right-4 mb-2 bg-neutral-900 rounded-xl shadow-2xl border border-neutral-800 overflow-hidden z-50
            ${isCollapsed ? 'w-60 left-2' : ''}
          `}>
            {companies.map((company) => {
              const Icon = getCompanyIcon(company.type);
              return (
                <button
                  key={company.id}
                  onClick={() => {
                    onSelectCompany(company);
                    setIsCompanyMenuOpen(false);
                  }}
                  className={`
                    w-full flex items-center p-3 hover:bg-neutral-800 transition-colors gap-3
                    ${selectedCompany.id === company.id ? 'bg-neutral-800/50' : ''}
                  `}
                >
                  <div className={`p-2 rounded-lg ${selectedCompany.id === company.id ? 'bg-white text-black' : 'bg-neutral-800 text-neutral-400'}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col items-start flex-1 min-w-0">
                    <span className="text-[14px] font-medium text-white truncate w-full text-left">{company.name}</span>
                    <span className="text-[12px] text-neutral-400 truncate w-full text-left">{company.email}</span>
                  </div>
                  {selectedCompany.id === company.id && <Check className="w-4 h-4 text-white" />}
                </button>
              );
            })}
          </div>
        )}

        {/* Selected Company Display */}
        <button
          onClick={() => canSwitchCompanies && setIsCompanyMenuOpen(!isCompanyMenuOpen)}
          className={`
            w-full flex items-center rounded-xl p-2 
            transition-colors outline-none
            ${canSwitchCompanies ? 'hover:bg-neutral-900 cursor-pointer' : 'cursor-default'}
            ${isCollapsed ? 'justify-center' : 'justify-between'}
          `}
        >
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="bg-neutral-900 p-2 rounded-lg flex-shrink-0 text-white">
              <CompanyIcon className="w-5 h-5" />
            </div>

            {!isCollapsed && (
              <div className="flex flex-col items-start overflow-hidden animate-in fade-in duration-300">
                <span className="text-[13px] font-medium text-white truncate max-w-[120px]">{selectedCompany.name}</span>
                <span className="text-[11px] text-neutral-500 truncate max-w-[120px]">{selectedCompany.email}</span>
              </div>
            )}
          </div>

          {!isCollapsed && canSwitchCompanies && (
            <div className="text-neutral-600 group-hover:text-white transition-colors">
              <ChevronsUpDown className="w-4 h-4" />
            </div>
          )}
        </button>
      </div>
    </aside>
  );
};