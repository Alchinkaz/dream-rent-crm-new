import React, { useState, useRef, useEffect } from 'react';
import { User as UserIcon, LogOut, Settings } from 'lucide-react';
import { User as UserType } from '../types';

interface NavbarProps {
  title: string;
  onLogout?: () => void;
  user: UserType | null;
}

export const Navbar: React.FC<NavbarProps> = ({ title, onLogout, user }) => {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Fallback user if none provided (for safety)
  const displayUser = user || {
    name: 'Admin',
    email: 'info@dreamrent.kz',
    avatarUrl: 'https://ui-avatars.com/api/?name=Admin&background=0a0a0a&color=fff&bold=true'
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-8 sticky top-0 z-30">
      {/* Left side: Page Title */}
      <div className="flex items-center w-1/3">
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">{title}</h1>
      </div>

      {/* Right side (User Profile) */}
      <div className="flex items-center gap-4">
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className="flex items-center justify-center p-1 rounded-full hover:bg-slate-100 transition-colors border border-transparent hover:border-slate-200 outline-none focus:ring-2 focus:ring-neutral-100"
          >
            <img
              src={displayUser.avatarUrl}
              alt={displayUser.name}
              className="w-10 h-10 rounded-full object-cover border border-slate-200 shadow-sm"
            />
          </button>

          {/* User Dropdown Menu */}
          {isUserMenuOpen && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-100 z-50 animate-in fade-in zoom-in-95 duration-100 overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/80 flex items-center gap-3">
                <img
                  src={displayUser.avatarUrl}
                  alt={displayUser.name}
                  className="w-9 h-9 rounded-full object-cover border border-slate-200 shadow-sm flex-shrink-0"
                />
                <div className="flex flex-col min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">{displayUser.name}</p>
                  <p className="text-xs text-slate-500 truncate font-medium" title={displayUser.email}>{displayUser.email}</p>
                </div>
              </div>

              <div className="p-1.5">
                <a href="#account" className="flex items-center gap-2.5 px-3 py-2 text-[13px] font-medium text-slate-600 hover:bg-slate-50 hover:text-neutral-900 rounded-lg transition-colors">
                  <UserIcon className="w-4 h-4" />
                  Аккаунт
                </a>
                <a href="#settings" className="flex items-center gap-2.5 px-3 py-2 text-[13px] font-medium text-slate-600 hover:bg-slate-50 hover:text-neutral-900 rounded-lg transition-colors">
                  <Settings className="w-4 h-4" />
                  Настройки
                </a>
              </div>

              <div className="border-t border-slate-100 p-1.5">
                <button
                  onClick={onLogout}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium"
                >
                  <LogOut className="w-4 h-4" />
                  Выйти
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};