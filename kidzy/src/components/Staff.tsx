/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { User, VariableTask } from '../types';
import { 
  Users, Key, Shield, Plus, Search, Calendar, Phone, Mail, 
  Trash2, Pencil, CheckSquare, Square, Save, DollarSign, Award, ThumbsDown, Eye, Sliders, Check, X
} from 'lucide-react';

const TEAM_ROLES = [
  { value: "owner", label: "صاحبة البراند 👑" },
  { value: "manager", label: "مدير" },
  { value: "staff", label: "موظف" }
];

const PERMISSIONS_LIST = [
  { id: "dashboard", label: "لوحة التحكم" },
  { id: "orders", label: "الأوردرات" },
  { id: "inventory", label: "المنتجات" },
  { id: "production", label: "الإنتاج والورش" },
  { id: "staff", label: "الموظفين" },
  { id: "accounts", label: "الحسابات" }
];

const ARABIC_MONTHS = [
  "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", 
  "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"
];

const WEEKDAYS = ["السبت", "الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة"];

const hashPassword = (pw: string) => btoa(pw);

export const Staff: React.FC = () => {
  const { users, setUsers, currentUser } = useApp();

  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [currentCalendarDate, setCurrentCalendarDate] = useState<Date>(new Date());
  const [selectedCalendarDateStr, setSelectedCalendarDateStr] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [searchQuery, setSearchQuery] = useState("");

  // Modals Toggles
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<User | null>(null);

  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<VariableTask | null>(null);

  // Custom 100% Reliable Deletion Confirmation State
  const [staffToDelete, setStaffToDelete] = useState<User | null>(null);
  const [taskToDeleteId, setTaskToDeleteId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Date filters
  const [dateFilter, setDateFilter] = useState<"today" | "week" | "month" | "all" | "custom">("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  // Form State - Staff Member Creation
  const [staffForm, setStaffForm] = useState<{
    name: string;
    phone: string;
    email: string;
    password?: string;
    role: "owner" | "manager" | "staff";
    permissions: string[];
    jobTitle?: string;
  }>({
    name: "",
    phone: "",
    email: "",
    password: "",
    role: "staff",
    permissions: ["dashboard", "orders"],
    jobTitle: ""
  });

  // Form State - Commissions/Additions/Deductions
  const [taskForm, setTaskForm] = useState<{
    date: string;
    description: string;
    amount: number;
    paidAmount: number;
    type: "daily" | "extra" | "deduction";
    notes: string;
  }>({
    date: new Date().toISOString().split("T")[0],
    description: "",
    amount: 0,
    paidAmount: 0,
    type: "extra",
    notes: ""
  });

  // Inline forms toggles inside Task Organizer
  const [showInlineTaskForm, setShowInlineTaskForm] = useState(false);

  // Scroll to top of the page when opening or closing the individual staff organizer
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [selectedStaffId]);

  // Filters calculation for staff lists
  const filteredStaff = useMemo(() => {
    if (!searchQuery.trim()) return users;
    const q = searchQuery.toLowerCase().trim();
    return users.filter(u => 
      u.name.toLowerCase().includes(q) || 
      (u.phone || "").includes(q) || 
      u.email.toLowerCase().includes(q)
    );
  }, [users, searchQuery]);

  const selectedStaff = useMemo<User | null>(() => {
    if (!selectedStaffId) return null;
    return users.find(u => u.id === selectedStaffId) || null;
  }, [users, selectedStaffId]);

  const calendarYear = currentCalendarDate.getFullYear();
  const calendarMonth = currentCalendarDate.getMonth();

  const monthTasks = useMemo(() => {
    if (!selectedStaff) return [];
    return (selectedStaff.variableTasks || []).filter(t => {
      const d = new Date(t.date);
      return d.getFullYear() === calendarYear && d.getMonth() === calendarMonth;
    });
  }, [selectedStaff, calendarYear, calendarMonth]);

  const { totalThisMonth, paidThisMonth, unpaidThisMonth } = useMemo(() => {
    let total = 0;
    let paid = 0;
    monthTasks.forEach(t => {
      if (t.type === "deduction") {
        total -= t.amount;
        paid -= t.paidAmount || 0;
      } else {
        total += t.amount;
        paid += t.paidAmount || 0;
      }
    });
    return {
      totalThisMonth: total,
      paidThisMonth: paid,
      unpaidThisMonth: total - paid
    };
  }, [monthTasks]);

  const formattedSelectedDayLabel = useMemo(() => {
    if (!selectedCalendarDateStr) return "";
    const parts = selectedCalendarDateStr.split("-");
    const monthIdx = parseInt(parts[1], 10) - 1;
    const dayStr = parseInt(parts[2], 10);
    return `${dayStr} ${ARABIC_MONTHS[monthIdx]}`;
  }, [selectedCalendarDateStr]);

  const selectedDayTasks = useMemo(() => {
    if (!selectedStaff) return [];
    return (selectedStaff.variableTasks || []).filter(t => t.date === selectedCalendarDateStr);
  }, [selectedStaff, selectedCalendarDateStr]);

  const currentMonthLabel = `${ARABIC_MONTHS[calendarMonth]} ${calendarYear}`;

  const handleNextMonth = () => {
    setCurrentCalendarDate(new Date(calendarYear, calendarMonth + 1, 1));
  };

  const handlePrevMonth = () => {
    setCurrentCalendarDate(new Date(calendarYear, calendarMonth - 1, 1));
  };

  const getDateString = (day: number) => {
    const yyyy = currentCalendarDate.getFullYear();
    const mm = String(currentCalendarDate.getMonth() + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const handleOpenAddTaskForDate = () => {
    setEditingTask(null);
    setTaskForm({
      date: selectedCalendarDateStr,
      description: "",
      amount: 100,
      paidAmount: 100,
      type: "extra",
      notes: ""
    });
    setShowInlineTaskForm(true);
  };

  // General billing calculator helper
  const calculateUserBilling = (u: User) => {
    let owed = 0;
    let paid = 0;

    (u.variableTasks || []).forEach(t => {
      // Check date ranges if filtered
      let match = true;
      const taskDate = new Date(t.date);
      const today = new Date();
      
      if (dateFilter === "today") {
        const todayStr = today.toISOString().split("T")[0];
        match = t.date === todayStr;
      } else if (dateFilter === "week") {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(today.getDate() - 7);
        match = taskDate >= sevenDaysAgo;
      } else if (dateFilter === "month") {
        match = taskDate.getMonth() === today.getMonth() && taskDate.getFullYear() === today.getFullYear();
      }

      if (startDate && endDate) {
        match = t.date >= startDate && t.date <= endDate;
      } else if (startDate) {
        match = t.date >= startDate;
      } else if (endDate) {
        match = t.date <= endDate;
      }

      if (match) {
        if (t.type === "deduction") {
          owed -= t.amount;
          paid -= t.paidAmount || 0;
        } else {
          owed += t.amount;
          paid += t.paidAmount || 0;
        }
      }
    });

    return {
      owed,
      paid,
      balance: owed - paid
    };
  };

  // Company-wide billing metrics with the current date filter applied
  const companyMetrics = useMemo(() => {
    let totalOwed = 0;
    let totalPaid = 0;

    users.forEach(u => {
      const billing = calculateUserBilling(u);
      totalOwed += billing.owed;
      totalPaid += billing.paid;
    });

    return {
      totalOwed,
      totalPaid,
      totalPending: totalOwed - totalPaid
    };
  }, [users, dateFilter, startDate, endDate]);

  // Permission toggler
  const handleTogglePermission = (id: string) => {
    setStaffForm(prev => {
      const alreadyHas = prev.permissions.includes(id);
      const updated = alreadyHas 
        ? prev.permissions.filter(p => p !== id)
        : [...prev.permissions, id];
      return { ...prev, permissions: updated };
    });
  };

  // Staff profile creators/modifiers
  const handleOpenAddStaff = () => {
    setEditingStaff(null);
    setStaffForm({
      name: "",
      phone: "",
      email: "",
      password: "",
      role: "staff",
      permissions: ["dashboard", "orders"],
      jobTitle: ""
    });
    setIsFormOpen(true);
  };

  const handleOpenEditStaff = (u: User) => {
    setEditingStaff(u);
    setStaffForm({
      name: u.name,
      phone: u.phone || "",
      email: u.email,
      password: "",
      role: u.role,
      permissions: u.permissions || [],
      jobTitle: u.jobTitle || ""
    });
    setIsFormOpen(true);
  };

  const handleSaveStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffForm.name.trim() || !staffForm.email.trim()) return;

    if (editingStaff) {
      setUsers(users.map(u => u.id === editingStaff.id ? {
        ...u,
        name: staffForm.name,
        phone: staffForm.phone,
        email: staffForm.email,
        password: staffForm.password ? hashPassword(staffForm.password) : u.password,
        role: staffForm.role,
        permissions: staffForm.permissions,
        jobTitle: staffForm.jobTitle || ""
      } : u));
    } else {
      const newU: User = {
        id: `usr-${Date.now()}`,
        name: staffForm.name,
        phone: staffForm.phone,
        email: staffForm.email,
        password: staffForm.password ? hashPassword(staffForm.password) : hashPassword("123456"),
        role: staffForm.role,
        permissions: staffForm.permissions,
        jobTitle: staffForm.jobTitle || "موظف مبيعات وتغليف",
        variableTasks: [],
        staffRoles: []
      };
      setUsers([...users, newU]);
    }

    setIsFormOpen(false);
    setEditingStaff(null);
  };

  const handleDeleteStaff = (id: string, name: string) => {
    if (id === currentUser?.id) {
      setErrorMessage("🚨 خطأ! لا يمكنك حذف حسابك الشخصي الذي تستخدمينه لتسجيل الدخول حالياً لتفادي قفل حسابك.");
      return;
    }

    const targetUser = users.find(u => u.id === id);
    if (targetUser) {
      setStaffToDelete(targetUser);
    }
  };

  const executeDeleteStaff = () => {
    if (!staffToDelete) return;
    setUsers(users.filter(u => u.id !== staffToDelete.id));
    if (selectedStaffId === staffToDelete.id) setSelectedStaffId(null);
    setStaffToDelete(null);
  };

  // Variable tasks actions (Commissions and wages)
  const handleOpenAddTask = () => {
    setEditingTask(null);
    setTaskForm({
      date: new Date().toISOString().split("T")[0],
      description: "",
      amount: 100,
      paidAmount: 100,
      type: "extra",
      notes: ""
    });
    setShowInlineTaskForm(true);
  };

  const handleOpenEditTask = (task: VariableTask) => {
    setEditingTask(task);
    setTaskForm({
      date: task.date,
      description: task.description || task.name,
      amount: task.amount,
      paidAmount: task.paidAmount || 0,
      type: (task.type || "extra") as "daily" | "extra" | "deduction",
      notes: task.notes || ""
    });
    setShowInlineTaskForm(true);
  };

  const handleSaveTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaffId || !taskForm.description.trim()) return;

    const amt = Number(taskForm.amount) || 0;
    const paid = Number(taskForm.paidAmount) || 0;

    setUsers(users.map(u => {
      if (u.id === selectedStaffId) {
        let updatedTasks = [...(u.variableTasks || [])];

        if (editingTask) {
          updatedTasks = updatedTasks.map(t => t.id === editingTask.id ? {
            ...t,
            name: taskForm.description,
            pay: amt,
            status: paid >= amt ? "paid" : "unpaid",
            date: taskForm.date,
            description: taskForm.description,
            amount: amt,
            paidAmount: paid,
            type: taskForm.type,
            isPaid: paid >= amt,
            notes: taskForm.notes
          } : t);
        } else {
          const newT: VariableTask = {
            id: `tsk-${Date.now()}`,
            name: taskForm.description,
            pay: amt,
            status: paid >= amt ? "paid" : "unpaid",
            date: taskForm.date,
            description: taskForm.description,
            amount: amt,
            paidAmount: paid,
            type: taskForm.type,
            isPaid: paid >= amt,
            notes: taskForm.notes
          };
          updatedTasks = [newT, ...updatedTasks];
        }

        return { ...u, variableTasks: updatedTasks };
      }
      return u;
    }));

    setShowInlineTaskForm(false);
    setEditingTask(null);
  };

  const handleDeleteTask = (taskId: string) => {
    setTaskToDeleteId(taskId);
  };

  const executeDeleteTask = () => {
    if (!taskToDeleteId || !selectedStaffId) return;
    setUsers(users.map(u => {
      if (u.id === selectedStaffId) {
        const filtered = (u.variableTasks || []).filter(t => t.id !== taskToDeleteId);
        return { ...u, variableTasks: filtered };
      }
      return u;
    }));
    setTaskToDeleteId(null);
  };

  if (selectedStaff) {
    const startDayIndex = (new Date(calendarYear, calendarMonth, 1).getDay() + 1) % 7;
    const totalDaysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();

    return (
      <div className="space-y-6 text-right pb-16 animate-in fade-in duration-300 font-sans" dir="rtl">
        {/* Profile Card */}
        <div className="bg-white rounded-[2.25rem] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.03)] p-6 sm:p-7 relative overflow-hidden">
          <div className="absolute top-0 right-0 left-0 h-1.5 bg-gradient-to-r from-blue-600 to-indigo-500" />
          <div className="flex flex-col sm:flex-row justify-between items-center gap-6 pt-1">
            <div className="flex items-center gap-4 text-right w-full sm:w-auto">
              {/* Profile Initial circle container */}
              <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-755 from-blue-600 to-indigo-700 text-white rounded-2xl flex items-center justify-center text-2xl font-black shadow-lg shadow-blue-50 shrink-0 select-none">
                {selectedStaff.name.charAt(0)}
              </div>
              <div className="space-y-2 text-right">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h3 className="text-2xl font-black text-slate-800 leading-none">{selectedStaff.name}</h3>
                  <span className="bg-blue-50 text-blue-600 border border-blue-100/50 font-black px-3 py-1 rounded-full text-[11px] shrink-0">
                    {TEAM_ROLES.find(r => r.value === selectedStaff.role)?.label || selectedStaff.jobTitle || "صاحبة البراند"}
                  </span>
                </div>
                {selectedStaff.jobTitle && (
                  <p className="text-xs text-slate-500 font-extrabold block">المسمى العملي: {selectedStaff.jobTitle}</p>
                )}
                <div className="flex items-center gap-4 text-xs font-semibold text-slate-400 pt-0.5">
                  <span className="flex items-center gap-1.5">
                    <Phone size={13} className="text-slate-300" />
                    <span className="font-sans font-bold">{selectedStaff.phone || "بدون هاتف مسجل"}</span>
                  </span>
                  {selectedStaff.email && (
                    <span className="flex items-center gap-1.5 border-r border-slate-100 pr-4">
                      <Mail size={13} className="text-slate-300" />
                      <span className="font-sans font-bold">{selectedStaff.email}</span>
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto justify-end border-t sm:border-t-0 pt-4 sm:pt-0 border-slate-50">
              <button
                type="button"
                onClick={() => setSelectedStaffId(null)}
                className="bg-slate-50 hover:bg-slate-100 text-slate-700 font-extrabold px-5 py-3 rounded-2xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer border border-slate-205 shadow-sm hover:translate-x-1 duration-200"
              >
                <span>← العودة لقائمة الطاقم</span>
              </button>

              <button
                type="button"
                onClick={() => handleOpenEditStaff(selectedStaff)}
                className="bg-blue-50 hover:bg-blue-100 border border-blue-100 text-blue-600 font-extrabold p-3.5 rounded-2xl text-xs transition-all cursor-pointer shrink-0 flex items-center justify-center hover:scale-105 active:scale-95 duration-200"
                title="تعديل حساب وصلاحيات الموظف"
              >
                <Pencil size={18} className="stroke-[2.5]" />
              </button>

              {selectedStaff.id !== currentUser?.id && (
                <button
                  type="button"
                  onClick={() => handleDeleteStaff(selectedStaff.id, selectedStaff.name)}
                  className="bg-rose-50 hover:bg-rose-100 border border-rose-100 text-rose-500 font-bold p-3.5 rounded-2xl text-xs transition-all cursor-pointer shrink-0 flex items-center justify-center hover:scale-105 active:scale-95 duration-200"
                  title="حذف حساب الموظف"
                >
                  <Trash2 size={18} className="stroke-[2.5]" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Dynamic Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Paid This Month */}
          <div className="relative overflow-hidden rounded-[2.25rem] bg-gradient-to-br from-[#f0fdf4] to-[#dcfce7]/40 border border-emerald-100 p-6 sm:p-7 shadow-[0_8px_30px_rgb(0,0,0,0.02)] transition-all hover:shadow-[0_12px_45px_rgb(16,185,129,0.06)] hover:-translate-y-0.5 duration-300">
            {/* Top row with icon & status */}
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-black text-emerald-700 bg-emerald-50 border border-emerald-100/50 px-3 py-1 rounded-full">
                تم تسويته ودفعه للموظف (الشهر الحالي)
              </span>
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 shrink-0">
                <Check size={18} className="stroke-[3]" />
              </div>
            </div>
            {/* Display Number */}
            <div className="space-y-1 text-right">
              <div className="flex flex-col gap-1 items-start">
                <span className="text-[11px] font-bold text-slate-400 block">المبالغ التي تم دفعها بالفعل</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl sm:text-4xl font-sans font-black text-emerald-650 text-emerald-600 tracking-tight leading-none">
                    {paidThisMonth.toLocaleString()}
                  </span>
                  <span className="text-xs font-black text-emerald-500 font-sans">ج.م</span>
                </div>
              </div>
              <p className="text-[10px] sm:text-[11.5px] font-black text-emerald-600/70 mt-2 leading-relaxed">
                اليوميات والمهام المستحقة والمسددة
              </p>
            </div>
          </div>

          {/* Card 2: Unpaid / Pending */}
          <div className="relative overflow-hidden rounded-[2.25rem] bg-gradient-to-br from-[#fff8f8] to-[#ffe4e6]/40 border border-rose-100 p-6 sm:p-7 shadow-[0_8px_30px_rgb(0,0,0,0.02)] transition-all hover:shadow-[0_12px_45px_rgba(244,63,94,0.04)] hover:-translate-y-0.5 duration-300">
            {/* Top row with icon & status */}
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-black text-rose-600 bg-rose-50 border border-rose-100 px-3 py-1 rounded-full">
                مستحقات معلقة (متبقي عليك دفعه)
              </span>
              <div className="w-10 h-10 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-600 shrink-0">
                <span className="text-lg font-black font-sans leading-none">!</span>
              </div>
            </div>
            {/* Display Number */}
            <div className="space-y-1 text-right">
              <div className="flex flex-col gap-1 items-start">
                <span className="text-[11px] font-bold text-slate-400 block">المبالغ والأجور المطلوب منك دفعها</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl sm:text-4xl font-sans font-black text-rose-600 tracking-tight leading-none">
                    {unpaidThisMonth.toLocaleString()}
                  </span>
                  <span className="text-xs font-black text-rose-500 font-sans">ج.م</span>
                </div>
              </div>
              <p className="text-[10px] sm:text-[11.5px] font-black text-rose-600/70 mt-2 leading-relaxed">
                شامل الراتب الثابت واليوميات غير المسددة
              </p>
            </div>
          </div>

          {/* Card 3: Total Earned */}
          <div className="relative overflow-hidden rounded-[2.25rem] bg-gradient-to-br from-[#f0f7ff] to-[#e0f2fe]/40 border border-blue-100 p-6 sm:p-7 shadow-[0_8px_30px_rgb(0,0,0,0.02)] transition-all hover:shadow-[0_12px_45px_rgb(59,130,246,0.06)] hover:-translate-y-0.5 duration-300">
            {/* Top row with icon & status */}
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-black text-blue-700 bg-blue-50 border border-blue-105 px-3 py-1 rounded-full">
                إجمالي مستحقات الموظف
              </span>
              <div className="w-10 h-10 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-600 shrink-0">
                <span className="text-lg font-black leading-none">💼</span>
              </div>
            </div>
            {/* Display Number */}
            <div className="space-y-1 text-right">
              <div className="flex flex-col gap-1 items-start">
                <span className="text-[11px] font-bold text-slate-400 block">مجموع المستحقات الكلي</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl sm:text-4xl font-sans font-black text-blue-600 tracking-tight leading-none font-extrabold">
                    {totalThisMonth.toLocaleString()}
                  </span>
                  <span className="text-xs font-black text-blue-500 font-sans">ج.م</span>
                </div>
              </div>
              <p className="text-[10px] sm:text-[11.5px] font-black text-blue-700 mt-2 leading-relaxed">
                مجموع الرواتب مع اليوميات والعمولات
              </p>
            </div>
          </div>
        </div>

        {/* Calendar Core Card */}
        <div className="bg-white border border-slate-100 rounded-[2.5rem] p-6 sm:p-8 space-y-6 shadow-sm text-right">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-100">
            <div className="space-y-1 text-right">
              <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                <span className="p-1.5 bg-blue-50 text-blue-600 rounded-xl">🗓️</span>
                <span>تقويم المهام وتوزيع العمل</span>
              </h3>
              <p className="text-xs text-slate-400 font-bold leading-relaxed">
                اضغطي على أي يوم لتحديده واستعراض مهامه أو جدولة عمل سريع
              </p>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
              <span className="bg-blue-50/80 text-blue-600 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-extrabold whitespace-nowrap border border-blue-100/30">
                {currentMonthLabel}
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="px-3 py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 hover:text-slate-900 border border-slate-200/65 font-black text-slate-550 flex items-center justify-center gap-1 cursor-pointer transition-all text-xs"
                  title="الشهر السابق"
                >
                  <span>السابق</span>
                  <span className="font-sans text-[13px] leading-none">&#8594;</span>
                </button>
                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="px-3 py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 hover:text-slate-900 border border-slate-200/65 font-black text-slate-550 flex items-center justify-center gap-1 cursor-pointer transition-all text-xs"
                  title="الشهر التالي"
                >
                  <span className="font-sans text-[13px] leading-none">&#8592;</span>
                  <span>التالي</span>
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-7 gap-1 text-center border-b border-slate-100 pb-3">
              {WEEKDAYS.map((w, idx) => (
                <span 
                  key={idx} 
                  className="text-[9px] min-[375px]:text-[10px] sm:text-xs font-black text-slate-400 py-1 select-none tracking-tighter"
                >
                  {w}
                </span>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1.5 sm:gap-3">
              {Array.from({ length: startDayIndex }).map((_, idx) => (
                <div 
                  key={`offset-${idx}`} 
                  className="aspect-square bg-slate-50/40 rounded-2xl border border-dashed border-slate-100 select-none opacity-40"
                />
              ))}

              {Array.from({ length: totalDaysInMonth }).map((_, idx) => {
                const dayNum = idx + 1;
                const dateStr = getDateString(dayNum);
                const isSelected = dateStr === selectedCalendarDateStr;
                
                const dayTasks = (selectedStaff.variableTasks || []).filter(t => t.date === dateStr);
                const hasTasks = dayTasks.length > 0;

                return (
                  <button
                    key={`day-${dayNum}`}
                    type="button"
                    onClick={() => {
                      setSelectedCalendarDateStr(dateStr);
                    }}
                    className={`aspect-square sm:aspect-auto sm:min-h-[88px] p-2.5 rounded-2xl border text-right relative flex flex-col justify-between transition-all cursor-pointer ${
                      isSelected
                        ? "bg-gradient-to-br from-blue-600 to-indigo-705 from-blue-600 to-indigo-600 text-white border-blue-600 shadow-md shadow-blue-100 scale-[1.02] z-10"
                        : "bg-white border-slate-150 hover:bg-slate-50 hover:border-slate-300 text-slate-700 shadow-sm"
                    }`}
                  >
                    <div className="w-full flex justify-end">
                      {isSelected ? (
                        <span className="w-6 h-6 rounded-full bg-white text-blue-600 font-sans text-xs font-extrabold flex items-center justify-center leading-none shadow-sm">
                          {dayNum}
                        </span>
                      ) : (
                        <span className="text-xs font-sans font-black text-slate-550 select-none font-extrabold">
                          {dayNum}
                        </span>
                      )}
                    </div>

                    <div className="w-full flex flex-col gap-1 justify-end items-start pt-1.5">
                      {hasTasks && (
                        <div className="flex gap-1 items-center flex-wrap max-w-full">
                          {dayTasks.map(t => (
                            <span 
                              key={t.id} 
                              className={`w-1.5 h-1.5 rounded-full ring-1 ${
                                isSelected ? "ring-white/30" : "ring-transparent"
                              } ${
                                t.type === "deduction" 
                                  ? "bg-rose-500" 
                                  : t.paidAmount! >= t.amount 
                                  ? "bg-emerald-500" 
                                  : "bg-amber-500"
                              }`}
                              title={t.description || t.name}
                            />
                          ))}
                        </div>
                      )}
                      {hasTasks && (
                        <span className={`hidden sm:inline-block text-[9px] font-extrabold truncate max-w-full ${
                          isSelected ? "text-white/80" : "text-slate-400"
                        }`}>
                          {dayTasks.length} {dayTasks.length === 1 ? "بند مالي" : "بنود"}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Primary Selected Day Task Panel */}
        <div className="bg-white border border-slate-100 rounded-[2.5rem] p-6 sm:p-8 space-y-6 shadow-sm text-right">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-100">
            <div className="space-y-1 text-right">
              <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                <span className="p-1.5 bg-blue-50 text-blue-600 rounded-xl">✨</span>
                <span>يوميات وأعمال يوم {formattedSelectedDayLabel}</span>
              </h3>
              <p className="text-xs text-slate-400 font-bold leading-relaxed">
                المستحقات المعنية واليوميات والمهام الخاصة بالموظف لليوم المختار
              </p>
            </div>

            <button
              type="button"
              onClick={handleOpenAddTaskForDate}
              className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold px-5 py-3 rounded-2xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md hover:shadow-blue-105 active:scale-98 whitespace-nowrap self-stretch sm:self-auto hover:-translate-y-0.5 duration-200"
            >
              <span>+ إضافة مهمة جديدة لليوم المختار</span>
            </button>
          </div>

          {/* Stunning Styled Task Creator/Editor Popup Modal */}
          {showInlineTaskForm && (() => {
            const remaining = Math.max(0, (taskForm.amount || 0) - (taskForm.paidAmount || 0));
            return (
              <div 
                className="fixed inset-0 bg-slate-900/40 backdrop-blur-[4px] z-[999] flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-205 text-right font-sans"
                onClick={(e) => {
                  if (e.target === e.currentTarget) {
                    setShowInlineTaskForm(false);
                  }
                }}
              >
                <div className="bg-white rounded-[2rem] w-full max-w-[490px] shadow-2xl overflow-hidden text-right relative border border-slate-100 flex flex-col justify-start animate-in zoom-in-95 duration-200 my-8">
                  {/* Modal Header */}
                  <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-slate-50/50">
                    <button
                      type="button"
                      onClick={() => setShowInlineTaskForm(false)}
                      className="w-9 h-9 rounded-full bg-white hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-all cursor-pointer border border-slate-200 shadow-sm"
                      title="إغلاق التبويب"
                    >
                      <X size={15} />
                    </button>
                    <h3 className="text-base sm:text-lg font-black text-slate-800">
                      {editingTask ? "📝 تعديل مهمة الموظف" : "جدولة مهمة جديدة للموظف"}
                    </h3>
                  </div>

                  {/* Modal Scrollable Form Scope */}
                  <form onSubmit={handleSaveTask} className="p-6 sm:p-8 space-y-5 overflow-y-auto max-h-[75vh]">
                    
                    {/* تاريخ المجدول */}
                    <div className="space-y-1.5 text-right w-full">
                      <label className="text-[11px] font-black text-slate-400 block pr-1">تاريخ المجدول</label>
                      <input
                        type="date"
                        required
                        value={taskForm.date}
                        onChange={e => setTaskForm({ ...taskForm, date: e.target.value })}
                        className="w-full bg-[#f8fafc] border border-slate-200 rounded-2xl p-4 text-xs font-sans font-bold text-slate-700 outline-none focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-105 transition-all text-right cursor-pointer"
                      />
                    </div>

                    {/* مسمى العمل المنجز */}
                    <div className="space-y-1.5 text-right w-full">
                      <label className="text-[11px] font-black text-slate-400 block pr-1">مسمى العمل المنجز</label>
                      <input
                        type="text"
                        required
                        placeholder="مثال: تصوير المجموعة الجديدة، ميديا باينينج، صيانة..."
                        value={taskForm.description}
                        onChange={e => setTaskForm({ ...taskForm, description: e.target.value })}
                        className="w-full bg-[#f8fafc] border border-slate-200 rounded-2xl p-4 text-xs font-bold text-slate-700 outline-none focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-105 transition-all text-right"
                      />
                    </div>

                    {/* نوع وطبيعة المهمة */}
                    <div className="space-y-1.5 text-right w-full">
                      <label className="text-[11px] font-black text-slate-400 block pr-1">نوع وطبيعة المهمة</label>
                      <select
                        value={taskForm.type || "extra"}
                          onChange={e => setTaskForm({ ...taskForm, type: e.target.value as "daily" | "extra" | "deduction" })}
                        className="w-full bg-[#f8fafc] border border-slate-200 rounded-2xl p-4 text-xs font-black text-slate-700 outline-none focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-105 transition-all text-right cursor-pointer"
                      >
                        <option value="daily">مهمة متغيرة (يومية / عمولة منفصلة)</option>
                        <option value="extra">مهمة ثابتة (لها مرتب شهري)</option>
                      </select>
                    </div>

                    {/* القيمة المقررة والمسدد والمدفوع */}
                    <div className="grid grid-cols-2 gap-4">
                      {/* المبلغ المدفوع بالفعل */}
                      <div className="space-y-1.5 text-right">
                        <label className="text-[11px] font-black text-slate-400 block text-center">المبلغ المدفوع بالفعل (ج.م)</label>
                        <input
                          type="number"
                          required
                          min="0"
                          step="any"
                          value={taskForm.paidAmount === 0 ? "0" : taskForm.paidAmount}
                          onChange={e => setTaskForm({ ...taskForm, paidAmount: parseFloat(e.target.value) || 0 })}
                          className="w-full bg-[#f8fafc]/80 border border-slate-200 rounded-2xl p-4 text-center text-sm font-sans font-black text-emerald-600 outline-none focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-105 transition-all"
                        />
                      </div>

                      {/* القيمة الإجمالية للمهمة */}
                      <div className="space-y-1.5 text-right">
                        <label className="text-[11px] font-black text-slate-400 block text-center">القيمة الإجمالية للمهّمة (ج.م)</label>
                        <input
                          type="number"
                          required
                          min="0"
                          step="any"
                          value={taskForm.amount === 0 ? "0" : taskForm.amount}
                          onChange={e => {
                            const val = parseFloat(e.target.value) || 0;
                            setTaskForm({ ...taskForm, amount: val, paidAmount: val });
                          }}
                          className="w-full bg-[#f8fafc]/80 border border-slate-200 rounded-2xl p-4 text-center text-sm font-sans font-black text-slate-800 outline-none focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-105 transition-all"
                        />
                      </div>
                    </div>

                    {/* الحساب المتبقي للموظف ومؤشرات السداد */}
                    <div className="rounded-2xl border border-amber-200/70 bg-amber-50/15 p-5 space-y-3.5 text-right">
                      <div className="flex justify-between items-center">
                        <div className="flex items-baseline gap-1 text-amber-700">
                          <span className="text-xl sm:text-2xl font-sans font-black">
                            {remaining.toLocaleString()}
                          </span>
                          <span className="text-xs font-black">ج.م</span>
                        </div>
                        <span className="text-xs font-bold text-amber-800">الحساب المتبقي للموظف</span>
                      </div>
                      <div className="pt-2.5 border-t border-amber-200/50 text-center">
                        <p className="text-[11px] font-black text-amber-700 flex items-center justify-center gap-1.5">
                          {taskForm.type === "deduction" ? (
                            remaining === 0 ? (
                              <>
                                <span>تم خصم كامل المبلغ من الموظف</span>
                                <span>✅</span>
                              </>
                            ) : remaining === taskForm.amount ? (
                              <>
                                <span>المبلغ مستحق الخصم بالكامل من الموظف</span>
                                <span>⏳</span>
                              </>
                            ) : (
                              <>
                                <span>متبقي للخصم جزء بقيمة {remaining} ج.م</span>
                                <span>⏳</span>
                              </>
                            )
                          ) : (
                            remaining === 0 ? (
                              <>
                                <span>المبلغ مدفوع بالكامل للموظف</span>
                                <span>✅</span>
                              </>
                            ) : remaining === taskForm.amount ? (
                              <>
                                <span>المبلغ الإجمالي مستحق بالكامل للموظف</span>
                                <span>⏳</span>
                              </>
                            ) : (
                              <>
                                <span>متبقي للموظف دفعة جزئية بقيمة {remaining} ج.م</span>
                                <span>⏳</span>
                              </>
                            )
                          )}
                        </p>
                      </div>
                    </div>

                    {/* أية تفاصيل أو ملاحظات */}
                    <div className="space-y-1.5 text-right w-full">
                      <label className="text-[11px] font-black text-slate-400 block pr-1">أية تفاصيل أو ملاحظات (NOTES)</label>
                      <textarea
                        rows={2}
                        placeholder="اكتب ملاحظات بخصوص الشغل ده هنا..."
                        value={taskForm.notes}
                        onChange={e => setTaskForm({ ...taskForm, notes: e.target.value })}
                        className="w-full bg-[#f8fafc] border border-slate-200 rounded-2xl p-4 text-xs font-bold text-slate-700 outline-none focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-105 transition-all text-right resize-none"
                      />
                    </div>

                    {/* Actions Trigger */}
                    <div className="pt-3">
                      <button
                        type="submit"
                        className="w-full bg-[#2563eb] hover:bg-blue-700 text-white font-extrabold py-4 rounded-2xl text-sm shadow-xl shadow-blue-100 cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99] duration-200 flex items-center justify-center gap-2 text-center"
                      >
                        <span>تأكيد وحفظ بجدول العمل</span>
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            );
          })()}

          <div className="space-y-3">
            {selectedDayTasks.length === 0 ? (
              <p className="p-10 text-xs text-slate-400 font-bold text-center bg-slate-50/50 rounded-[2rem] border border-dashed border-slate-200 select-none">
                لا توجد مهام أو يوميات مدونة ليوم {formattedSelectedDayLabel} حتى الآن.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {selectedDayTasks.map(t => {
                  const isDeduction = t.type === "deduction";
                  return (
                    <div
                      key={t.id}
                      className={`p-5 rounded-2xl border flex justify-between items-center gap-4 transition-all hover:shadow-[0_4px_20px_rgb(0,0,0,0.02)] ${
                        isDeduction 
                          ? "bg-rose-50/20 border-rose-100/60" 
                          : t.type === "daily"
                          ? "bg-blue-50/20 border-blue-100/60"
                          : "bg-emerald-50/20 border-emerald-100/60"
                      }`}
                    >
                      <div className="space-y-1.5 text-right">
                        <div className="flex items-center gap-2">
                          <span className={`px-2.5 py-1 rounded-full text-[9px] font-black ${
                            t.type === "deduction" 
                              ? "bg-rose-100 text-rose-700"
                              : t.type === "daily"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-emerald-100 text-emerald-700"
                          }`}>
                            {t.type === "deduction" 
                              ? "خصم / جزاء" 
                              : t.type === "daily" 
                              ? "مهمة متغيرة (يومية)" 
                              : "مهمة ثابتة (مرتب)"}
                          </span>
                          <h4 className="font-extrabold text-slate-800 text-[12px]">{t.description || t.name}</h4>
                        </div>
                        
                        {t.notes && (
                          <p className="text-[10.5px] text-slate-400 font-bold">
                            ملاحظة: {t.notes}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-left font-sans block">
                          <span className={`text-sm font-sans font-black block text-left ${isDeduction ? "text-rose-600" : "text-emerald-600"}`}>
                            {isDeduction ? "-" : "+"} {t.amount.toLocaleString()} ج.م
                          </span>
                          <span className="text-[10px] text-slate-400 block text-left mt-0.5 font-sans font-bold">
                            المدفوع: {t.paidAmount || 0} ج.م
                          </span>
                        </div>

                        <div className="flex flex-col gap-1 pr-3 border-r border-slate-100">
                          <button
                            type="button"
                            onClick={() => handleOpenEditTask(t)}
                            className="bg-blue-50 hover:bg-blue-100 text-blue-600 px-3 py-1.5 rounded-lg font-black text-[10px] cursor-pointer transition-colors"
                          >
                            تعديل
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteTask(t.id)}
                            className="bg-rose-50 hover:bg-rose-100 text-rose-600 px-3 py-1.5 rounded-lg font-black text-[10px] cursor-pointer transition-colors"
                          >
                            حذف
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Month Summary Table list */}
        <div className="bg-white border border-slate-100 rounded-[2.5rem] p-6 sm:p-8 space-y-6 shadow-[0_8px_30px_rgb(0,0,0,0.02)] text-right">
          <div className="flex justify-between items-center gap-4 pb-4 border-b border-slate-100/60">
            <div className="space-y-1 text-right">
              <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                <span className="p-1.5 bg-blue-50 text-blue-600 rounded-xl">📊</span>
                <span>تفاصيل وجدول المهام للشهر المختار</span>
              </h3>
              <p className="text-xs text-slate-400 font-bold leading-relaxed">
                ملخص كامل بكافة اليوميات والتسويات الصادرة والواردة خلال الشهر
              </p>
            </div>

            <span className="bg-slate-50 text-slate-600 border border-slate-250 border-slate-200/60 px-4 py-2 rounded-2xl text-[11px] font-extrabold select-none block">
              إجمالي البنود: {monthTasks.length}
            </span>
          </div>

          <div className="space-y-2">
            {monthTasks.length === 0 ? (
              <p className="p-10 text-xs text-slate-400 font-bold text-center bg-slate-50/50 rounded-[2rem] border border-dashed border-slate-200">
                لا توجد مهام أو مستحقات مجدولة لهذا الشهر في التقويم بعد. اضغطي على أي يوم للتنظيم والجدولة.
              </p>
            ) : (
              <div className="divide-y divide-slate-100/80">
                {monthTasks.map(t => {
                  const isDeduction = t.type === "deduction";
                  return (
                    <div key={t.id} className="py-4 first:pt-0 last:pb-0 flex justify-between items-center gap-4 hover:bg-slate-50/40 px-2 rounded-xl transition-colors duration-200">
                      <div className="space-y-1 text-right">
                        <div className="flex items-center gap-2.5">
                          <span className={`w-2 h-2 rounded-full ring-4 ${
                            t.type === "deduction" 
                              ? "bg-rose-500" 
                              : t.type === "daily" 
                              ? "bg-blue-500" 
                              : "bg-emerald-500"
                          }`} />
                          <h5 className="font-extrabold text-slate-800 text-xs text-slate-800">
                            {t.description || t.name}
                          </h5>
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                            t.type === "deduction" 
                              ? "bg-rose-50 text-rose-600"
                              : t.type === "daily"
                              ? "bg-blue-50 text-blue-600"
                              : "bg-emerald-50 text-emerald-600"
                          }`}>
                            {t.type === "deduction" ? "خصم" : t.type === "daily" ? "متغيرة" : "ثابتة"}
                          </span>
                        </div>
                        <p className="text-[10.5px] text-slate-400 font-sans font-bold flex items-center gap-1.5 mt-0.5">
                          <span>التاريـخ: {t.date}</span>
                          {t.notes && <span className="text-slate-200">|</span>}
                          {t.notes && <span className="text-slate-400">ملاحظات: {t.notes}</span>}
                        </p>
                      </div>

                      <div className="text-left font-sans block">
                        <span className={`text-sm font-sans font-black block text-left ${isDeduction ? "text-rose-600" : "text-emerald-650 text-emerald-600"}`}>
                          {isDeduction ? "-" : "+"} {t.amount.toLocaleString()} ج.م
                        </span>
                        <span className="text-[10px] text-slate-400 block text-left mt-0.5 font-sans font-bold">
                          المسدد: {t.paidAmount || 0} ج.م
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Confirmations & error banners handled inline inside staff details if needed */}
        {taskToDeleteId && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[130] flex items-center justify-center p-4">
            <div className="bg-white rounded-[2rem] max-w-sm w-full p-6 shadow-xl border border-slate-100 text-right animate-in zoom-in-95 duration-200 space-y-4">
              <div className="text-amber-600 flex items-center gap-2">
                <span className="p-2 bg-amber-50 rounded-xl">⚠️</span>
                <h3 className="text-base font-black text-slate-900">حذف البند المالي؟</h3>
              </div>
              
              <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                هل أنتِ متأكدة من رغبتكِ في حذف هذا البند الصادر (الحافز/العقوبة/الراتب) بشكل نهائي من كشف حساب هذه الموظفة؟
              </p>

              <div className="flex gap-3 font-sans pt-2">
                <button
                  type="button"
                  onClick={() => setTaskToDeleteId(null)}
                  className="w-1/2 bg-slate-100 hover:bg-slate-200 text-slate-500 font-extrabold py-3 rounded-2xl text-xs cursor-pointer"
                >
                  إلغاء وتراجع
                </button>
                <button
                  type="button"
                  onClick={executeDeleteTask}
                  className="w-1/2 bg-rose-600 hover:bg-rose-700 text-white font-extrabold py-3 rounded-2xl text-xs shadow-lg shadow-rose-100 cursor-pointer"
                >
                  تأكيد حذف نهائي
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 text-right pb-16 animate-in fade-in duration-300" dir="rtl">
      
      {/* Header bar designed exactly like screenshot */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">
        <div className="flex items-center gap-4 text-right">
          {/* Custom Royal Blue Sliders Filter Icon Container */}
          <div className="w-12 h-12 sm:w-14 sm:h-14 bg-blue-50/80 text-blue-600 rounded-[1.25rem] flex items-center justify-center border border-blue-105 shrink-0 shadow-sm">
            <Sliders size={24} className="stroke-[1.8] sm:hidden" />
            <Sliders size={26} className="stroke-[1.8] hidden sm:block" />
          </div>
          <div>
            <h2 className="text-lg sm:text-2xl font-black text-slate-800 tracking-tight">
              إدارة طاقم العمل والموظفين
            </h2>
            <p className="text-slate-450 text-slate-550 text-[11px] sm:text-sm font-bold mt-1 text-slate-500 leading-snug">
              تنظيم الميديا باير، المصورة، التسويق، والجدولة الشهرية لليوميات والعمولات
            </p>
          </div>
        </div>

        <button
          onClick={handleOpenAddStaff}
          className="bg-blue-600 hover:bg-blue-700 font-extrabold text-white px-5 py-3.5 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-md shadow-blue-100 active:scale-[0.98] text-xs sm:text-sm cursor-pointer w-full sm:w-auto shrink-0"
        >
          <Plus size={16} className="stroke-[2.5]" />
          <span>إضافة موظف جديد بالفريق</span>
        </button>
      </div>

      {/* Date filter row */}
      <div className="bg-white border border-slate-100/90 rounded-[2rem] p-4 flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-4 shadow-sm" dir="rtl">
        {/* Right side: Icon + Label */}
        <div className="flex items-center gap-2.5 shrink-0 justify-start">
          <Calendar size={18} className="text-blue-500 stroke-[2.2] shrink-0" />
          <span className="text-xs font-black text-slate-700">تصفية السجلات بالتاريخ:</span>
        </div>

        {/* Middle: Selection Pills */}
        <div className="flex items-center bg-slate-50 p-1 rounded-2xl border border-slate-100 overflow-x-auto scrollbar-none w-full lg:w-auto justify-start sm:justify-center">
          {[
            { id: "all", label: "كل الوقت" },
            { id: "month", label: "هذا الشهر" },
            { id: "week", label: "آخر 7 أيام" },
            { id: "today", label: "اليوم" }
          ].map(p => {
            const active = dateFilter === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  setDateFilter(p.id as "today" | "week" | "month" | "all");
                  setStartDate("");
                  setEndDate("");
                }}
                className={`px-3.5 py-2 rounded-xl text-[10.5px] sm:text-[11px] font-black shrink-0 transition-all cursor-pointer ${
                  active 
                    ? "bg-white text-blue-600 border border-slate-200/60 shadow-sm" 
                    : "text-slate-450 hover:text-slate-700 text-slate-500"
                }`}
              >
                {p.label}
              </button>
            )
          })}
        </div>

        {/* Left side: Custom date ranges inputs */}
        <div className="flex items-center gap-2 sm:gap-3 text-xs font-bold text-slate-500 w-full lg:w-auto justify-between sm:justify-start">
          <div className="flex-1 sm:flex-none flex items-center gap-2 bg-slate-50 border border-slate-150 rounded-xl px-2.5 py-2 focus-within:border-blue-400 transition-all">
            <span className="text-[10px] text-slate-400 font-bold">من:</span>
            <input
              type="date"
              className="bg-transparent border-none outline-none text-slate-700 focus:ring-0 text-[10.5px] sm:text-[11px] font-sans font-bold w-full"
              value={startDate}
              onChange={e => {
                setStartDate(e.target.value);
                setDateFilter("custom");
              }}
            />
          </div>

          <div className="flex-1 sm:flex-none flex items-center gap-2 bg-slate-50 border border-slate-150 rounded-xl px-2.5 py-2 focus-within:border-blue-400 transition-all">
            <span className="text-[10px] text-slate-400 font-bold">إلى:</span>
            <input
              type="date"
              className="bg-transparent border-none outline-none text-slate-700 focus:ring-0 text-[10.5px] sm:text-[11px] font-sans font-bold w-full"
              value={endDate}
              onChange={e => {
                setEndDate(e.target.value);
                setDateFilter("custom");
              }}
            />
          </div>
        </div>
      </div>

      {/* Dynamic Metrics Bento Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
        {/* Card 1 - Total wages (Slate Dark Navy bg) */}
        <div className="bg-[#0b0f1d] rounded-[2rem] sm:rounded-[2.3rem] p-5 sm:p-7 text-right shadow-md border border-slate-900 flex flex-col justify-between min-h-[150px] sm:min-h-[190px] relative overflow-hidden group">
          <div className="flex justify-end">
            <div className="w-10 h-10 sm:w-14 sm:h-14 bg-slate-800/40 text-slate-100 rounded-full flex items-center justify-center border border-slate-700/60 font-black font-sans text-lg sm:text-2xl shadow-inner shrink-0">
              $
            </div>
          </div>
          <div className="mt-2 sm:mt-4 space-y-1 sm:space-y-2">
            <span className="text-[11px] sm:text-[13px] font-black text-slate-300 block">إجمالي الأجور والمستحقات الكلية</span>
            <div className="flex items-baseline justify-end gap-1.5">
              <span className="text-[10px] sm:text-xs font-black text-slate-450 text-slate-400 font-sans leading-none">ج.م</span>
              <span className="text-2xl sm:text-4xl font-black text-white font-sans leading-none">
                {companyMetrics.totalOwed.toLocaleString()}
              </span>
            </div>
          </div>
          <p className="text-[10px] sm:text-[11px] font-bold text-slate-500 mt-3 sm:mt-6 leading-relaxed">
            الرواتب الثابتة والعمولات للشركاء بالفترة المحددة
          </p>
        </div>

        {/* Card 2 - Paid wages (Mint Green bg) */}
        <div className="bg-[#f0fdf4] rounded-[2rem] sm:rounded-[2.3rem] p-5 sm:p-7 text-right shadow-sm border border-emerald-100/90 flex flex-col justify-between min-h-[150px] sm:min-h-[190px] relative overflow-hidden group">
          <div className="flex justify-end">
            <div className="w-10 h-10 sm:w-14 sm:h-14 bg-emerald-100/40 text-emerald-600 rounded-full flex items-center justify-center border border-emerald-200/85 shadow-sm shrink-0">
              <Check size={20} className="stroke-[3.5] text-[#10b981]" />
            </div>
          </div>
          <div className="mt-2 sm:mt-4 space-y-1 sm:space-y-2">
            <span className="text-[11px] sm:text-[13px] font-black text-[#10b981] block">إجمالي المبالغ المدفوعة (تم تسديدها)</span>
            <div className="flex items-baseline justify-end gap-1.5">
              <span className="text-[10px] sm:text-xs font-black text-slate-400 font-sans leading-none">ج.م</span>
              <span className="text-2xl sm:text-4xl font-black text-[#1e293b] font-sans leading-none">
                {companyMetrics.totalPaid.toLocaleString()}
              </span>
            </div>
          </div>
          <p className="text-[10px] sm:text-[11px] font-bold text-emerald-600/90 mt-3 sm:mt-6 leading-relaxed">
            المبالغ التي تم دفعها وتسويتها بالفعل للموظفين
          </p>
        </div>

        {/* Card 3 - Pending wages (Teal Rose Red bg) */}
        <div className="bg-[#fff5f5] rounded-[2rem] sm:rounded-[2.3rem] p-5 sm:p-7 text-right shadow-sm border border-rose-100/90 flex flex-col justify-between min-h-[150px] sm:min-h-[190px] relative overflow-hidden group">
          <div className="flex justify-end">
            <div className="w-10 h-10 sm:w-14 sm:h-14 bg-rose-100/50 text-rose-600 rounded-full flex items-center justify-center border border-rose-200 shadow-sm shrink-0">
              <div className="w-5 h-5 sm:w-7 sm:h-7 rounded-full border-2 border-rose-500 flex items-center justify-center font-sans font-black text-xs sm:text-base text-rose-500">
                !
              </div>
            </div>
          </div>
          <div className="mt-2 sm:mt-4 space-y-1 sm:space-y-2">
            <span className="text-[11px] sm:text-[13px] font-black text-rose-600 block">مستحقات معلقة (متبقي عليك دفعه)</span>
            <div className="flex items-baseline justify-end gap-1.5">
              <span className="text-[10px] sm:text-xs font-black text-slate-400 font-sans leading-none">ج.م</span>
              <span className="text-2xl sm:text-4xl font-black text-rose-600 font-sans leading-none">
                {companyMetrics.totalPending.toLocaleString()}
              </span>
            </div>
          </div>
          <p className="text-[10px] sm:text-[11px] font-bold text-rose-600 mt-3 sm:mt-6 leading-relaxed">
            إجمالي المبالغ واليوميات المطلوبة لشركتنا متبقية للدفع
          </p>
        </div>
      </div>

      {/* Full width white pill for metrics summary and search filter bar */}
      <div className="bg-white rounded-[1.8rem] border border-slate-100/90 p-4 shadow-sm flex flex-col sm:flex-row items-center gap-4 justify-between" dir="rtl">
        {/* Search Input right aligned inside the container */}
        <div className="relative w-full sm:flex-1 max-w-xl">
          <input
            type="text"
            placeholder="ابحث باسم الموظف أو رقم الموبايل..."
            className="w-full bg-slate-50 border border-slate-100 hover:bg-slate-100/50 focus:bg-white rounded-full py-3.5 pr-11 pl-4 text-xs font-bold focus:ring-2 focus:ring-blue-105 outline-none text-right transition-all text-slate-700 placeholder:text-slate-400"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
        </div>

        {/* Metadata stats blocks left-aligned */}
        <div className="flex items-center justify-between sm:justify-end gap-6 shrink-0 border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-50 w-full sm:w-auto">
          <div className="text-right px-4 flex-1 sm:flex-none">
            <span className="text-[10px] font-black text-slate-400 block mb-0.5">إجمالي الموظفين</span>
            <span className="text-sm sm:text-base font-black text-slate-800 text-center block font-sans">{filteredStaff.length}</span>
          </div>

          <div className="text-right px-4 border-r border-slate-100 pr-5 flex-1 sm:flex-none">
            <span className="text-[10px] font-black text-slate-400 block mb-0.5">إجمالي الرواتب والعمولات المسجلة</span>
            <span className="text-sm sm:text-base font-black text-blue-600 block font-sans whitespace-nowrap">
              {companyMetrics.totalOwed.toLocaleString()} ج.م
            </span>
          </div>
        </div>
      </div>

      {/* Main Staff grid display cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
        {filteredStaff.length === 0 ? (
          <div className="col-span-1 lg:col-span-2 text-center p-12 bg-white rounded-[2rem] border border-slate-100 font-bold text-slate-400 text-xs">
            لا توجد أي حسابات موظفين مسجلة حالياً تطابق الاستعلام.
          </div>
        ) : (
          filteredStaff.map(u => {
            const billing = calculateUserBilling(u);
            const userRoleTitle = TEAM_ROLES.find(r => r.value === u.role)?.label.split(' ')[0] || "موظف";

            return (
              <div 
                key={u.id}
                className="bg-white rounded-[2rem] p-5 sm:p-6 border border-slate-100 shadow-sm hover:shadow-md transition-all flex flex-col justify-between gap-5 relative group"
              >
                {/* Header element within Card */}
                <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 border-b border-slate-50 pb-4">
                  
                  {/* Right side group: Avatar and textual profile details */}
                  <div className="flex items-center gap-3.5">
                    {/* Circle avatar */}
                    <div className="w-12 h-12 sm:w-14 sm:h-14 bg-slate-50 border border-slate-100/90 rounded-full flex items-center justify-center shrink-0 shadow-inner">
                      <Users size={20} className="text-slate-400 stroke-[1.8]" />
                    </div>
                    
                    <div className="text-right space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="font-black text-slate-800 text-sm sm:text-base leading-tight">{u.name}</h4>
                        {/* Custom Badge based on Role */}
                        <div className="flex items-center gap-1 bg-blue-50/70 text-blue-600 px-2 py-0.5 rounded-lg text-[9px] sm:text-[10px] font-black border border-blue-100/50 shrink-0">
                          <Shield size={10} className="stroke-[2.5]" />
                          <span>{u.jobTitle || userRoleTitle}</span>
                        </div>
                      </div>
                      
                      {/* Phone metadata info */}
                      <p className="flex items-center gap-1.5 text-[11px] text-slate-400 font-sans font-bold pt-0.5">
                        <Phone size={11} className="text-slate-300 shrink-0" />
                        <span>{u.phone || "بدون هاتف مسجل"}</span>
                      </p>
                    </div>
                  </div>

                  {/* Left elements: Action controllers to edit, view calendars etc. */}
                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end sm:justify-start">
                    {/* Task Organizer Trigger Option */}
                    <button
                      onClick={() => {
                        setSelectedStaffId(u.id);
                        setShowInlineTaskForm(false);
                        setEditingTask(null);
                      }}
                      className="flex-1 sm:flex-none bg-blue-50 hover:bg-blue-100 border border-blue-100/80 text-blue-600 font-extrabold px-3.5 py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95"
                    >
                      <Eye size={12} className="stroke-[2.5] text-blue-600 shrink-0" />
                      <span>منظم المهام والرواتب</span>
                    </button>

                    {/* Quick profile editor popup button */}
                    <button
                      onClick={() => handleOpenEditStaff(u)}
                      className="w-9 h-9 border border-slate-150 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl flex items-center justify-center transition-all cursor-pointer shrink-0"
                      title="تعديل حساب وصلاحيات الموظف"
                    >
                      <Pencil size={13} className="stroke-[2.5]" />
                    </button>

                    {/* Delete system profile accounts */}
                    {u.id !== currentUser?.id && (
                      <button
                        onClick={() => handleDeleteStaff(u.id, u.name)}
                        className="w-9 h-9 border border-rose-100 text-rose-400 hover:text-rose-650 hover:bg-rose-50 rounded-xl flex items-center justify-center transition-all cursor-pointer shrink-0"
                        title="حذف حساب الموظف"
                      >
                        <Trash2 size={13} className="stroke-[2.5]" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Dynamic numerical overview ledger cards inside profile listings matching mockup */}
                <div className="grid grid-cols-3 gap-2 bg-[#f8fafc]/70 p-3 sm:p-4 rounded-2xl border border-slate-100/80 text-center">
                  <div className="text-right pr-1 sm:pr-2">
                    <span className="text-[9px] sm:text-[9.5px] font-black text-slate-405 text-slate-400 block mb-1">المهام المسجلة</span>
                    <span className="text-[11px] sm:text-xs font-black text-slate-700 block leading-tight truncate">
                      {u.variableTasks && u.variableTasks.length > 0 
                        ? `${u.variableTasks.filter(t => t.type !== "deduction").length} مهمة/عمولة` 
                        : "لا يوجد"}
                    </span>
                  </div>

                  <div className="text-center border-r border-slate-100 pr-1">
                    <span className="text-[9px] sm:text-[9.5px] font-black text-slate-405 text-slate-400 block mb-1 font-sans">إجمالي مستحق</span>
                    <span className="text-[11px] sm:text-xs font-black text-slate-700 font-sans block leading-tight">
                      {billing.owed.toLocaleString()} ج
                    </span>
                  </div>

                  <div className="text-left pl-1 sm:pl-2 border-r border-slate-100 pr-1">
                    <span className="text-[9px] sm:text-[9.5px] font-black text-slate-405 text-slate-400 block mb-1 font-sans">المتبقي له</span>
                    <span className="text-[11px] sm:text-xs font-black text-rose-600 font-sans block leading-tight">
                      {billing.balance.toLocaleString()} ج
                    </span>
                  </div>
                </div>

                {/* Footer details within Card detailing system authorization and permissions */}
                <div className="flex flex-wrap items-center justify-start gap-1 pb-1 pt-3.5 border-t border-slate-50 text-[10px] sm:text-[11px] font-black text-slate-500">
                  <span className="text-slate-400 text-[10px] shrink-0 pl-1.5">صلاحيات الموظف على النظام:</span>
                  <div className="flex items-center gap-1 flex-wrap">
                    {u.role === "owner" || (u.permissions || []).includes("all") ? (
                      <span className="bg-purple-50 text-purple-600 border border-purple-100 px-2 py-0.5 rounded-lg text-[9px] sm:text-[10px] font-black flex items-center gap-1 shadow-sm">
                        <Check size={11} className="stroke-[3.5] text-purple-600" />
                        <span>كل الصلاحيات</span>
                      </span>
                    ) : (u.permissions && u.permissions.length > 0) ? (
                      u.permissions.map(pId => {
                        const permLabel = PERMISSIONS_LIST.find(p => p.id === pId)?.label || pId;
                        return (
                          <span key={pId} className="bg-slate-100 text-slate-600 border border-slate-200/50 px-2 py-0.5 rounded-lg text-[9px] font-black shrink-0">
                            {permLabel}
                          </span>
                        );
                      })
                    ) : (
                      <span className="text-slate-400 italic">لا توجد صلاحيات مفعّلة</span>
                    )}
                  </div>
                </div>

              </div>
            );
          })
        )}
      </div>

      {/* Task & Ledger Organizer Backdrop (منظم المهام والتقويم) */}
      {selectedStaff && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[115] flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-xl rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col max-h-[92vh] text-right">
            
            {/* Header */}
            <div className="p-6 pb-4 bg-white border-b border-slate-100 flex justify-between items-center" dir="rtl">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 bg-blue-50 text-blue-600 rounded-[1rem] flex items-center justify-center border border-blue-50 shrink-0">
                  <Calendar size={20} className="stroke-[2.2] text-blue-600" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-800">منظم المهام والتقويم</h3>
                  <p className="text-[10px] font-bold text-slate-400 mt-0.5">حسابات والبدلات الفردية لـ {(selectedStaff as User).name}</p>
                </div>
              </div>
              
              <button 
                type="button" 
                onClick={() => setSelectedStaffId(null)}
                className="text-slate-850 hover:text-slate-900 text-xl font-black transition-all cursor-pointer p-1.5"
              >
                ✕
              </button>
            </div>

            {/* Scrollable details content */}
            <div className="p-6 overflow-y-auto max-h-[78vh] space-y-6">
              
              {/* Profile Briefing and stats cards inside ledger popup */}
              <div className="bg-[#f0f7ff]/40 p-5 rounded-[2rem] border border-blue-105/60 space-y-4">
                <div className="flex items-center gap-3 pb-3 border-b border-blue-100/50">
                  <div className="w-10 h-10 bg-white border border-blue-100 rounded-full flex items-center justify-center shrink-0">
                    🧑‍💼
                  </div>
                  <div>
                    <strong className="text-sm font-black text-slate-850 block">{(selectedStaff as User).name}</strong>
                    <span className="text-[10.5px] font-medium text-slate-450 block text-slate-400">{(selectedStaff as User).jobTitle || "موظف مبيعات وتغليف"}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3" dir="rtl">
                  <div className="bg-white p-3.5 rounded-2xl border border-slate-105 shadow-inner text-right">
                    <span className="text-[10px] text-slate-400 font-extrabold block mb-0.5">إجمالي مستحق بدلات</span>
                    <strong className="text-sm font-black text-slate-800 font-sans block">{calculateUserBilling(selectedStaff).owed.toLocaleString()} ج.م</strong>
                  </div>

                  <div className="bg-white p-3.5 rounded-2xl border border-slate-105 shadow-inner text-right">
                    <span className="text-[10px] text-slate-400 font-extrabold block mb-0.5">إجمالي المقبوض والمدفوع</span>
                    <strong className="text-sm font-black text-emerald-600 font-sans block">{calculateUserBilling(selectedStaff).paid.toLocaleString()} ج.م</strong>
                  </div>

                  <div className="col-span-2 bg-blue-600 text-white p-4 rounded-2xl shadow-md shadow-blue-100 flex justify-between items-center leading-none">
                    <span className="text-[11px] font-black object-contain">صافي متقاضي الحساب المستحق المتبقي:</span>
                    <span className="text-base font-sans font-black">
                      {calculateUserBilling(selectedStaff).balance.toLocaleString()} ج.م
                    </span>
                  </div>
                </div>
              </div>

              {/* Transactions list header control and details mapping */}
              <div className="space-y-4 text-right">
                <div className="flex items-center justify-between gap-4">
                  <button
                    type="button"
                    onClick={handleOpenAddTask}
                    className="bg-blue-50 hover:bg-blue-100 text-blue-600 font-black px-4 py-2 rounded-xl text-xs flex items-center justify-center gap-1 transition-all cursor-pointer border border-blue-50 shadow-sm"
                  >
                    <span>+ إضافة بند مالي جديد</span>
                  </button>

                  <span className="text-xs font-black text-slate-500">بنود البدلات والخصميات الفردية</span>
                </div>

                {/* Inline creator dynamic form */}
                {showInlineTaskForm && (
                  <form onSubmit={handleSaveTask} className="bg-slate-50 p-5 rounded-[1.8rem] border border-slate-205 shadow-inner space-y-4 text-right animate-in slide-in-from-top-3">
                    <span className="text-xs font-black text-blue-600 block">
                      {editingTask ? "تعديل بند استحقاق" : "إدراج بند مالي جديد"}
                    </span>

                    <div className="space-y-1 text-right">
                      <label className="text-[10px] font-bold text-slate-400 pr-1">بيان ووصف الاستحقاق/الخصم</label>
                      <input
                        type="text"
                        required
                        className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs font-bold outline-none text-right"
                        placeholder="مثل: مكافأة مبيعات الأسبوع / يومية شغل الأحد"
                        value={taskForm.description}
                        onChange={e => setTaskForm({ ...taskForm, description: e.target.value })}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 pr-1 text-right block">القيمة المقررة (ج.م)</label>
                        <input
                          type="number"
                          required
                          className="w-full bg-white border border-slate-200 rounded-xl p-3 text-center text-xs font-sans font-black text-slate-800"
                          value={taskForm.amount || ""}
                          onChange={e => {
                            const val = parseFloat(e.target.value) || 0;
                            setTaskForm({ ...taskForm, amount: val, paidAmount: val });
                          }}
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 pr-1 text-right block">المسدد والمدفوع (ج.م)</label>
                        <input
                          type="number"
                          required
                          className="w-full bg-white border border-slate-200 rounded-xl p-3 text-center text-xs font-sans font-black text-emerald-600"
                          value={taskForm.paidAmount || ""}
                          onChange={e => setTaskForm({ ...taskForm, paidAmount: parseFloat(e.target.value) || 0 })}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 pr-1">التصنيف والنوع</label>
                        <select
                          value={taskForm.type}
                        onChange={e => setTaskForm({ ...taskForm, type: e.target.value as "daily" | "extra" | "deduction" })}
                          className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs font-bold"
                        >
                          <option value="extra">مكافأة / حافز 🟢</option>
                          <option value="daily">أجرة يومية 🔵</option>
                          <option value="deduction">خصم / جزاء 🔴</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 pr-1">روبط التاريخ</label>
                        <input
                          type="date"
                          required
                          className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs font-bold text-center"
                          value={taskForm.date}
                          onChange={e => setTaskForm({ ...taskForm, date: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 pr-1">ملاحظة إضافية </label>
                      <input
                        type="text"
                        className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs font-bold"
                        placeholder="مثل: عطلة العيد / خصم غياب..."
                        value={taskForm.notes}
                        onChange={e => setTaskForm({ ...taskForm, notes: e.target.value })}
                      />
                    </div>

                    <div className="flex gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setShowInlineTaskForm(false)}
                        className="w-1/3 bg-slate-200 font-black py-2.5 rounded-xl text-xs text-slate-600 cursor-pointer"
                      >
                        إلغاء التراجع
                      </button>
                      <button
                        type="submit"
                        className="w-2/3 bg-blue-650 bg-blue-600 hover:bg-blue-700 text-white font-black py-2.5 rounded-xl text-xs shadow-md shadow-blue-50 cursor-pointer"
                      >
                        حفظ البند المالي الحالي
                      </button>
                    </div>

                  </form>
                )}

                {/* Ledger entries render */}
                <div className="space-y-2">
                  {(!(selectedStaff as User).variableTasks || (selectedStaff as User).variableTasks.length === 0) ? (
                    <p className="p-8 text-[11px] text-slate-400 font-bold text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                      لا توجد أي بدلات، تفرغات حافزية، أو خصميات مسجلة لهذا الطاقم بعد.
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                      {(selectedStaff as User).variableTasks.map((vt: import('../types').VariableTask) => {
                        const isBonus = vt.type !== "deduction";
                        return (
                          <div 
                            key={vt.id}
                            className="bg-slate-50 hover:bg-slate-100/50 border border-slate-150 p-4 rounded-2xl relative flex justify-between items-center gap-3 transition-all"
                          >
                            <div className="space-y-1">
                              <span className="font-extrabold text-slate-800 text-xs block">{vt.description || vt.name}</span>
                              <span className="text-[10px] text-slate-400 font-sans block mt-0.5">
                                التاريخ: {vt.date} {vt.notes ? `(${vt.notes})` : ""}
                              </span>
                            </div>

                            <div className="flex items-center gap-3 font-sans shrink-0">
                              <div className="text-left font-sans text-xs">
                                <span className={`font-black block ${isBonus ? "text-emerald-650 text-emerald-600" : "text-rose-600"}`}>
                                  {isBonus ? "+" : "-"} {vt.amount.toLocaleString()} ج.م
                                </span>
                                <span className="text-[9px] text-slate-450 block text-slate-400 mt-0.5">سدد: {vt.paidAmount || 0} ج</span>
                              </div>

                              {/* Edit or Delete entry controllers */}
                              <div className="flex flex-col gap-1.5 shrink-0 border-r border-slate-200 pr-3 mr-3">
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditTask(vt)}
                                  className="text-blue-500 hover:text-blue-700 font-black cursor-pointer text-[10px]"
                                >
                                  تعديل ✏️
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteTask(vt.id)}
                                  className="text-rose-500 hover:text-rose-700 font-black cursor-pointer text-[10px]"
                                >
                                  حذف ✕
                                </button>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

              </div>

            </div>

            {/* Save Close Footer */}
            <div className="p-4 border-t border-slate-50">
              <button
                type="button"
                onClick={() => setSelectedStaffId(null)}
                className="w-full bg-slate-900 hover:bg-slate-850 text-white font-black py-3.5 rounded-2xl text-xs sm:text-sm active:scale-[0.99] cursor-pointer"
              >
                إغلاق المنظم بنجاح
              </button>
            </div>

          </div>
        </div>
      )}

      {/* modal - Add Staff Account Profile popup */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-xl rounded-[2.5rem] overflow-hidden shadow-2xl p-6 md:p-8 text-right space-y-6 max-h-[90vh] overflow-y-auto" dir="rtl">
            <h3 className="text-lg font-black text-slate-800 flex items-center gap-2 pb-3.5 border-b border-slate-100">
              <Key size={20} className="text-blue-650" />
              <span>{editingStaff ? "تحرير صلاحيات وحساب الموظف" : "تسجيل موظف جديد بالفريق"}</span>
            </h3>

            <form onSubmit={handleSaveStaff} className="space-y-6 text-xs font-bold leading-relaxed text-right">
              {/* Single unified grid for pristine alignment */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-650 block font-black">الاسم *</label>
                  <input
                    type="text"
                    required
                    className="w-full bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 outline-none focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-550 transition-all font-bold text-slate-700"
                    placeholder="مثال: آية محمود"
                    value={staffForm.name}
                    onChange={e => setStaffForm({ ...staffForm, name: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-slate-650 block font-black">رقم الهاتف</label>
                  <input
                    type="text"
                    className="w-full bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 outline-none focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-550 transition-all text-left font-mono font-bold text-slate-700 placeholder:text-right"
                    placeholder="رقم الموبايل"
                    value={staffForm.phone}
                    onChange={e => setStaffForm({ ...staffForm, phone: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-slate-650 block font-black">البريد الإلكتروني *</label>
                  <input
                    type="email"
                    required
                    className="w-full bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 outline-none focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-550 transition-all text-left font-bold text-slate-700 placeholder:text-right"
                    placeholder="الحساب أو الإيميل"
                    value={staffForm.email}
                    onChange={e => setStaffForm({ ...staffForm, email: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-slate-650 block font-black">كلمة المرور *</label>
                  <input
                    type="text"
                    required
                    className="w-full bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 outline-none focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-550 transition-all text-left font-mono font-bold text-slate-700 placeholder:text-right"
                    placeholder="كلمة السر للدخول"
                    value={staffForm.password || ""}
                    onChange={e => setStaffForm({ ...staffForm, password: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-slate-650 block font-black">نوع الحساب *</label>
                  <select
                    value={staffForm.role}
                    onChange={e => setStaffForm({ ...staffForm, role: e.target.value as "owner" | "manager" | "staff" })}
                    className="w-full bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 outline-none focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-550 transition-all font-black text-slate-700"
                  >
                    {TEAM_ROLES.map(r => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-slate-650 block font-black">اللقب الوظيفي</label>
                  <input
                    type="text"
                    className="w-full bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 outline-none focus:bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-550 transition-all font-bold text-slate-700"
                    placeholder="الوظيفة أو التخصص"
                    value={staffForm.jobTitle || ""}
                    onChange={e => setStaffForm({ ...staffForm, jobTitle: e.target.value })}
                  />
                </div>
              </div>

              {/* Screen permissions checkboxes checklist */}
              <div className="space-y-3.5 border-t border-slate-100 pt-4">
                <label className="text-sm font-black text-slate-800 block">الصلاحيات:</label>
                
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 pt-1">
                  {PERMISSIONS_LIST.map(perm => {
                    const active = staffForm.permissions.includes(perm.id);
                    return (
                      <button
                        type="button"
                        key={perm.id}
                        onClick={() => handleTogglePermission(perm.id)}
                        className={`p-3.5 rounded-2xl border text-right font-black flex items-center gap-2.5 transition-all outline-none cursor-pointer ${
                          active 
                            ? "bg-blue-50/70 text-blue-800 border-blue-600 shadow-sm scale-[1.01]" 
                            : "bg-white border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-slate-805"
                        }`}
                      >
                        {active ? <CheckSquare size={16} className="text-blue-600" /> : <Square size={16} className="text-slate-300" />}
                        <span className="text-xs">{perm.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="w-1/3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-extrabold py-3.5 rounded-2xl text-xs transition-colors cursor-pointer"
                >
                  تراجع
                </button>
                <button
                  type="submit"
                  className="w-2/3 bg-blue-600 hover:bg-blue-700 text-white font-extrabold py-3.5 rounded-2xl text-xs shadow-lg shadow-blue-100 hover:shadow-xl transition-all cursor-pointer"
                >
                  حفظ وتأكيد حساب الموظف 💾
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Dialog: Staff Deletion Confirmation */}
      {staffToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[125] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] max-w-md w-full p-6 shadow-2xl border border-slate-105 text-right animate-in zoom-in-95 duration-200 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <span className="p-3 bg-rose-50 rounded-2xl shrink-0">
                <Trash2 size={24} />
              </span>
              <div>
                <h3 className="text-lg font-black text-slate-900">تأكيد حذف الموظف نهائياً؟</h3>
                <p className="text-xs text-slate-405 font-semibold text-slate-400">إجراء لا رجعة فيه للأمان والمحاسبة</p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2 text-xs leading-relaxed font-bold">
              <p>
                أنتِ على وشك سحق ملف الموظفة <span className="text-rose-600 font-black">"{staffToDelete.name}"</span> ومسح حساب دخولها وصلاحياتها بالكامل من السيستم.
              </p>
              <div className="text-[11px] text-slate-500 list-disc pr-4 space-y-1 font-semibold leading-relaxed">
                <p>• سيتم قفل صلاحياتها بالكامل فورياً عن واجهة المبيعات والمخزن.</p>
                <p>• لن يؤدي هذا الإجراء لحذف سجل الحسابات الباقي للمبيعات السابقة حماية للمحاسبة التاريخية.</p>
              </div>
            </div>

            <div className="flex gap-3 font-sans pt-2">
              <button
                type="button"
                onClick={() => setStaffToDelete(null)}
                className="w-1/3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-extrabold py-3.5 rounded-2xl text-xs cursor-pointer"
              >
                تراجع وإبقاء
              </button>
              <button
                type="button"
                onClick={executeDeleteStaff}
                className="w-2/3 bg-rose-600 hover:bg-rose-700 text-white font-extrabold py-3.5 rounded-2xl text-xs shadow-lg shadow-rose-100 cursor-pointer flex items-center justify-center gap-2"
              >
                <span>نعم، احذفي حسابها نهائياً 🗑️</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Dialog: Ledger Task Deletion Confirmation */}
      {taskToDeleteId && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[130] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] max-w-sm w-full p-6 shadow-xl border border-slate-100 text-right animate-in zoom-in-95 duration-200 space-y-4">
            <div className="text-amber-600 flex items-center gap-2">
              <span className="p-2 bg-amber-50 rounded-xl">⚠️</span>
              <h3 className="text-base font-black text-slate-900">حذف البند المالي؟</h3>
            </div>
            
            <p className="text-xs text-slate-500 font-semibold leading-relaxed">
              هل أنت متأكدة من رغبتك في حذف هذا البند الصادر (الحافز/العقوبة/الراتب) بشكل نهائي من كشف حساب هذه الموظفة؟
            </p>

            <div className="flex gap-3 font-sans pt-2">
              <button
                type="button"
                onClick={() => setTaskToDeleteId(null)}
                className="w-1/2 bg-slate-100 hover:bg-slate-200 text-slate-500 font-extrabold py-3 rounded-2xl text-xs cursor-pointer"
              >
                إلغاء وتراجع
              </button>
              <button
                type="button"
                onClick={executeDeleteTask}
                className="w-1/2 bg-rose-600 hover:bg-rose-700 text-white font-extrabold py-3 rounded-2xl text-xs shadow-lg shadow-rose-100 cursor-pointer"
              >
                تأكيد حذف نهائي
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Dialog: Safety/Error Notification */}
      {errorMessage && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[135] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] max-w-sm w-full p-6 shadow-2xl border border-slate-150 text-right animate-in zoom-in-95 duration-200 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <span className="p-3 bg-rose-50 rounded-2xl text-xl shrink-0">🛡️</span>
              <div>
                <h3 className="text-base font-black text-slate-900">تنبيه الحماية والأمان</h3>
                <p className="text-[10px] text-slate-400 font-semibold">حماية السيستم والوصول</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 font-bold leading-relaxed">
              {errorMessage}
            </p>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setErrorMessage(null)}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black py-3.5 rounded-2xl text-xs shadow-md cursor-pointer"
              >
                حسناً، فهمت ذلك 👍
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
