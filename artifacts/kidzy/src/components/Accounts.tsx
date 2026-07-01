import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Wallet, Plus, Trash2, Receipt, 
  ArrowDownCircle, TrendingDown, Search, Filter, 
  ChevronDown, DollarSign, ArrowUpCircle, Edit2, X, Save, AlertTriangle,
  Scissors, Coins, Calculator
} from 'lucide-react';
import { GeneralExpense, Order, OrderItem } from '../types';

export function Accounts() {
  const { users, workers, orders, generalExpenses, setGeneralExpenses, products } = useApp();
  
  // States
  const [activeTab, setActiveTab] = useState<'expenses' | 'workshop'>('expenses');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expenseToDelete, setExpenseToDelete] = useState<string | null>(null);
  
  // Workshop-specific states
  const currentMonthStr = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }, []);
  const [selectedWorkshopMonth, setSelectedWorkshopMonth] = useState<string>(currentMonthStr);
  const [workshopStatusFilter, setWorkshopStatusFilter] = useState<string>('all-active'); // 'all-active' | 'delivered' | 'shipped' | 'manufactured' | 'all'
  const [workshopSearchQuery, setWorkshopSearchQuery] = useState('');

  // Extract dynamically actual year-month strings present in the system's orders
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    (orders || []).forEach(o => {
      if (o.creationDate) {
        const d = new Date(o.creationDate);
        if (!isNaN(d.getTime())) {
          const y = d.getFullYear();
          const m = String(d.getMonth() + 1).padStart(2, '0');
          months.add(`${y}-${m}`);
        }
      }
    });
    return Array.from(months).sort().reverse();
  }, [orders]);

  // New Expense Form State
  const [newExpense, setNewExpense] = useState<Partial<GeneralExpense>>({
    date: new Date().toISOString(),
    category: '╪ú╪«╪▒┘ë',
    description: '',
    amount: 0,
    paidAmount: undefined,
    notes: ''
  });

  const [categories, setCategories] = useState(['╪«╪º┘à╪º╪¬', '╪¬╪│┘ê┘è┘é', '╪¬╪║┘ä┘è┘ü', '╪ú╪«╪▒┘ë']);
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  const autoCategory = (desc: string) => {
    const map: Record<string, string> = {
      '╪«╪º┘à': '╪«╪º┘à╪º╪¬',
      '┘é┘à╪º╪┤': '╪«╪º┘à╪º╪¬',
      '╪«┘è╪╖': '╪«╪º┘à╪º╪¬',
      '╪║┘ä╪º┘ü': '╪¬╪║┘ä┘è┘ü',
      '╪┤┘å╪╖': '╪¬╪║┘ä┘è┘ü',
      '┘â╪▒╪¬┘ê┘å': '╪¬╪║┘ä┘è┘ü',
      '╪¬╪║┘ä┘è┘ü': '╪¬╪║┘ä┘è┘ü',
      '┘ü┘è╪│╪¿┘ê┘â': '╪¬╪│┘ê┘è┘é',
      '╪Ñ╪╣┘ä╪º┘å': '╪¬╪│┘ê┘è┘é',
      '╪│┘ê╪┤┘è╪º┘ä': '╪¬╪│┘ê┘è┘é',
      '╪¬╪│┘ê┘è┘é': '╪¬╪│┘ê┘è┘é'
    };

    for (const [key, cat] of Object.entries(map)) {
      if (desc.includes(key)) return cat;
    }
    return '╪ú╪«╪▒┘ë';
  };

  // Categories Color Map
  const categoryColors: Record<string, string> = {
    '╪«╪º┘à╪º╪¬': 'bg-amber-100 text-amber-600',
    '╪¬╪│┘ê┘è┘é': 'bg-pink-100 text-pink-600',
    '╪¬╪║┘ä┘è┘ü': 'bg-indigo-100 text-indigo-600',
    '╪ú╪«╪▒┘ë': 'bg-gray-100 text-gray-650'
  };

  // Financial Summary Calculation
  const stats = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const isInMonth = (dateStr: string) => {
      const d = new Date(dateStr);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    };

    // 1. Money Out (Expenses + Payments + Manufacturing Cost)
    const monthGeneral = (generalExpenses || []).filter(e => isInMonth(e.date)).reduce((sum, e) => {
      const paid = e.paidAmount !== undefined ? e.paidAmount : e.amount;
      return sum + (paid || 0);
    }, 0);
    const monthWorkerPayments = (workers || []).flatMap(w => (w.payments || []).filter(p => isInMonth(p.date))).reduce((sum, p) => sum + (p.amount || 0), 0);
    const monthStaffExtra = (users || []).flatMap(u => (u.variableTasks || []).filter(t => isInMonth(t.date))).reduce((sum, t) => sum + (t.amount || 0), 0);
    const monthStaffFixed = (users || []).reduce((sum, u) => sum + (u.staffRoles || []).reduce((ra, r) => ra + (r.pay || 0), 0), 0);
    
    // Month Manufacturing Costs using the precise formula
    const monthOrders = (orders || []).filter(o => isInMonth(o.creationDate) && o.status !== 'cancelled');
    const monthMfgCost = monthOrders.reduce((sum, order) => {
      const orderItemsMfgCost = (order.items || []).reduce((itemAcc, item) => {
        const product = products.find(p => p.id === item.productId);
        const unitMfgCost = product ? ((product.materialsCost || 0) + (product.workshopFee || 0)) : 0;
        return itemAcc + (unitMfgCost * item.quantity);
      }, 0);
      return sum + orderItemsMfgCost;
    }, 0);

    const totalOut = monthGeneral + monthWorkerPayments + monthStaffExtra + monthStaffFixed + monthMfgCost;

    const getOrderRevenue = (o: Order) => {
      if (o.status === 'cancelled' || o.status === 'returned') return 0;
      const activeItemsTotal = o.items
        .filter(i => !i.isReturned && i.productionStatus !== 'cancelled')
        .reduce((sum, i) => sum + (i.price * i.quantity), 0);
      return activeItemsTotal + (o.shippingPaid ? 0 : (o.shippingAmount || 0)) - (Number(o.discount) || 0);
    };

    // 2. Money In (Revenue from non-cancelled, non-fully-returned orders this month)
    const totalIn = (orders || [])
      .filter(o => isInMonth(o.creationDate))
      .reduce((sum, o) => sum + getOrderRevenue(o), 0);

    const netProfit = totalIn - totalOut;

    // Filtered Expenses for the list
    const filteredExpenses = (generalExpenses || []).filter(exp => {
      const matchesSearch = exp.description.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           exp.category.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = categoryFilter === 'all' || exp.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });

    const totalRemainingDebts = (generalExpenses || []).reduce((sum, e) => {
      const paid = e.paidAmount !== undefined ? e.paidAmount : e.amount;
      return sum + Math.max(0, e.amount - paid);
    }, 0);

    return {
      totalIn,
      totalOut,
      netProfit,
      filteredExpenses,
      totalRemainingDebts,
      monthMfgCost,
      monthGeneral,
      monthWorkerPayments,
      monthStaffExtra,
      monthStaffFixed
    };
  }, [generalExpenses, workers, users, orders, searchQuery, categoryFilter, products]);

  // Workshop & Manufacturing Filter & Calculations Memo
  const workshopStats = useMemo(() => {
    const filteredOrders = (orders || []).filter(order => {
      // 1. Date filter
      if (selectedWorkshopMonth !== 'all') {
        if (!order.creationDate) return false;
        const d = new Date(order.creationDate);
        if (isNaN(d.getTime())) return false;
        const yearMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (yearMonth !== selectedWorkshopMonth) return false;
      }

      // 2. Status filter
      if (workshopStatusFilter === 'all-active') {
        if (order.status === 'cancelled') return false;
      } else if (workshopStatusFilter === 'delivered') {
        if (order.status !== 'delivered') return false;
      } else if (workshopStatusFilter === 'shipped') {
        if (order.status !== 'out_for_delivery' && order.status !== 'in_delivery') return false;
      } else if (workshopStatusFilter === 'manufactured') {
        if (order.status !== 'manufactured') return false;
      } else if (workshopStatusFilter === 'cancelled') {
        if (order.status !== 'cancelled') return false;
      }

      // 3. Search query
      if (workshopSearchQuery) {
        const query = workshopSearchQuery.toLowerCase();
        const matchesName = order.customerName.toLowerCase().includes(query) || (order.childName || '').toLowerCase().includes(query);
        const matchesId = order.id.toLowerCase().includes(query);
        if (!matchesName && !matchesId) return false;
      }

      return true;
    });

    let totalMfgCost = 0;
    let totalWorkshopFees = 0;
    let totalMaterialsCost = 0;
    let totalPriceDiffs = 0;
    let totalItemsCount = 0;

    const orderDetails = filteredOrders.map(order => {
      let orderWorkshopFees = 0;
      let orderMaterialsCost = 0;
      let orderPriceDiffs = 0;
      let orderMfgCost = 0;
      let orderItemCount = 0;

      const itemsDetail = (order.items || []).map(item => {
        if (item.productionStatus === 'cancelled') {
          return {
            ...item,
            unitMfgCost: 0,
            unitWorkshopFee: 0,
            unitMaterialsCost: 0,
            priceDiff: 0,
            itemTotalMfg: 0,
            itemTotalWorkshop: 0
          };
        }

        const product = products.find(p => p.id === item.productId);
        const unitWorkshopFee = product ? (product.workshopFee || 0) : 0;
        const unitMaterialsCost = product ? (product.materialsCost || 0) : 0;
        const unitMfgCost = unitWorkshopFee + unitMaterialsCost;
        
        const priceDiff = (product && item.price > product.sellingPrice) ? (item.price - product.sellingPrice) : 0;
        const finalUnitMfgCost = unitMfgCost + priceDiff;

        const itemTotalMfg = finalUnitMfgCost * item.quantity;
        const itemTotalWorkshop = unitWorkshopFee * item.quantity;
        const itemTotalMaterials = unitMaterialsCost * item.quantity;
        const itemTotalPriceDiff = priceDiff * item.quantity;

        orderWorkshopFees += itemTotalWorkshop;
        orderMaterialsCost += itemTotalMaterials;
        orderPriceDiffs += itemTotalPriceDiff;
        orderMfgCost += itemTotalMfg;
        orderItemCount += item.quantity;

        return {
          ...item,
          unitMfgCost: finalUnitMfgCost,
          unitWorkshopFee,
          unitMaterialsCost,
          priceDiff,
          itemTotalMfg,
          itemTotalWorkshop
        };
      });

      totalMfgCost += orderMfgCost;
      totalWorkshopFees += orderWorkshopFees;
      totalMaterialsCost += orderMaterialsCost;
      totalPriceDiffs += orderPriceDiffs;
      totalItemsCount += orderItemCount;

      return {
        order,
        itemsDetail,
        orderWorkshopFees,
        orderMaterialsCost,
        orderPriceDiffs,
        orderMfgCost,
        orderItemCount
      };
    });

    return {
      filteredOrdersCount: filteredOrders.length,
      totalItemsCount,
      totalMfgCost,
      totalWorkshopFees,
      totalMaterialsCost,
      totalPriceDiffs,
      orderDetails
    };
  }, [orders, products, selectedWorkshopMonth, workshopStatusFilter, workshopSearchQuery]);

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExpense.description || !newExpense.amount) return;
    
    const expense: GeneralExpense = {
      id: `EXP-${Date.now()}`,
      date: newExpense.date || new Date().toISOString(),
      category: newExpense.category || '╪ú╪«╪▒┘ë',
      description: newExpense.description || '',
      amount: newExpense.amount || 0,
      paidAmount: newExpense.paidAmount !== undefined ? newExpense.paidAmount : newExpense.amount,
      notes: newExpense.notes || ''
    };

    setGeneralExpenses([expense, ...generalExpenses]);
    setNewExpense({ 
      date: new Date().toISOString(), 
      category: '╪ú╪«╪▒┘ë', 
      description: '', 
      amount: 0,
      paidAmount: undefined,
      notes: ''
    });
    setIsAdding(false);
  };

  const deleteExpense = (id: string) => {
    setExpenseToDelete(id);
  };

  const startEdit = (exp: GeneralExpense) => {
    setEditingId(exp.id);
    setNewExpense({ ...exp });
    setIsAdding(true);
  };

  const saveEdit = () => {
    if (!editingId) return;
    setGeneralExpenses(generalExpenses.map(e => e.id === editingId ? { ...e, ...newExpense } as GeneralExpense : e));
    setEditingId(null);
    setNewExpense({ 
      date: new Date().toISOString(), 
      category: '╪ú╪«╪▒┘ë', 
      description: '', 
      amount: 0,
      paidAmount: undefined,
      notes: ''
    });
    setIsAdding(false);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-24 text-right" dir="rtl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2 justify-start">
             ╪º┘ä╪«╪▓┘è┘å╪⌐ ┘ê╪º┘ä╪¡╪│╪º╪¿╪º╪¬
            <Wallet className="text-blue-500" />
          </h2>
          <p className="text-slate-400 font-bold text-sm mt-1">╪Ñ╪¼┘à╪º┘ä┘è ╪º┘ä┘à╪»╪º╪«┘è┘ä ┘ê╪º┘ä┘à╪╡╪º╪▒┘è┘ü ┘ê╪┤╪║┘ä ╪º┘ä┘ê╪▒╪┤╪⌐</p>
        </div>
      </div>

      {/* Unified Filter Bar (The single filter selector requests to adjust shown list) */}
      <div className="bg-white p-4 rounded-[2.5rem] border border-slate-100 shadow-sm relative z-10 animate-in fade-in duration-200">
        <div className="flex flex-col lg:flex-row gap-4 items-center">
          {/* Account/Section Filter Selector */}
          <div className="relative w-full lg:w-72">
            <span className="absolute right-3 top-[-8px] bg-white px-1 text-[9px] font-black text-slate-400">┘é╪│┘à ╪º┘ä╪¡╪│╪º╪¿╪º╪¬</span>
            <select
              value={activeTab}
              onChange={(e) => setActiveTab(e.target.value as 'expenses' | 'workshop')}
              className="bg-slate-50 border border-slate-100 rounded-2xl py-3 pr-4 pl-10 text-xs font-black text-slate-700 outline-none cursor-pointer hover:bg-slate-100 transition-colors w-full"
            >
              <option value="expenses">≡ƒÆ╕ ╪º┘ä┘à╪╡╪º╪▒┘è┘ü ╪º┘ä╪╣╪º┘à╪⌐ ┘ê╪º┘ä╪«╪▓┘è┘å╪⌐</option>
              <option value="workshop">≡ƒº╡ ╪¡╪│╪º╪¿ ╪¬┘â┘ä┘ü╪⌐ ╪º┘ä╪¬╪╡┘å┘è╪╣ ┘ä┘ä╪╖┘ä╪¿╪º╪¬</option>
            </select>
          </div>

          {activeTab === 'expenses' ? (
            <>
              {/* Search */}
              <div className="relative flex-1 w-full">
                <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  placeholder="╪º╪¿╪¡╪½ ╪¿┘ê╪╡┘ü ╪º┘ä┘à╪╡╪▒┘ê┘ü ╪ú┘ê ╪¿╪º┘ä╪¬╪╡┘å┘è┘ü..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 border-none rounded-2xl py-3 pr-11 pl-4 text-sm font-bold focus:ring-2 focus:ring-blue-100 transition-all text-right outline-none"
                />
              </div>

              {/* Category selector filter */}
              <div className="relative w-full lg:w-48">
                <span className="absolute right-3 top-[-8px] bg-white px-1 text-[9px] font-black text-slate-400">╪º┘ä╪¬╪╡┘å┘è┘ü</span>
                <select 
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-100 rounded-2xl py-3.5 pr-4 pl-10 text-xs font-black text-slate-600 outline-none cursor-pointer hover:bg-slate-100 transition-colors w-full"
                >
                  <option value="all">┘â┘ä ╪º┘ä╪¬╪╡┘å┘è┘ü╪º╪¬</option>
                  {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>

              {/* Add Expense Trigger */}
              <button 
                onClick={() => setIsAdding(!isAdding)}
                className="bg-slate-900 text-white px-6 py-3 rounded-2xl flex items-center justify-center gap-2 font-black transition-all shadow-xl shadow-slate-100 hover:scale-[1.02] w-full lg:w-auto"
              >
                {isAdding ? <X size={20} /> : <Plus size={20} />}
                <span>{isAdding ? '╪Ñ┘ä╪║╪º╪í ╪º┘ä╪Ñ╪╢╪º┘ü╪⌐' : '╪Ñ╪╢╪º┘ü╪⌐ ┘à╪╡╪▒┘ê┘ü ╪¼╪»┘è╪»'}</span>
              </button>
            </>
          ) : (
            <>
              {/* Workshop search */}
              <div className="relative flex-1 w-full text-right">
                <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  placeholder="╪º╪¿╪¡╪½ ╪¿╪▒┘é┘à ╪º┘ä╪ú┘ê╪▒╪»╪▒ ╪ú┘ê ╪º╪│┘à ╪º┘ä╪╣┘à┘è┘ä..."
                  value={workshopSearchQuery}
                  onChange={(e) => setWorkshopSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 border-none rounded-2xl py-3 pr-11 pl-4 text-sm font-bold focus:ring-2 focus:ring-blue-100 transition-all text-right outline-none"
                />
              </div>

              {/* Month Selector Filter */}
              <div className="relative w-full lg:w-48">
                <span className="absolute right-3 top-[-8px] bg-white px-1 text-[9px] font-black text-slate-400">╪¬╪╡┘ü┘è╪⌐ ╪¿╪º┘ä╪┤┘ç╪▒</span>
                <select
                  value={selectedWorkshopMonth}
                  onChange={(e) => setSelectedWorkshopMonth(e.target.value)}
                  className="bg-slate-50 border border-slate-100 rounded-2xl py-3.5 pr-4 pl-10 text-xs font-black text-slate-600 outline-none cursor-pointer hover:bg-slate-100 transition-colors w-full"
                >
                  <option value="all">┘â┘ä ╪º┘ä╪ú╪┤┘ç╪▒ (┘â┘ä ╪º┘ä┘ê┘é╪¬)</option>
                  {availableMonths.map(mStr => {
                    const [y, m] = mStr.split('-');
                    const date = new Date(parseInt(y), parseInt(m) - 1, 1);
                    const label = date.toLocaleString('ar-EG', { month: 'long', year: 'numeric' });
                    return <option key={mStr} value={mStr}>{label}</option>;
                  })}
                </select>
              </div>

              {/* Order Status Selector Filter */}
              <div className="relative w-full lg:w-48">
                <span className="absolute right-3 top-[-8px] bg-white px-1 text-[9px] font-black text-slate-400">╪¡╪º┘ä╪⌐ ╪º┘ä╪ú┘ê╪▒╪»╪▒</span>
                <select
                  value={workshopStatusFilter}
                  onChange={(e) => setWorkshopStatusFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-100 rounded-2xl py-3.5 pr-4 pl-10 text-xs font-black text-slate-600 outline-none cursor-pointer hover:bg-slate-100 transition-colors w-full"
                >
                  <option value="all-active">┘â┘ä ╪º┘ä┘å╪┤╪╖╪⌐ (╪╣╪»╪º ╪º┘ä┘à┘ä╪║┘è)</option>
                  <option value="delivered">╪º┘ä╪╖┘ä╪¿╪º╪¬ ╪º┘ä┘à╪│┘ä┘æ┘à╪⌐ ┘ü┘é╪╖ Γ£à</option>
                  <option value="shipped">╪┤╪¡┘å ┘ê╪¬┘ê╪╡┘è┘ä ≡ƒÜÜ</option>
                  <option value="manufactured">╪¬┘à ╪º┘ä╪¬╪╡┘å┘è╪╣ ≡ƒº╡</option>
                  <option value="all">┘â┘ä ╪º┘ä╪¡╪º┘ä╪º╪¬ (╪¿┘à╪º ┘ü┘è┘ç╪º ╪º┘ä┘à┘ä╪║┘è)</option>
                </select>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Financial Dashboard (Always Visible below Filters!) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-in fade-in duration-300">
        {/* Money In */}
        <div className="bg-emerald-50 p-6 rounded-[2.5rem] border border-emerald-100/50 shadow-sm relative overflow-hidden group">
          <ArrowUpCircle size={80} className="absolute -top-4 -left-4 text-emerald-500 opacity-10 -rotate-12 group-hover:rotate-0 transition-transform" />
          <div className="relative">
            <p className="text-[10px] font-black text-emerald-600 mb-1 uppercase tracking-wider">┘ü┘ä┘ê╪│ ╪»╪º╪«┘ä╪⌐ (┘à╪¿┘è╪╣╪º╪¬ ╪º┘ä╪┤┘ç╪▒)</p>
            <div className="flex items-baseline gap-1 justify-end">
              <span className="text-3xl font-black text-slate-800">{stats.totalIn.toLocaleString()}</span>
              <span className="text-sm font-bold text-slate-400">╪¼.┘à</span>
            </div>
            <div className="mt-3 flex items-center gap-1 justify-end text-[10px] font-bold text-emerald-600">
              <TrendingDown className="rotate-180" size={12} />
              <span>┘à╪¿┘å┘è ╪╣┘ä┘ë ╪ú┘ê╪▒╪»╪▒╪º╪¬ ┘ç╪░╪º ╪º┘ä╪┤┘ç╪▒</span>
            </div>
          </div>
        </div>

        {/* Money Out */}
        <div className="bg-red-50 p-6 rounded-[2.5rem] border border-red-100/50 shadow-sm relative overflow-hidden group/out">
          <ArrowDownCircle size={80} className="absolute -top-4 -left-4 text-red-500 opacity-10 -rotate-12 group-hover/out:rotate-0 transition-transform" />
          <div className="relative">
            <p className="text-[10px] font-black text-red-600 mb-1 uppercase tracking-wider">┘ü┘ä┘ê╪│ ╪«╪º╪▒╪¼╪⌐ (┘à╪╡╪º╪▒┘è┘ü ╪º┘ä╪┤┘ç╪▒)</p>
            <div className="flex items-baseline gap-1 justify-end font-sans">
              <span className="text-3xl font-black text-slate-800">{stats.totalOut.toLocaleString()}</span>
              <span className="text-sm font-bold text-slate-400">╪¼.┘à</span>
            </div>
            
            <div className="mt-2 text-[10px] text-slate-500 font-bold bg-slate-100 p-2.5 rounded-2xl border border-slate-200/20 space-y-1">
              <div className="flex justify-between">
                <span>{stats.monthMfgCost.toLocaleString()} ╪¼.┘à</span>
                <span>≡ƒº╡ ╪¬┘â╪º┘ä┘è┘ü ╪¬╪╡┘å┘è╪╣:</span>
              </div>
              <div className="flex justify-between">
                <span>{stats.monthGeneral.toLocaleString()} ╪¼.┘à</span>
                <span>≡ƒÆ╕ ┘à╪╡╪º╪▒┘è┘ü ╪╣╪º┘à╪⌐:</span>
              </div>
              <div className="flex justify-between">
                <span>{(stats.monthWorkerPayments + stats.monthStaffExtra + stats.monthStaffFixed).toLocaleString()} ╪¼.┘à</span>
                <span>≡ƒæñ ╪▒┘ê╪º╪¬╪¿ ┘ê╪╣┘à╪º┘ä╪⌐:</span>
              </div>
            </div>
          </div>
        </div>

        {/* Remaining Debts */}
        <div className="bg-amber-50 p-6 rounded-[2.5rem] border border-amber-100/50 shadow-sm relative overflow-hidden group text-right">
          <TrendingDown size={80} className="absolute -top-4 -left-4 text-amber-500 opacity-10 -rotate-12 group-hover:rotate-0 transition-transform" />
          <div className="relative">
            <p className="text-[10px] font-black text-amber-600 mb-1 uppercase tracking-wider">╪º┘ä╪»┘è┘ê┘å ╪º┘ä┘à╪¬╪¿┘é┘è╪⌐ ┘ä┘ä╪¿╪▒╪º┘å╪»</p>
            <div className="flex items-baseline gap-1 justify-end font-sans">
              <span className="text-3xl font-black text-slate-800">{stats.totalRemainingDebts.toLocaleString()}</span>
              <span className="text-sm font-bold text-slate-400">╪¼.┘à</span>
            </div>
            <div className="mt-3 flex items-center gap-1 justify-end text-[10px] font-bold text-amber-600">
              <AlertTriangle size={12} />
              <span>┘à╪¬╪¿┘é┘è ╪»┘ü╪╣┘ç╪º ┘ä┘ä┘à┘ê╪▒╪»┘è┘å / ╪º┘ä╪«╪»┘à╪º╪¬</span>
            </div>
          </div>
        </div>

        {/* Net Profit */}
        <div className={`p-6 rounded-[2.5rem] shadow-xl relative overflow-hidden group border transition-all ${stats.netProfit >= 0 ? 'bg-slate-900 border-slate-800 text-white' : 'bg-orange-50 border-orange-100 text-orange-900'}`}>
          <DollarSign size={80} className={`absolute -top-4 -left-4 -rotate-12 group-hover:rotate-0 transition-transform ${stats.netProfit >= 0 ? 'text-white opacity-10' : 'text-orange-500 opacity-10'}`} />
          <div className="relative text-right">
            <p className={`text-[10px] font-black mb-1 uppercase tracking-wider opacity-60`}>╪╡╪º┘ü┘è ╪º┘ä╪▒╪¿╪¡ / ╪º┘ä╪«╪│╪º╪▒╪⌐</p>
            <div className="flex items-baseline gap-1 justify-end font-sans">
              <span className="text-4xl font-black">{stats.netProfit.toLocaleString()}</span>
              <span className="text-sm font-bold opacity-50">╪¼.┘à</span>
            </div>
            <p className="mt-3 text-[10px] font-bold opacity-60">╪º┘ä┘ü╪▒┘é ╪¿┘è┘å ╪º┘ä┘à╪¿┘è╪╣╪º╪¬ ┘ê╪º┘ä┘à╪╡╪º╪▒┘è┘ü ╪º┘ä┘â┘ä┘è╪⌐</p>
          </div>
        </div>
      </div>

      {activeTab === 'expenses' && (
        <div className="space-y-6">
          {/* Add Expense Section */}
          {isAdding && (
            <div className="bg-white p-6 rounded-[2.5rem] border-2 border-blue-100 shadow-xl shadow-blue-50/50 animate-in fade-in slide-in-from-top-4 duration-300">
              <form onSubmit={handleAddExpense} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                  <div className="space-y-1 lg:col-span-1">
                    <label className="text-[10px] font-black text-slate-400 mr-2 uppercase">┘ê╪╡┘ü ╪º┘ä┘à╪╡╪▒┘ê┘ü (╪º┘ä╪º╪│┘à)</label>
                    <input 
                      type="text" 
                      placeholder="┘à╪½┘ä╪º┘ï: ╪«╪º┘à╪º╪¬ ╪¬╪╡┘å┘è╪╣╪î ┘ü╪º╪¬┘ê╪▒╪⌐.."
                      required
                      className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-black text-right outline-none ring-1 ring-slate-100 focus:ring-blue-200 transition-all"
                      value={newExpense.description || ''} 
                      onChange={e => {
                        const desc = e.target.value;
                        const cat = autoCategory(desc);
                        setNewExpense({...newExpense, description: desc, category: cat !== '╪ú╪«╪▒┘ë' ? cat : newExpense.category });
                      }} 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 mr-2 uppercase">╪º┘ä┘à╪¿┘ä╪║ ╪º┘ä┘â┘ä┘è</label>
                    <input 
                      type="number" 
                      placeholder="0.00"
                      required
                      className="w-full bg-slate-50 border-none rounded-2xl p-4 text-lg font-black font-sans text-right outline-none ring-1 ring-slate-100 focus:ring-blue-200 transition-all"
                      value={newExpense.amount || ''} 
                      onFocus={e => e.target.select()}
                      onChange={e => {
                        const amt = parseFloat(e.target.value) || 0;
                        setNewExpense({...newExpense, amount: amt, paidAmount: newExpense.paidAmount === undefined ? amt : newExpense.paidAmount});
                      }} 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 mr-2 uppercase">╪º┘ä┘à╪»┘ü┘ê╪╣ ┘ü╪╣┘ä╪º┘ï</label>
                    <input 
                      type="number" 
                      placeholder="╪º╪¬╪▒┘â┘ç ┘ä┘ä╪»┘ü╪╣ ╪¿╪º┘ä┘â╪º┘à┘ä"
                      className="w-full bg-slate-50 border-none rounded-2xl p-4 text-lg font-black font-sans text-right outline-none ring-1 ring-slate-100 focus:ring-blue-200 transition-all"
                      value={newExpense.paidAmount === undefined ? '' : newExpense.paidAmount} 
                      onFocus={e => e.target.select()}
                      onChange={e => setNewExpense({...newExpense, paidAmount: e.target.value === '' ? undefined : parseFloat(e.target.value) || 0})} 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 mr-2 uppercase flex justify-between items-center px-1">
                      <button 
                        type="button"
                        onClick={() => setShowNewCategoryInput(!showNewCategoryInput)}
                        className="text-blue-500 hover:underline"
                      >
                        {showNewCategoryInput ? '╪Ñ┘ä╪║╪º╪í' : '+ ╪¬╪╡┘å┘è┘ü ╪¼╪»┘è╪»'}
                      </button>
                      <span>╪º┘ä╪¬╪╡┘å┘è┘ü</span>
                    </label>
                    {showNewCategoryInput ? (
                      <div className="flex gap-2">
                        <button 
                          type="button"
                          onClick={() => {
                            if (newCategoryName && !categories.includes(newCategoryName)) {
                              setCategories([...categories, newCategoryName]);
                              setNewExpense({...newExpense, category: newCategoryName});
                              setNewCategoryName('');
                              setShowNewCategoryInput(false);
                            }
                          }}
                          className="bg-blue-600 text-white p-2 rounded-xl"
                        >
                          <Plus size={20} />
                        </button>
                        <input 
                          type="text"
                          className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-black text-right outline-none ring-1 ring-slate-100 focus:ring-blue-200"
                          placeholder="╪º╪│┘à ╪º┘ä╪¬╪╡┘å┘è┘ü..."
                          value={newCategoryName}
                          onChange={e => setNewCategoryName(e.target.value)}
                        />
                      </div>
                    ) : (
                      <select 
                        className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-black text-right outline-none ring-1 ring-slate-100 focus:ring-blue-200 transition-all cursor-pointer"
                        value={newExpense.category}
                        onChange={e => setNewExpense({...newExpense, category: e.target.value})}
                      >
                        {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                      </select>
                    )}
                  </div>
                  <div className="space-y-1 lg:col-span-1">
                    <label className="text-[10px] font-black text-slate-400 mr-2 uppercase">┘à┘ä╪º╪¡╪╕╪º╪¬ (Notes)</label>
                    <input 
                      type="text" 
                      placeholder="╪ú┘è ┘à┘ä╪º╪¡╪╕╪º╪¬ ╪Ñ╪╢╪º┘ü┘è╪⌐..."
                      className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-black text-right outline-none ring-1 ring-slate-100 focus:ring-blue-200 transition-all"
                      value={newExpense.notes} 
                      onChange={e => setNewExpense({...newExpense, notes: e.target.value})} 
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <button 
                    type="submit" 
                    className="bg-blue-600 text-white font-black h-[52px] px-12 rounded-2xl shadow-lg shadow-blue-200 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    <Save size={20} />
                    ╪¡┘ü╪╕ ╪º┘ä┘à╪╡╪▒┘ê┘ü ╪º┘ä┘å┘ç╪º╪ª┘è
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Recent Ledger / Table */}
          <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-50 flex items-center justify-between">
              <h3 className="font-black text-lg text-slate-800">╪│╪¼┘ä ╪╣┘à┘ä┘è╪º╪¬ ╪º┘ä╪╡╪▒┘ü</h3>
              <div className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-full border border-slate-100">
                 <span className="text-[11px] font-black text-slate-400">╪╣╪»╪» ╪º┘ä╪╣┘à┘ä┘è╪º╪¬:</span>
                 <span className="text-xs font-black text-blue-600">{stats.filteredExpenses.length}</span>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-right">
                <thead>
                  <tr className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                    <th className="px-6 py-5">╪¬╪º╪▒┘è╪«</th>
                    <th className="px-6 py-5">┘à╪│┘à┘è ╪º┘ä╪¬┘â┘ä┘ü╪⌐ (╪º┘ä╪º╪│┘à)</th>
                    <th className="px-6 py-5">╪º┘ä╪¬╪╡┘å┘è┘ü</th>
                    <th className="px-6 py-5 font-extrabold text-slate-700">╪º┘ä┘à╪¿┘ä╪║ ╪º┘ä┘â┘ä┘è</th>
                    <th className="px-6 py-5 font-extrabold text-emerald-600">╪º┘ä┘à╪»┘ü┘ê╪╣ ┘ü╪╣┘ä╪º┘ï</th>
                    <th className="px-6 py-5 font-extrabold text-red-500">╪º┘ä╪»┘è┘ê┘å ╪º┘ä┘à╪¬╪¿┘é┘è╪⌐</th>
                    <th className="px-6 py-5">┘å┘ê╪¬ ┘ê╪¬┘ü╪º╪╡┘è┘ä (Notes)</th>
                    <th className="px-6 py-5">╪Ñ╪¼╪▒╪º╪í╪º╪¬</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {stats.filteredExpenses.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-8 py-20 text-center text-slate-400 italic text-sm">
                        ┘ä╪º ┘è┘ê╪¼╪» ┘à╪╡╪º╪▒┘è┘ü ┘à╪╖╪º╪¿┘é╪⌐ ┘ä┘ä╪¿╪¡╪½ ╪ú┘ê ╪º┘ä╪¬╪╡┘å┘è┘ü ╪º┘ä┘à╪«╪¬╪º╪▒
                      </td>
                    </tr>
                  ) : (
                    stats.filteredExpenses.map(exp => {
                      const paid = exp.paidAmount !== undefined ? exp.paidAmount : exp.amount;
                      const debt = Math.max(0, exp.amount - paid);
                      return (
                        <tr key={exp.id} className="hover:bg-slate-50/30 transition-all group">
                          <td className="px-6 py-5 text-xs font-bold text-slate-400">
                            <div className="flex flex-col font-mono text-[11px] text-slate-505">
                              <span>
                                {new Date(exp.date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                              </span>
                              <span className="text-[9px] text-slate-400 mt-0.5">
                                {new Date(exp.date).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: true })}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-5">
                            {editingId === exp.id ? (
                              <input 
                                className="bg-slate-50 border border-blue-200 rounded-lg px-3 py-1.5 text-sm font-black w-full text-right outline-none"
                                value={newExpense.description || ''}
                                onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                              />
                            ) : (
                              <span className="text-sm font-black text-slate-700">{exp.description}</span>
                            )}
                          </td>
                          <td className="px-6 py-5">
                            {editingId === exp.id ? (
                              <select 
                                className="bg-slate-50 border border-blue-200 rounded-lg px-2 py-1.5 text-xs font-black outline-none cursor-pointer text-right min-w-[100px]"
                                value={newExpense.category}
                                onChange={(e) => setNewExpense({ ...newExpense, category: e.target.value })}
                              >
                                {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                              </select>
                            ) : (
                              <span className={`text-[10px] px-2.5 py-1 rounded-full font-black block w-max ${categoryColors[exp.category] || 'bg-slate-100 text-slate-505'}`}>
                                {exp.category}
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-5">
                            {editingId === exp.id ? (
                              <input 
                                type="number"
                                className="bg-slate-50 border border-blue-200 rounded-lg px-3 py-1.5 text-sm font-black font-sans w-24 text-right outline-none"
                                value={newExpense.amount || ''}
                                onFocus={e => e.target.select()}
                                onChange={(e) => {
                                  const amt = parseFloat(e.target.value) || 0;
                                  setNewExpense({ ...newExpense, amount: amt, paidAmount: newExpense.paidAmount === undefined ? amt : newExpense.paidAmount });
                                }}
                              />
                            ) : (
                              <span className="text-sm font-black text-slate-800">{exp.amount.toLocaleString()} <span className="text-[10px]">╪¼.┘à</span></span>
                            )}
                          </td>
                          <td className="px-6 py-5">
                            {editingId === exp.id ? (
                              <input 
                                type="number"
                                className="bg-slate-50 border border-blue-200 rounded-lg px-3 py-1.5 text-sm font-black font-sans w-24 text-right outline-none"
                                value={newExpense.paidAmount === undefined ? '' : newExpense.paidAmount}
                                onFocus={e => e.target.select()}
                                onChange={(e) => setNewExpense({ ...newExpense, paidAmount: e.target.value === '' ? undefined : parseFloat(e.target.value) || 0 })}
                              />
                            ) : (
                              <span className="text-sm font-black text-emerald-600 font-sans">{paid.toLocaleString()} <span className="text-[10px] font-sans">╪¼.┘à</span></span>
                            )}
                          </td>
                          <td className="px-6 py-5">
                            {debt > 0 ? (
                              <span className="text-xs font-black text-red-650 bg-red-50 border border-red-100 px-2.5 py-1 rounded-xl block w-max font-sans">
                                {debt.toLocaleString()} ╪¼.┘à ΓÜá∩╕Å
                              </span>
                            ) : (
                              <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-xl block w-max">
                                ┘à╪│╪»╪» ┘â╪º┘à┘ä Γ£à
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-5">
                            <div className="flex flex-col gap-1">
                              {editingId === exp.id ? (
                                <input 
                                  type="text"
                                  placeholder="╪ú┘è ┘à┘ä╪º╪¡╪╕╪º╪¬..."
                                  className="text-[10px] text-slate-400 font-bold bg-slate-50 border border-blue-100 rounded px-2 py-1 outline-none w-full animate-pulse"
                                  value={newExpense.notes || ''}
                                  onChange={(e) => setNewExpense({ ...newExpense, notes: e.target.value })}
                                />
                              ) : (
                                <p className="text-[10px] text-slate-400 font-bold truncate max-w-xs font-sans">
                                  {exp.notes || '┘ä╪º ┘è┘ê╪¼╪» ┘à┘ä╪º╪¡╪╕╪º╪¬'}
                                </p>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-5">
                            <div className="flex items-center gap-1">
                              {editingId === exp.id ? (
                                 <button 
                                   onClick={saveEdit}
                                   className="p-2 text-emerald-500 hover:bg-emerald-50 rounded-xl transition-all"
                                 >
                                   <Save size={16} />
                                 </button>
                              ) : (
                                 <button 
                                   onClick={() => startEdit(exp)}
                                   className="p-2 text-slate-300 hover:text-blue-500 hover:bg-blue-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                                 >
                                   <Edit2 size={16} />
                                 </button>
                              )}
                              <button 
                                onClick={() => deleteExpense(exp.id)}
                                className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* --- TAB 2: WORKSHOP WORK & MANUFACTURING BREAKDOWN --- */}
      {activeTab === 'workshop' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Manufacturing Cost Quick Summary Banner */}
          <div className="bg-slate-900 text-white p-6 rounded-[2.5rem] border border-slate-800 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden group">
            <Coins size={120} className="absolute -top-4 -left-4 text-white/5 -rotate-12 group-hover:rotate-0 transition-transform" />
            <div className="relative text-right space-y-1">
              <span className="text-emerald-400 font-extrabold text-[10px] tracking-wider uppercase">╪º┘ä╪¡╪│╪º╪¿ ╪º┘ä╪Ñ╪¼┘à╪º┘ä┘è ┘ä┘ä╪¬╪╡┘å┘è╪╣ ╪¡╪│╪¿ ╪º┘ä┘ü┘ä╪¬╪▒╪⌐ ╪º┘ä┘à╪¡╪»╪»╪⌐</span>
              <h3 className="text-xl font-black text-white">╪¡╪│╪º╪¿ ╪¬┘â┘ä┘ü╪⌐ ╪¬╪╡┘å┘è╪╣ ╪º┘ä╪╖┘ä╪¿╪º╪¬</h3>
              <p className="text-slate-400 font-bold text-xs">┘à╪¿┘å┘è ╪╣┘ä┘ë ╪º┘ä┘ü╪¬╪▒╪º╪¬ ╪º┘ä╪▓┘à┘å┘è╪⌐ ╪º┘ä┘à╪¡╪»╪»╪⌐ ┘ê╪¡╪º┘ä╪º╪¬ ╪º┘ä╪ú┘ê╪▒╪»╪▒╪º╪¬ ╪º┘ä┘å╪┤╪╖╪⌐ ┘ü┘è ╪º┘ä┘ü┘ä╪º╪¬╪▒</p>
            </div>
            
            <div className="relative flex flex-row items-center gap-6 divide-x divide-x-reverse divide-white/10">
              <div className="text-right px-4">
                <span className="block text-[10px] font-black text-slate-400 mb-1">╪Ñ╪¼┘à╪º┘ä┘è ╪¬┘â┘ä┘ü╪⌐ ╪º┘ä╪¬╪╡┘å┘è╪╣</span>
                <div className="flex items-baseline gap-1 justify-end font-sans">
                  <span className="text-4xl font-black text-emerald-400">{workshopStats.totalMfgCost.toLocaleString()}</span>
                  <span className="text-xs font-bold text-slate-400">╪¼.┘à</span>
                </div>
              </div>
              
              <div className="text-right px-4">
                <span className="block text-[10px] font-black text-slate-400 mb-1">╪╣╪»╪» ╪º┘ä╪╖┘ä╪¿╪º╪¬ (╪º┘ä╪ú┘ê╪▒╪»╪▒╪º╪¬)</span>
                <div className="flex items-baseline gap-1 justify-end font-sans">
                  <span className="text-3xl font-black text-white">{workshopStats.filteredOrdersCount}</span>
                  <span className="text-xs font-bold text-slate-400">╪ú┘ê╪▒╪»╪▒</span>
                </div>
              </div>

              <div className="text-right px-4">
                <span className="block text-[10px] font-black text-slate-400 mb-1">╪Ñ╪¼┘à╪º┘ä┘è ╪º┘ä┘é╪╖╪╣ ╪º┘ä┘à╪┤┘à┘ê┘ä╪⌐</span>
                <div className="flex items-baseline gap-1 justify-end font-sans">
                  <span className="text-3xl font-black text-white">{workshopStats.totalItemsCount}</span>
                  <span className="text-xs font-bold text-slate-400">┘é╪╖╪╣╪⌐</span>
                </div>
              </div>
            </div>
          </div>

          {/* Workshop Order Ledger */}
          <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-50 flex items-center justify-between">
              <div>
                <h3 className="font-black text-lg text-slate-800">╪│╪¼┘ä ╪¡╪│╪º╪¿╪º╪¬ ╪¬┘â╪º┘ä┘è┘ü ╪¬╪╡┘å┘è╪╣ ╪º┘ä╪╖┘ä╪¿╪º╪¬</h3>
                <p className="text-xs text-slate-400 font-bold mt-1">╪¬┘ü╪º╪╡┘è┘ä ╪¬┘â╪º┘ä┘è┘ü ╪º┘ä╪¬╪╡┘å┘è╪╣ ╪º┘ä┘â┘ä┘è╪⌐ ┘ä┘â┘ä ╪ú┘ê╪▒╪»╪▒ ┘à╪│╪¬╪¡┘é</p>
              </div>
              <div className="flex bg-slate-50 px-4 py-2 rounded-full border border-slate-100 gap-1.5 text-xs font-black text-blue-600">
                <span>╪Ñ╪¼┘à╪º┘ä┘è ╪º┘ä╪ú┘é┘à╪┤╪⌐ ┘ê╪º┘ä┘à┘ê╪»┘è┘ä╪º╪¬:</span>
                <span>{workshopStats.totalItemsCount} ┘é╪╖╪╣╪⌐</span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase tracking-wider select-none border-b border-slate-100">
                    <th className="px-6 py-5">╪º┘ä╪ú┘ê╪▒╪»╪▒ / ╪º┘ä╪¬╪º╪▒┘è╪«</th>
                    <th className="px-6 py-5">╪º┘ä╪╣┘à┘è┘ä</th>
                    <th className="px-6 py-5">╪¡╪º┘ä╪⌐ ╪º┘ä╪ú┘ê╪▒╪»╪▒</th>
                    <th className="px-6 py-5 text-center">╪╣╪»╪» ╪º┘ä┘é╪╖╪╣</th>
                    <th className="px-6 py-5">╪¬┘ü╪º╪╡┘è┘ä ╪º┘ä┘à┘ê╪»┘è┘ä╪º╪¬ ┘ê╪¬┘â┘ä┘ü╪⌐ ╪º┘ä╪¬╪╡┘å┘è╪╣</th>
                    <th className="px-6 py-5 font-black text-slate-800 text-left">╪Ñ╪¼┘à╪º┘ä┘è ╪¬┘â┘ä┘ü╪⌐ ╪º┘ä╪¬╪╡┘å┘è╪╣</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {workshopStats.orderDetails.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-8 py-20 text-center text-slate-400 italic text-sm">
                        ┘ä╪º ╪¬┘ê╪¼╪» ╪ú┘ê╪▒╪»╪▒╪º╪¬ ┘à╪╖╪º╪¿┘é╪⌐ ┘ä┘ä╪¿╪¡╪½ ╪ú┘ê ╪º┘ä┘ü┘ä╪º╪¬╪▒ ╪º┘ä┘à╪«╪¬╪º╪▒╪⌐
                      </td>
                    </tr>
                  ) : (
                    workshopStats.orderDetails.map(({ order, itemsDetail, orderMfgCost, orderItemCount }) => (
                      <tr key={order.id} className="hover:bg-slate-50/20 transition-all">
                        {/* Order ID & Date */}
                        <td className="px-6 py-5 text-xs font-bold text-slate-400 whitespace-nowrap">
                          <div className="flex flex-col font-mono">
                            <span className="text-slate-800 font-black text-sm">{order.id}</span>
                            <span className="text-[10px] text-slate-400 mt-1">
                              {new Date(order.creationDate).toLocaleDateString('en-GB') || order.creationDate}
                            </span>
                          </div>
                        </td>

                        {/* Customer */}
                        <td className="px-6 py-5">
                          <div className="flex flex-col">
                            <span className="text-sm font-black text-slate-700">{order.customerName}</span>
                            {order.childName && (
                              <span className="text-[10px] text-blue-500 font-extrabold bg-blue-50/50 px-1.5 py-0.5 rounded-md w-max mt-0.5">╪╖┘ü┘ä: {order.childName}</span>
                            )}
                          </div>
                        </td>

                        {/* Status badge */}
                        <td className="px-6 py-5">
                          <span className={`text-[10px] px-2.5 py-1 rounded-full font-black inline-block whitespace-nowrap ${
                            order.status === 'delivered' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                            order.status === 'out_for_delivery' || order.status === 'in_delivery' ? 'bg-sky-50 text-sky-600 border border-sky-100' :
                            order.status === 'manufactured' ? 'bg-purple-50 text-purple-650 border border-purple-100' :
                            order.status === 'cancelled' ? 'bg-slate-50 text-slate-400 border border-slate-100' :
                            'bg-slate-100 text-slate-600'
                          }`}>
                            {order.status === 'delivered' ? '╪¬┘à ╪º┘ä╪¬┘ê╪╡┘è┘ä Γ£à' :
                             order.status === 'out_for_delivery' ? '╪«╪▒╪¼ ┘à╪╣ ╪º┘ä┘à┘å╪»┘ê╪¿ ≡ƒÜÜ' :
                             order.status === 'in_delivery' ? '┘é┘è╪» ╪º┘ä╪¬┘ê╪╡┘è┘ä ≡ƒôª' :
                             order.status === 'manufactured' ? '╪¬┘à ╪º┘ä╪¬╪╡┘å┘è╪╣ ≡ƒº╡' :
                             order.status === 'cancelled' ? '┘à┘ä╪║┘è Γ¥î' :
                             order.status === 'delayed' ? '╪¬┘à ╪¬╪ú╪¼┘è┘ä┘ç ΓÅ│' :
                             order.status === 'returned' ? '┘à╪▒╪¬╪¼╪╣ ┘â┘ä┘è ΓÜá∩╕Å' :
                             order.status === 'returned_partial' ? '┘à╪▒╪¬╪¼╪╣ ╪¼╪▓╪ª┘è ≡ƒîÇ' :
                             '╪¼╪»┘è╪» ≡ƒåò'}
                          </span>
                        </td>

                        {/* Items count */}
                        <td className="px-6 py-5 text-center font-mono text-sm font-black text-slate-650">
                          {orderItemCount}
                        </td>

                        {/* Models detail lists */}
                        <td className="px-6 py-5">
                          <div className="space-y-1.5 max-w-sm">
                            {itemsDetail.map((item, i) => (
                              <div key={i} className="text-[11px] font-bold text-slate-600 bg-slate-50 p-2 rounded-xl space-y-1 border border-slate-100/30 text-right">
                                <div className="flex justify-between font-black text-slate-700">
                                  <span>{item.name} {(item.color || item.size) ? `(${item.color || ''} - ${item.size || ''})` : ''} x {item.quantity}</span>
                                  <span className="text-slate-800 font-mono font-black">{item.itemTotalMfg.toLocaleString()} ╪¼.┘à</span>
                                </div>
                                {item.priceDiff > 0 && (
                                  <div className="text-[9px] text-purple-600 flex justify-between font-sans">
                                    <span>┘ü╪▒┘ê┘é╪º╪¬ ╪¬╪╣╪»┘è┘ä ┘à┘é╪º╪│ ╪╣┘à┘è┘ä:</span>
                                    <span>+{item.priceDiff} ╪¼.┘à</span>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </td>

                        {/* Cumulative Order Cost */}
                        <td className="px-6 py-5 text-left font-sans text-sm font-black text-slate-900">
                          {orderMfgCost.toLocaleString()} ╪¼.┘à
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Custom Expense Delete Confirmation Modal */}
      {expenseToDelete && (() => {
        const exp = generalExpenses.find(e => e.id === expenseToDelete);
        return (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[155] flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-md rounded-3xl overflow-hidden shadow-2xl p-6 text-right animate-in fade-in zoom-in-95 duration-200" dir="rtl">
              <div className="text-center space-y-3">
                <div className="w-12 h-12 bg-red-50 text-red-650 rounded-full flex items-center justify-center mx-auto text-xl">
                  ΓÜá∩╕Å
                </div>
                <h3 className="text-lg font-black text-slate-800">╪¬╪ú┘â┘è╪» ╪¡╪░┘ü ╪º┘ä┘à╪╡╪▒┘ê┘ü</h3>
                <p className="text-xs text-slate-500 font-bold leading-relaxed font-sans">
                  ┘ç┘ä ╪ú┘å╪¬┘É ┘à╪¬╪ú┘â╪»╪⌐ ┘à┘å ╪▒╪║╪¿╪¬┘â┘É ┘ü┘è ╪¡╪░┘ü ┘ç╪░╪º ╪º┘ä┘à╪╡╪▒┘ê┘ü <strong className="text-slate-800">"{exp?.description || ''}"</strong> ╪¿┘é┘è┘à╪⌐ <strong className="text-slate-800">{exp?.amount || 0} ╪¼.┘à</strong> ┘å┘ç╪º╪ª┘è╪º┘ï╪ƒ ┘ä╪º ┘è┘à┘â┘å ╪º┘ä╪¬╪▒╪º╪¼╪╣ ╪╣┘å ┘ç╪░┘ç ╪º┘ä╪«╪╖┘ê╪⌐.
                </p>
              </div>
              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setGeneralExpenses(generalExpenses.filter(e => e.id !== expenseToDelete));
                    setExpenseToDelete(null);
                  }}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-black py-3 rounded-2xl transition-all shadow-md shadow-red-100"
                >
                  ┘å╪╣┘à╪î ╪º╪¡╪░┘ü ┘å┘ç╪º╪ª┘è╪º┘ï
                </button>
                <button
                  type="button"
                  onClick={() => setExpenseToDelete(null)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-black py-3 rounded-2xl transition-all"
                >
                  ╪Ñ┘ä╪║╪º╪í ╪º┘ä╪¬╪▒╪º╪¼╪╣
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
