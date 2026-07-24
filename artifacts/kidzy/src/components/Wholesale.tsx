import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { WholesaleOrder, WholesaleOrderItem } from '../types';
import { Search, Plus, X, Edit2, Trash2, Save } from 'lucide-react';

const WS_ORDERS_KEY = 'kidzy_wholesale_orders';

function loadOrders(): WholesaleOrder[] {
  try { return JSON.parse(localStorage.getItem(WS_ORDERS_KEY) || '[]'); } catch { return []; }
}

function saveOrders(data: WholesaleOrder[]) {
  localStorage.setItem(WS_ORDERS_KEY, JSON.stringify(data));
}

function genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

export function Wholesale() {
  const { products } = useApp();

  const [activeTab, setActiveTab] = useState<'orders' | 'accounts'>('orders');

  // ---- ORDERS STATE ----
  const [ordersData, setOrdersData] = useState<WholesaleOrder[]>(loadOrders);
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [orderSearch, setOrderSearch] = useState('');

  const emptyOrderForm = (): WholesaleOrder => ({
    id: genId(),
    customerName: '',
    customerPhone: '',
    customerAddress: '',
    items: [],
    deliveryDate: '',
    deposit: 0,
    total: 0,
    paidInFull: false,
    paidInFullDate: '',
    notes: '',
    creationDate: new Date().toISOString(),
    lastUpdateDate: new Date().toISOString(),
    status: 'قيد التصنيع',
    depositReturned: false,
  });
  const [orderForm, setOrderForm] = useState<WholesaleOrder>(emptyOrderForm());

  // ---- ACCOUNTS STATE ----
  const [accountsProductFilter, setAccountsProductFilter] = useState<string>('all');

  // ---- PERSIST ----
  useEffect(() => { saveOrders(ordersData); }, [ordersData]);

  // ---- COMPUTED ----
  const allVariants = useMemo(() => {
    const list: { productId: string; productName: string; productCode: string; variantId: string; color: string; size: string; totalCost: number; sellingPrice: number }[] = [];
    for (const p of products) {
      for (const v of p.variants || []) {
        list.push({
          productId: p.id,
          productName: p.name,
          productCode: p.code,
          variantId: v.id,
          color: v.color,
          size: v.size,
          totalCost: p.totalCost,
          sellingPrice: p.sellingPrice,
        });
      }
    }
    return list;
  }, [products]);

  const filteredOrders = useMemo(() => {
    const q = orderSearch.toLowerCase().trim();
    if (!q) return ordersData;
    return ordersData.filter(o =>
      o.customerName.toLowerCase().includes(q) ||
      o.customerPhone.includes(q) ||
      o.items.some(it => it.productName.toLowerCase().includes(q))
    );
  }, [ordersData, orderSearch]);

  const accountsFilteredOrders = useMemo(() => {
    if (accountsProductFilter === 'all') return ordersData;
    return ordersData.filter(o =>
      o.items.some(it => it.variantId === accountsProductFilter)
    );
  }, [ordersData, accountsProductFilter]);

  // ---- ORDER HANDLERS ----
  const handleOpenNewOrder = () => {
    setEditingOrderId(null);
    setOrderForm(emptyOrderForm());
    setShowOrderForm(true);
  };

  const handleOpenEditOrder = (o: WholesaleOrder) => {
    setEditingOrderId(o.id);
    setOrderForm({ ...o, status: o.status || 'قيد التصنيع', depositReturned: o.depositReturned || false });
    setShowOrderForm(true);
  };

  const handleSaveOrder = () => {
    const now = new Date().toISOString();
    const order = { ...orderForm, lastUpdateDate: now };
    if (!order.creationDate) order.creationDate = now;
    const total = order.items.reduce((sum, it) => sum + it.wholesalePrice * it.quantity, 0);
    order.total = total;
    if (editingOrderId) {
      setOrdersData(prev => prev.map(o => o.id === editingOrderId ? order : o));
    } else {
      setOrdersData(prev => [order, ...prev]);
    }
    setShowOrderForm(false);
    setEditingOrderId(null);
  };

  const handleDeleteOrder = (id: string) => {
    if (confirm('🚨 هل أنت متأكد من حذف طلب الجملة هذا؟')) {
      setOrdersData(prev => prev.filter(o => o.id !== id));
    }
  };

  const handleAddOrderItem = () => {
    setOrderForm(prev => ({
      ...prev,
      items: [...prev.items, { variantId: '', productName: '', productCode: '', color: '', size: '', quantity: 1, wholesalePrice: 0 }],
    }));
  };

  const handleRemoveOrderItem = (idx: number) => {
    setOrderForm(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== idx) }));
  };

  const handleOrderItemChange = (idx: number, field: keyof WholesaleOrderItem, value: string | number) => {
    setOrderForm(prev => {
      const items = [...prev.items];
      items[idx] = { ...items[idx], [field]: value };
      if (field === 'variantId') {
        const v = allVariants.find(v => v.variantId === value);
        if (v) {
          items[idx].productName = v.productName;
          items[idx].productCode = v.productCode;
          items[idx].color = v.color;
          items[idx].size = v.size;
        }
      }
      return { ...prev, items };
    });
  };

  // ---- ACCOUNTS ----
  const accountsStats = useMemo(() => {
    const orders = accountsFilteredOrders;
    const activeOrders = orders.filter(o => o.status !== 'الغاء');
    const cancelledOrders = orders.filter(o => o.status === 'الغاء');

    const totalRevenue = activeOrders.reduce((s, o) => s + o.total, 0);
    const totalDeposits = activeOrders.reduce((s, o) => s + o.deposit, 0);
    const totalRemaining = activeOrders.reduce((s, o) => s + Math.max(0, o.total - o.deposit), 0);

    const activeCost = activeOrders.reduce((s, o) => s + o.items.reduce((isum, it) => {
      const variant = allVariants.find(v => v.variantId === it.variantId);
      const costPerUnit = variant?.totalCost || 0;
      return isum + costPerUnit * it.quantity;
    }, 0), 0);

    const cancelledKeptDeposits = cancelledOrders.filter(o => !o.depositReturned).reduce((s, o) => s + o.deposit, 0);

    const totalCost = activeCost;
    const totalProfit = totalRevenue - totalCost + cancelledKeptDeposits;
    const paidInFullCount = activeOrders.filter(o => o.paidInFull).length;
    const pendingCount = activeOrders.filter(o => !o.paidInFull).length;
    const cancelledCount = cancelledOrders.length;
    const cancelledReturnedCount = cancelledOrders.filter(o => o.depositReturned).length;
    return { totalRevenue, totalDeposits, totalRemaining, totalCost, totalProfit, paidInFullCount, pendingCount, cancelledCount, cancelledReturnedCount, totalOrders: activeOrders.length, totalAllOrders: orders.length };
  }, [accountsFilteredOrders, allVariants]);

  const productOptionsForFilter = useMemo(() => {
    const seen = new Set<string>();
    const list: { variantId: string; label: string }[] = [];
    for (const o of ordersData) {
      for (const it of o.items) {
        if (!seen.has(it.variantId)) {
          seen.add(it.variantId);
          list.push({ variantId: it.variantId, label: `${it.productName} (${it.color || ''}/${it.size || ''})` });
        }
      }
    }
    return list;
  }, [ordersData]);

  // ---- RENDER ----
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-800">طلبات و حسابات الجملة 📦</h2>
          <p className="text-xs text-slate-400 font-bold mt-1">تسجيل طلبات العملاء و حسابات الجملة</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap bg-slate-100 p-1 rounded-3xl gap-1">
        <button onClick={() => setActiveTab('orders')} className={`flex-1 min-w-[120px] py-3 text-xs md:text-sm font-black rounded-2xl transition-all ${activeTab === 'orders' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>📋 طلبات الجملة</button>
        <button onClick={() => setActiveTab('accounts')} className={`flex-1 min-w-[120px] py-3 text-xs md:text-sm font-black rounded-2xl transition-all ${activeTab === 'accounts' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>📊 حسابات الجملة</button>
      </div>

      {/* ==================== TAB 1: ORDERS ==================== */}
      {activeTab === 'orders' && (
        <div className="space-y-6">
          {/* Table + Search */}
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input type="text" placeholder="ابحث باسم العميل، رقم الهاتف، المنتج..." className="w-full bg-white border border-slate-200/60 rounded-2xl py-3 pr-11 pl-4 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-100 transition-all text-right" value={orderSearch} onChange={e => setOrderSearch(e.target.value)} />
            </div>
            <button onClick={handleOpenNewOrder} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl flex items-center justify-center gap-2 font-black transition-all shadow-lg shadow-blue-100 cursor-pointer text-sm">
              <Plus size={18} /> طلب جملة جديد
            </button>
          </div>

          {/* Orders Table */}
          <div className="bg-white rounded-[2rem] border border-slate-100 overflow-hidden shadow-sm">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-extrabold text-slate-800 text-sm">طلبات الجملة</h3>
              <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-xl">{filteredOrders.length} طلب</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-slate-100/50 text-slate-500 font-extrabold border-b border-slate-100">
                    <th className="p-4">العميل</th>
                    <th className="p-4">المنتجات</th>
                    <th className="p-4">الإجمالي</th>
                    <th className="p-4">المدفوع</th>
                    <th className="p-4">المتبقي</th>
                    <th className="p-4">الحالة</th>
                    <th className="p-4">تاريخ التسليم</th>
                    <th className="p-4 text-center">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-slate-700 font-bold">
                  {filteredOrders.length === 0 ? (
                    <tr><td colSpan={8} className="p-12 text-center text-xs font-bold text-slate-400">لا توجد طلبات جملة</td></tr>
                  ) : (
                    filteredOrders.map(o => {
                      const remaining = Math.max(0, o.total - o.deposit);
                      return (
                        <tr key={o.id} className="hover:bg-slate-50/50 transition-all">
                          <td className="p-4">
                            <div className="flex flex-col">
                              <span className="font-extrabold text-slate-800">{o.customerName}</span>
                              <span className="text-[10px] text-slate-400 font-mono">{o.customerPhone}</span>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex flex-col gap-0.5">
                              {o.items.map((it, idx) => (
                                <span key={idx} className="text-[10px] text-slate-600">{it.productName} x{it.quantity} @ {it.wholesalePrice}ج</span>
                              ))}
                            </div>
                          </td>
                          <td className="p-4 font-black">{o.total.toFixed(0)} ج</td>
                          <td className="p-4">
                            <span className={`font-black ${o.paidInFull ? 'text-emerald-600' : 'text-amber-600'}`}>{o.deposit.toFixed(0)} ج</span>
                          </td>
                          <td className="p-4">
                            <span className={`font-black ${remaining === 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{remaining.toFixed(0)} ج</span>
                          </td>
                          <td className="p-4">
                            <span className={`text-[9px] font-black px-2 py-1 rounded-lg ${o.status === 'تم التسليم' ? 'bg-emerald-50 text-emerald-700' : o.status === 'الغاء' ? 'bg-rose-50 text-rose-700' : 'bg-blue-50 text-blue-700'}`}>{o.status || 'قيد التصنيع'}</span>
                            {o.status === 'الغاء' && (
                              <span className={`text-[9px] font-bold block mt-1 ${o.depositReturned ? 'text-amber-600' : 'text-emerald-600'}`}>{o.depositReturned ? 'الديبوزيت اترجع ✅' : 'الديبوزيت لم يُرجع'}</span>
                            )}
                          </td>
                          <td className="p-4 text-slate-500">{o.deliveryDate ? new Date(o.deliveryDate).toLocaleDateString('en-GB') : '—'}</td>
                          <td className="p-4 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button onClick={() => handleOpenEditOrder(o)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all cursor-pointer"><Edit2 size={14} /></button>
                              <button onClick={() => handleDeleteOrder(o.id)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"><Trash2 size={14} /></button>
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

      {/* ==================== TAB 3: ACCOUNTS ==================== */}
      {activeTab === 'accounts' && (
        <div className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm text-center space-y-2">
              <p className="text-slate-500 font-extrabold text-[10px]">إجمالي الطلبات النشطة</p>
              <p className="text-2xl font-black text-slate-800">{accountsStats.totalOrders}</p>
              {accountsStats.cancelledCount > 0 && (
                <p className="text-[10px] font-bold text-rose-500">{accountsStats.cancelledCount} ملغي ({accountsStats.cancelledReturnedCount} اترجع الديبوزيت)</p>
              )}
            </div>
            <div className="bg-emerald-50/50 p-5 rounded-[2rem] border border-emerald-100/50 shadow-sm text-center space-y-2">
              <p className="text-emerald-600 font-extrabold text-[10px]">إجمالي الإيرادات</p>
              <p className="text-2xl font-black text-emerald-700">{accountsStats.totalRevenue.toFixed(0)} ج</p>
            </div>
            <div className="bg-blue-50/50 p-5 rounded-[2rem] border border-blue-100/50 shadow-sm text-center space-y-2">
              <p className="text-blue-600 font-extrabold text-[10px]">إجمالي المدفوع</p>
              <p className="text-2xl font-black text-blue-700">{accountsStats.totalDeposits.toFixed(0)} ج</p>
            </div>
            <div className="bg-amber-50/50 p-5 rounded-[2rem] border border-amber-100/50 shadow-sm text-center space-y-2">
              <p className="text-amber-600 font-extrabold text-[10px]">المتبقي</p>
              <p className="text-2xl font-black text-amber-700">{accountsStats.totalRemaining.toFixed(0)} ج</p>
            </div>
            <div className="bg-purple-50/50 p-5 rounded-[2rem] border border-purple-100/50 shadow-sm text-center space-y-2">
              <p className="text-purple-600 font-extrabold text-[10px]">التكلفة الإجمالية</p>
              <p className="text-2xl font-black text-purple-700">{accountsStats.totalCost.toFixed(0)} ج</p>
            </div>
            <div className={`${accountsStats.totalProfit >= 0 ? 'bg-emerald-50/50 border-emerald-100/50' : 'bg-rose-50/50 border-rose-100/50'} p-5 rounded-[2rem] border shadow-sm text-center space-y-2`}>
              <p className={`font-extrabold text-[10px] ${accountsStats.totalProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>الربح الصافي</p>
              <p className={`text-2xl font-black ${accountsStats.totalProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>{accountsStats.totalProfit.toFixed(0)} ج</p>
            </div>
          </div>

          {/* Product Filter */}
          <div className="flex flex-wrap bg-white p-3 rounded-3xl border border-slate-100 shadow-sm gap-2">
            <span className="text-[10px] text-slate-400 font-bold self-center ml-2">تصفية حسب المنتج:</span>
            <button onClick={() => setAccountsProductFilter('all')} className={`px-3 py-1.5 text-[10px] font-black rounded-xl transition-all cursor-pointer ${accountsProductFilter === 'all' ? 'bg-slate-800 text-white shadow-sm' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>الكل</button>
            {productOptionsForFilter.map(opt => (
              <button key={opt.variantId} onClick={() => setAccountsProductFilter(opt.variantId)} className={`px-3 py-1.5 text-[10px] font-black rounded-xl transition-all cursor-pointer ${accountsProductFilter === opt.variantId ? 'bg-slate-800 text-white shadow-sm' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>{opt.label}</button>
            ))}
          </div>

          {/* Per-Product Breakdown */}
          <div className="bg-white rounded-[2rem] border border-slate-100 overflow-hidden shadow-sm">
            <div className="p-6 border-b border-slate-100">
              <h3 className="font-extrabold text-slate-800 text-sm">تفصيل حسابات الجملة</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-slate-100/50 text-slate-500 font-extrabold border-b border-slate-100">
                    <th className="p-4">العميل</th>
                    <th className="p-4">المنتجات</th>
                    <th className="p-4">الإجمالي</th>
                    <th className="p-4">التكلفة</th>
                    <th className="p-4">الربح</th>
                    <th className="p-4">المدفوع</th>
                    <th className="p-4">المتبقي</th>
                    <th className="p-4">الحالة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-slate-700 font-bold">
                  {accountsFilteredOrders.length === 0 ? (
                    <tr><td colSpan={8} className="p-12 text-center text-xs font-bold text-slate-400">لا توجد طلبات</td></tr>
                  ) : (
                    accountsFilteredOrders.map(o => {
                      const remaining = Math.max(0, o.total - o.deposit);
                      const orderCost = o.items.reduce((isum, it) => {
                        const variant = allVariants.find(v => v.variantId === it.variantId);
                        return isum + (variant?.totalCost || 0) * it.quantity;
                      }, 0);
                      const isCancelled = o.status === 'الغاء';
                      const effectiveRevenue = isCancelled ? 0 : o.total;
                      const cancelledKeptDeposit = isCancelled && !o.depositReturned ? o.deposit : 0;
                      const orderProfit = effectiveRevenue - (isCancelled ? 0 : orderCost) + cancelledKeptDeposit;
                      return (
                        <tr key={o.id} className={`hover:bg-slate-50/50 transition-all ${isCancelled ? 'opacity-60' : ''}`}>
                          <td className="p-4">
                            <span className="font-extrabold text-slate-800">{o.customerName}</span>
                            <span className={`text-[9px] font-black px-2 py-0.5 rounded-lg block w-fit mt-1 ${isCancelled ? 'bg-rose-50 text-rose-700' : o.status === 'تم التسليم' ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'}`}>{o.status || 'قيد التصنيع'}</span>
                          </td>
                          <td className="p-4">
                            {o.items.map((it, idx) => (
                              <div key={idx} className="text-[10px] text-slate-600">{it.productName} x{it.quantity} @ {it.wholesalePrice}ج</div>
                            ))}
                          </td>
                          <td className="p-4 font-black">{effectiveRevenue.toFixed(0)} ج</td>
                          <td className="p-4 font-black text-purple-600">{(isCancelled ? 0 : orderCost).toFixed(0)} ج</td>
                          <td className="p-4">
                            <span className={`font-black ${orderProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{orderProfit.toFixed(0)} ج</span>
                            {cancelledKeptDeposit > 0 && <span className="text-[9px] font-bold text-amber-600 block">ديبوزيت محتفظ بيه</span>}
                          </td>
                          <td className="p-4 font-black text-blue-600">{o.deposit.toFixed(0)} ج</td>
                          <td className="p-4">
                            <span className={`font-black ${remaining === 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{remaining.toFixed(0)} ج</span>
                          </td>
                          <td className="p-4">
                            {o.paidInFull ? (
                              <span className="text-[9px] font-black px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700">مدفوع بالكامل</span>
                            ) : (
                              <span className="text-[9px] font-black px-2 py-1 rounded-lg bg-amber-50 text-amber-700">متبقي {remaining.toFixed(0)} ج</span>
                            )}
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

      {/* ==================== ORDER FORM MODAL ==================== */}
      {showOrderForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-2xl rounded-[2rem] overflow-hidden shadow-2xl text-right max-h-[95vh] flex flex-col">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center shrink-0">
              <h3 className="text-lg font-black text-slate-800">{editingOrderId ? 'تعديل طلب جملة' : 'طلب جملة جديد'} 📋</h3>
              <button onClick={() => setShowOrderForm(false)} className="w-9 h-9 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 font-bold transition-all cursor-pointer">✕</button>
            </div>
            <div className="p-6 overflow-y-auto space-y-5 flex-1">
              {/* Customer Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] text-slate-400 font-black block mb-1">اسم العميل</label>
                  <input type="text" value={orderForm.customerName} onChange={e => setOrderForm(prev => ({ ...prev, customerName: e.target.value }))} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-100 text-right" placeholder="اسم العميل" />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 font-black block mb-1">رقم الهاتف</label>
                  <input type="text" value={orderForm.customerPhone} onChange={e => setOrderForm(prev => ({ ...prev, customerPhone: e.target.value }))} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-100 text-right" placeholder="رقم الهاتف" />
                </div>
                <div className="md:col-span-2">
                  <label className="text-[10px] text-slate-400 font-black block mb-1">العنوان</label>
                  <input type="text" value={orderForm.customerAddress} onChange={e => setOrderForm(prev => ({ ...prev, customerAddress: e.target.value }))} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-100 text-right" placeholder="العنوان" />
                </div>
              </div>

              {/* Order Items */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <span className="text-[10px] text-slate-400 font-black">المنتجات المطلوبة</span>
                  <button onClick={handleAddOrderItem} className="text-[10px] font-black px-3 py-1.5 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 transition-all cursor-pointer">+ إضافة منتج</button>
                </div>
                {orderForm.items.map((item, idx) => (
                  <div key={idx} className="bg-slate-50/80 rounded-2xl p-4 mb-3 border border-slate-100">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[9px] text-slate-400 font-black">منتج {idx + 1}</span>
                      {orderForm.items.length > 1 && (
                        <button onClick={() => handleRemoveOrderItem(idx)} className="p-1 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"><X size={14} /></button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="col-span-2">
                        <label className="text-[9px] text-slate-400 font-black block mb-1">المنتج</label>
                        <select value={item.variantId} onChange={e => handleOrderItemChange(idx, 'variantId', e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-[11px] font-bold outline-none cursor-pointer text-right">
                          <option value="">اختر المنتج...</option>
                          {allVariants.map(v => (
                            <option key={v.variantId} value={v.variantId}>{v.productName} ({v.color || 'عادي'} / {v.size || 'عادي'})</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-[9px] text-slate-400 font-black block mb-1">الكمية</label>
                        <input type="number" min="1" value={item.quantity} onChange={e => handleOrderItemChange(idx, 'quantity', Number(e.target.value))} className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-[11px] font-bold outline-none text-center" />
                      </div>
                      <div>
                        <label className="text-[9px] text-slate-400 font-black block mb-1">سعر القطعة</label>
                        <input type="number" min="0" value={item.wholesalePrice} onChange={e => handleOrderItemChange(idx, 'wholesalePrice', Number(e.target.value))} className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-[11px] font-bold outline-none text-center" />
                      </div>
                    </div>
                    <div className="mt-2 text-[10px] text-slate-500 font-black text-left">المجموع: {(item.wholesalePrice * item.quantity).toFixed(0)} ج.م</div>
                  </div>
                ))}
                {orderForm.items.length > 0 && (
                  <div className="text-left text-sm font-black text-slate-800 pt-2 border-t border-slate-200">
                    الإجمالي الكلي: {orderForm.items.reduce((s, it) => s + it.wholesalePrice * it.quantity, 0).toFixed(0)} ج.م
                  </div>
                )}
              </div>

              {/* Payment & Delivery */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] text-slate-400 font-black block mb-1">تاريخ التسليم</label>
                  <input type="date" value={orderForm.deliveryDate} onChange={e => setOrderForm(prev => ({ ...prev, deliveryDate: e.target.value }))} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-100" />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 font-black block mb-1">قيمة الديبوزيت المدفوع</label>
                  <input type="number" min="0" value={orderForm.deposit} onChange={e => setOrderForm(prev => ({ ...prev, deposit: Number(e.target.value) }))} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-100 text-center" />
                </div>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={orderForm.paidInFull} onChange={e => {
                      const checked = e.target.checked;
                      const total = orderForm.items.reduce((s, it) => s + it.wholesalePrice * it.quantity, 0);
                      setOrderForm(prev => ({ ...prev, paidInFull: checked, paidInFullDate: checked ? new Date().toISOString() : '', deposit: checked ? total : prev.deposit }));
                    }} className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer" />
                    <span className="text-xs font-black text-slate-700">تم الدفع بالكامل</span>
                  </label>
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 font-black block mb-1">حالة الطلب</label>
                  <select value={orderForm.status} onChange={e => setOrderForm(prev => ({ ...prev, status: e.target.value as WholesaleOrder['status'] }))} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-100 cursor-pointer text-right">
                    <option value="قيد التصنيع">قيد التصنيع 🔨</option>
                    <option value="تم التسليم">تم التسليم ✅</option>
                    <option value="الغاء">إلغاء ❌</option>
                  </select>
                </div>
                {orderForm.status === 'الغاء' && (
                  <div className="md:col-span-2 bg-rose-50/50 border border-rose-100 rounded-2xl p-4">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input type="checkbox" checked={orderForm.depositReturned} onChange={e => setOrderForm(prev => ({ ...prev, depositReturned: e.target.checked }))} className="w-4 h-4 rounded border-rose-300 text-rose-600 focus:ring-rose-500 cursor-pointer" />
                      <div>
                        <span className="text-xs font-black text-rose-700">تم إرجاع الديبوزيت للعميل</span>
                        <span className="text-[10px] font-bold text-rose-400 block">لو العميل رجّع الفلوس كاملة اعمل صح، لو اتفاوضتوا ومسكتوا الفلوس اسيبه فاضي</span>
                      </div>
                    </label>
                  </div>
                )}
                <div className="md:col-span-2">
                  <label className="text-[10px] text-slate-400 font-black block mb-1">ملاحظات</label>
                  <textarea value={orderForm.notes} onChange={e => setOrderForm(prev => ({ ...prev, notes: e.target.value }))} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-100 text-right resize-none" rows={2} placeholder="ملاحظات..." />
                </div>
              </div>

              {orderForm.items.length > 0 && (
                <div className="bg-slate-50 rounded-2xl p-4 space-y-1 text-xs font-black">
                  <div className="flex justify-between"><span>الإجمالي:</span><span>{orderForm.items.reduce((s, it) => s + it.wholesalePrice * it.quantity, 0).toFixed(0)} ج.م</span></div>
                  <div className="flex justify-between text-blue-600"><span>المدفوع:</span><span>{orderForm.deposit.toFixed(0)} ج.م</span></div>
                  <div className="flex justify-between text-rose-600 border-t border-slate-200 pt-1"><span>المتبقي:</span><span>{Math.max(0, orderForm.items.reduce((s, it) => s + it.wholesalePrice * it.quantity, 0) - orderForm.deposit).toFixed(0)} ج.م</span></div>
                </div>
              )}
            </div>
            <div className="p-6 border-t border-slate-100 flex justify-between shrink-0">
              <button onClick={() => setShowOrderForm(false)} className="px-6 py-2.5 rounded-xl border border-slate-200 text-slate-500 font-black text-xs hover:bg-slate-50 transition-all cursor-pointer">إلغاء</button>
              <button onClick={handleSaveOrder} className="px-6 py-2.5 rounded-xl bg-blue-600 text-white font-black text-xs hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 cursor-pointer flex items-center gap-2"><Save size={14} /> حفظ الطلب</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
