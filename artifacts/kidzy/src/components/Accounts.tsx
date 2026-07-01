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
  const context = useApp();
  const { users, workers, orders, generalExpenses, setGeneralExpenses, products } = context;

  console.log('[Accounts] mounted, context values:', {
    usersCount: users?.length,
    workersCount: workers?.length,
    ordersCount: orders?.length,
    expensesCount: generalExpenses?.length,
    productsCount: products?.length,
  });

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
    category: 'أخرى',
    description: '',
    amount: 0,
    paidAmount: undefined,
    notes: ''
  });

  const [categories, setCategories] = useState(['خامات', 'تسويق', 'تغليف', 'أخرى']);
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  const autoCategory = (desc: string) => {
    const map: Record<string, string> = {
      'خام': 'خامات',
      'قماش': 'خامات',
      'خيط': 'خامات',
      'غلاف': 'تغليف',
      'شنط': 'تغليف',
      'كرتون': 'تغليف',
      'تغليف': 'تغليف',
      'فيسبوك': 'تسويق',
      'إعلان': 'تسويق',
      'سوشيال': 'تسويق',
      'تسويق': 'تسويق'
    };

    for (const [key, cat] of Object.entries(map)) {
      if (desc.includes(key)) return cat;
    }
    return 'أخرى';
  };

  // Categories Color Map
  const categoryColors: Record<string, string> = {
    'خامات': 'bg-amber-100 text-amber-600',
    'تسويق': 'bg-pink-100 text-pink-600',
    'تغليف': 'bg-indigo-100 text-indigo-600',
    'أخرى': 'bg-gray-100 text-gray-650'
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
      category: newExpense.category || 'أخرى',
      description: newExpense.description || '',
      amount: newExpense.amount || 0,
      paidAmount: newExpense.paidAmount !== undefined ? newExpense.paidAmount : newExpense.amount,
      notes: newExpense.notes || ''
    };

    setGeneralExpenses([expense, ...generalExpenses]);
    setNewExpense({ 
      date: new Date().toISOString(), 
      category: 'أخرى', 
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
      category: 'أخرى', 
      description: '', 
      amount: 0,
      paidAmount: undefined,
      notes: ''
    });
    setIsAdding(false);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-24 text-right" dir="rtl">
      <div className="bg-green-50 p-8 rounded-2xl border border-green-200">
        <h2 className="text-xl font-black text-green-700">Accounts Mounted Successfully ✅</h2>
        <p className="text-green-600 font-bold mt-2">
          users={users?.length} workers={workers?.length} orders={orders?.length} expenses={generalExpenses?.length} products={products?.length}
        </p>
      </div>
      </div>
    </div>
  );
}