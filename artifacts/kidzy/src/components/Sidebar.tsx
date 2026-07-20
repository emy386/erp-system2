/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { NavLink } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { 
  LayoutDashboard, ShoppingCart, Package, Scissors, 
  Users, Receipt, LogOut, X, User as UserIcon, Store
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { currentUser, logout } = useApp();

  const menuItems = [
    { name: "لوحة التحكم", icon: LayoutDashboard, path: "/", permission: "dashboard" },
    { name: "الأوردرات", icon: ShoppingCart, path: "/orders", permission: "orders" },
    { name: "المنتجات", icon: Package, path: "/inventory", permission: "inventory" },
    { name: "الإنتاج والورش", icon: Scissors, path: "/production", permission: "production" },
    { name: "الموظفين", icon: Users, path: "/staff", permission: "staff" },
    { name: "الحسابات", icon: Receipt, path: "/accounts", permission: "accounts" },
    { name: "شغل الجملة", icon: Store, path: "/wholesale", permission: "wholesale" },
  ];

  // Filter based on user permissions
  const filteredItems = menuItems.filter(item => {
    if (!currentUser) return false;
    if (currentUser.role === "owner") return true;
    const perms = currentUser.permissions || [];
    if (perms.includes("all")) return true;
    return perms.includes(item.permission);
  });

  return (
    <aside 
      className={`kidzy-sidebar fixed inset-y-0 right-0 w-64 bg-white border-l border-slate-100 flex flex-col z-[50] transition-transform duration-300 outline-none text-right${
        isOpen ? " is-open shadow-2xl shadow-slate-100" : ""
      }`}
      dir="rtl"
    >
      {/* Brand logo bar */}
      <div className="p-6 border-b border-slate-100 flex items-center justify-between col-span-1">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-linear-to-tr from-blue-600 to-indigo-500 rounded-2xl flex items-center justify-center font-black text-white text-xl shadow-lg shadow-blue-500/20">
            K
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-800 tracking-tight leading-none">سيستم كيدزي</h1>
            <span className="text-[10px] text-slate-400 font-bold tracking-wider uppercase block mt-1">ERP Manager</span>
          </div>
        </div>
        <button 
          onClick={onClose} 
          className="p-2 text-slate-400 hover:bg-slate-50 rounded-xl lg:hidden transition-colors"
        >
          <X size={20} />
        </button>
      </div>

      {/* Nav menus */}
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {filteredItems.map(item => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onClose}
              className={({ isActive }) => 
                `flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-200 relative group font-sans ${
                  isActive 
                    ? "bg-blue-50 text-blue-600 font-extrabold scale-[1.02] shadow-xs" 
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-850 font-bold"
                }`
              }
            >
              <Icon size={18} className="shrink-0 transition-transform group-hover:scale-110 duration-200" />
              <span className="text-sm tracking-wide">{item.name}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* User footer profile & logout */}
      <div className="p-4 border-t border-slate-100 space-y-3">
        {currentUser && (
          <div className="px-4 py-3.5 bg-slate-50/80 rounded-2xl flex flex-col gap-1 border border-slate-100 text-right">
            <span className="text-[10px] font-bold text-slate-400 leading-none">المستخدم الحالي</span>
            <p className="text-sm font-black text-slate-700 truncate mt-0.5">{currentUser.name}</p>
          </div>
        )}
        <button
          onClick={logout}
          className="w-full flex items-center justify-between px-4 py-3.5 rounded-2xl text-rose-600 hover:bg-rose-50/60 font-black transition-all text-sm"
        >
          <span>تسجيل الخروج</span>
          <LogOut size={16} className="shrink-0 text-rose-500" />
        </button>
      </div>
    </aside>
  );
};
