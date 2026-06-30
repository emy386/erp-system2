/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useApp } from '../context/AppContext';
import { Menu, Search, User as UserIcon } from 'lucide-react';

interface HeaderProps {
  onMenuClick: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  const { currentUser } = useApp();

  return (
    <header 
      className="h-16 bg-white/85 backdrop-blur-lg border-b border-slate-100 sticky top-0 z-40 flex items-center justify-between px-4 md:px-8"
      dir="rtl"
    >
      <div className="flex items-center gap-4">
        {/* Burger Button on Mobile */}
        <button 
          onClick={onMenuClick} 
          className="p-2 text-slate-500 hover:bg-slate-50 rounded-xl lg:hidden transition-all duration-200"
        >
          <Menu size={20} />
        </button>

        {/* Quick Search Bar */}
        <div className="relative max-w-sm hidden sm:block font-sans">
          <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
          <input 
            type="text" 
            placeholder="بحث سريع..." 
            className="w-56 bg-slate-50/50 hover:bg-slate-50 border border-slate-100 rounded-full py-2 pr-9 pl-4 text-xs font-extrabold focus:bg-white focus:ring-4 focus:ring-blue-500/5 focus:border-slate-200 transition-all text-right outline-none placeholder:text-slate-400 text-slate-700"
          />
        </div>
      </div>

      {/* User Area on Top Left */}
      <div className="flex items-center gap-3 md:gap-5">
        {currentUser && (
          <div className="flex items-center gap-3 pr-3 md:pr-5">
            <div className="w-10 h-10 bg-slate-100 text-slate-500 rounded-full flex items-center justify-center border border-slate-200/80 shrink-0 shadow-xs">
              <UserIcon size={16} />
            </div>
            <div className="text-right">
              <p className="text-xs font-black text-slate-800 leading-none">{currentUser.name}</p>
              <span className="text-[10px] font-bold text-slate-400 mt-1 block">
                {currentUser.role === 'owner' 
                  ? "صاحبة العمل" 
                  : currentUser.role === 'manager' 
                    ? "مدير المخزن" 
                    : "موظف مبيعات"
                }
              </span>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};