import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Order, OrderStatus } from '../types';
import { 
  AlertCircle, Clock, Truck, ClipboardList, DollarSign, 
  Package, Coins, Calendar, TrendingUp, Eye, X, Search
} from 'lucide-react';
import { STATUS_DETAILS } from '../lib/constants';

const safeDate = (d?: string) => { if (!d) return new Date(); const dt = new Date(d); return isNaN(dt.getTime()) ? new Date() : dt; };

export function Dashboard() {
  const { 
    orders = [], setOrders, products = [], generalExpenses = [], workers = [], productionIntakes = [] 
  } = useApp();

  // Selected order for detailed modal view
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Time range filters (default to last 7 days)
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setDate(new Date().getDate() - 7)).toISOString().split("T")[0],
    end: new Date().toISOString().split("T")[0]
  });

  const handleQuickRange = (range: "today" | "7days" | "month" | "all") => {
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];

    if (range === "today") {
      setDateRange({ start: todayStr, end: todayStr });
    } else if (range === "7days") {
      const prev = new Date(new Date().setDate(today.getDate() - 7)).toISOString().split("T")[0];
      setDateRange({ start: prev, end: todayStr });
    } else if (range === "month") {
      const monthStart = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`;
      setDateRange({ start: monthStart, end: todayStr });
    } else if (range === "all") {
      setDateRange({ start: "2020-01-01", end: todayStr });
    }
  };

  const activeRangeButton = useMemo(() => {
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];
    const monthStart = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`;
    const prev = new Date(new Date().setDate(today.getDate() - 7)).toISOString().split("T")[0];

    if (dateRange.start === todayStr && dateRange.end === todayStr) return "today";
    if (dateRange.start === prev && dateRange.end === todayStr) return "7days";
    if (dateRange.start === monthStart && dateRange.end === todayStr) return "month";
    if (dateRange.start === "2020-01-01" && dateRange.end === todayStr) return "all";
    return "custom";
  }, [dateRange]);

  // Alert/Warning orders
  const urgentOrders = useMemo(() => {
    return (orders || []).filter(o => {
      const isUrgent = o.isUrgent || o.deliveryDuration === "urgent";
      return isUrgent && o.status !== "delivered" && o.status !== "cancelled" && o.status !== "returned" && o.status !== "completed";
    });
  }, [orders]);

  const overdueOrders = useMemo(() => {
    const now = new Date();
    return (orders || []).filter(o => {
      if (o.status === "delivered" || o.status === "cancelled" || o.status === "returned" || o.status === "completed") return false;
      return safeDate(o.deadlineDate) < now;
    });
  }, [orders]);

  const readyForShippingOrders = useMemo(() => {
    return (orders || []).filter(o => o.status === "out_for_delivery" || o.status === "manufactured" || o.status === "shipped");
  }, [orders]);

  // Statistics Computations
  const stats = useMemo(() => {
    const inRange = (dateStr: string) => {
      try {
        const d = new Date(dateStr);
        const start = new Date(dateRange.start);
        const end = new Date(dateRange.end);
        end.setHours(23, 59, 59);
        return d >= start && d <= end;
      } catch (err) {
        return false;
      }
    };

    // Calculate revenue for a single order
    const singleOrderRevenue = (order: Order) => {
      if (order.status === "cancelled" || order.status === "returned") return 0;
      
      const itemsSum = (order.items || [])
        .filter(item => !item.isReturned && item.productionStatus !== "cancelled")
        .reduce((sum, item) => sum + (item.price * item.quantity), 0);
      
      const shippingAmount = order.shippingAmount || 0;
      const shippingAdded = order.shippingPaid ? 0 : shippingAmount;
      const discount = Number(order.discount) || 0;

      return itemsSum + shippingAdded - discount;
    };

    const filteredOrdersList = (orders || []).filter(o => o.creationDate && inRange(o.creationDate) && o.status !== "cancelled" && o.status !== "returned");
    const totalCount = filteredOrdersList.length;

    // Total sales revenue
    const totalRevenue = (orders || [])
      .filter(o => o.creationDate && inRange(o.creationDate))
      .reduce((sum, o) => sum + singleOrderRevenue(o), 0);

    // Total manufacturing/material costs (COGS)
    // Include returned orders since their costs were still incurred
    const mfgCostsList = (orders || []).filter(o => o.creationDate && inRange(o.creationDate) && o.status !== "cancelled");
    const totalMfgCosts = mfgCostsList.reduce((sum, o) => {
      const orderCost = (o.items || []).reduce((itemSum, item) => {
        const prod = products.find(p => p.id === item.productId);
        const basicCost = prod ? ((prod.materialsCost || 0) + (prod.workshopFee || 0)) : 0;
        return itemSum + (basicCost * item.quantity);
      }, 0);
      return sum + orderCost;
    }, 0);

    const grossProfit = totalRevenue - totalMfgCosts;

    return {
      count: totalCount,
      revenue: totalRevenue,
      mfgCost: totalMfgCosts,
      profit: grossProfit,
      ordersList: filteredOrdersList
    };
  }, [dateRange, orders, products]);

  // General Expenses sum
  const totalExpenses = useMemo(() => {
    try {
      const start = new Date(dateRange.start);
      const end = new Date(dateRange.end);
      end.setHours(23, 59, 59);

      return (generalExpenses || []).reduce((sum, exp) => {
        if (!exp.date) return sum;
        const d = new Date(exp.date);
        if (d >= start && d <= end) {
          const amt = exp.paidAmount !== undefined ? exp.paidAmount : exp.amount;
          return sum + (amt || 0);
        }
        return sum;
      }, 0);
    } catch {
      return 0;
    }
  }, [dateRange, generalExpenses]);

  const totalCosts = stats.mfgCost + totalExpenses;
  const netProfit = stats.revenue - totalCosts;
  const netProfitMargin = stats.revenue > 0 ? (netProfit / stats.revenue) * 100 : 0;

  // Recent active orders for the dashboard view
  const activeOrdersList = useMemo(() => {
    return (orders || [])
      .filter(o => o.status !== "cancelled" && o.status !== "returned")
      .slice(0, 10); // Take top 10 recent
  }, [orders]);

  const filteredRecentOrders = useMemo(() => {
    if (!searchTerm.trim()) return activeOrdersList;
    return (orders || []).filter(o => 
      o.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (o.customerPhone && o.customerPhone.includes(searchTerm))
    ).slice(0, 15);
  }, [orders, searchTerm, activeOrdersList]);

  const handleStatusChange = (orderId: string, nextStatus: OrderStatus) => {
    if (!setOrders) return;
    setOrders(orders.map(o => {
      if (o.id === orderId) {
        return { ...o, status: nextStatus, lastUpdateDate: new Date().toISOString() };
      }
      return o;
    }));
  };

  return (
    <div className="space-y-8 text-right pb-16 animate-in fade-in duration-300" dir="rtl">
      {/* Date filter heading row */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-2">
        <div className="space-y-1">
          <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
             أداء سيستم كيدزي للمبيعات 📊
          </h2>
          <p className="text-slate-500 font-bold text-sm">
            نظرة عامة تفاعلية على المبيعات والتكاليف والأرباح بالفترة المحددة
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl w-full sm:w-auto justify-center animate-in slide-in-from-top duration-200">
            <button 
              onClick={() => handleQuickRange("today")}
              className={`px-3 py-1.5 text-xs font-black rounded-xl transition-all ${
                activeRangeButton === "today" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              اليوم
            </button>
            <button 
              onClick={() => handleQuickRange("7days")}
              className={`px-3 py-1.5 text-xs font-black rounded-xl transition-all ${
                activeRangeButton === "7days" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              آخر 7 أيام
            </button>
            <button 
              onClick={() => handleQuickRange("month")}
              className={`px-3 py-1.5 text-xs font-black rounded-xl transition-all ${
                activeRangeButton === "month" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              هذا الشهر
            </button>
            <button 
              onClick={() => handleQuickRange("all")}
              className={`px-3 py-1.5 text-xs font-black rounded-xl transition-all ${
                activeRangeButton === "all" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              كل الوقت
            </button>
          </div>

          <div className="flex items-center justify-between gap-1.5 bg-slate-100/80 hover:bg-slate-100 px-3 py-1.5 rounded-2xl border border-slate-200/40 w-full sm:w-auto transition-colors">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-slate-400 font-black">من:</span>
              <input 
                type="date" 
                value={dateRange.start} 
                onChange={e => setDateRange({ ...dateRange, start: e.target.value })}
                className="bg-transparent text-xs font-black outline-none text-slate-705 w-24 text-center cursor-pointer"
              />
            </div>
            <div className="w-px h-4 bg-slate-200" />
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-slate-400 font-black">إلى:</span>
              <input 
                type="date" 
                value={dateRange.end} 
                onChange={e => setDateRange({ ...dateRange, end: e.target.value })}
                className="bg-transparent text-xs font-black outline-none text-slate-705 w-24 text-center cursor-pointer"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Warning/Alert banners */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {urgentOrders.length > 0 && (
          <div className="bg-red-50/70 border border-red-100 p-4 rounded-3xl flex items-center gap-4 animate-pulse">
            <div className="p-3 bg-red-500 text-white rounded-2xl">
              <AlertCircle size={20} />
            </div>
            <div className="text-right">
              <p className="text-red-900 font-black text-sm">أوردرات مستعجلة ⚡</p>
              <p className="text-red-600 font-bold text-xs mt-0.5">
                لديك {urgentOrders.length} أوردر مستعجل وبانتظار التجهيز وتسليم الورش !
              </p>
            </div>
          </div>
        )}

        {overdueOrders.length > 0 && (
          <div className="bg-amber-50/70 border border-amber-100 p-4 rounded-3xl flex items-center gap-4">
            <div className="p-3 bg-amber-500 text-white rounded-2xl">
              <Clock size={20} />
            </div>
            <div className="text-right">
              <p className="text-amber-900 font-black text-sm">أوردرات متأخرة الموعد ⌛</p>
              <p className="text-amber-600 font-bold text-xs mt-0.5">
                تجاوز {overdueOrders.length} أوردر تاريخ التسليم المطلوب ولم يتم توصيله بعد.
              </p>
            </div>
          </div>
        )}

        {readyForShippingOrders.length > 0 && (
          <div className="bg-blue-50/70 border border-blue-100 p-4 rounded-3xl flex items-center gap-4">
            <div className="p-3 bg-blue-500 text-white rounded-2xl">
              <Truck size={20} />
            </div>
            <div className="text-right">
              <p className="text-blue-900 font-black text-sm">جاهز في المصنع / للشحن 🚚</p>
              <p className="text-blue-600 font-bold text-xs mt-0.5">
                هناك {readyForShippingOrders.length} أوردر تم تفصيله وبانتظار تسليمه للمناديب.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 animate-in fade-in duration-300">
        {/* Count */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:-translate-y-0.5 transition-all duration-300 flex items-start justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">عدد أوردرات الفترة</span>
            <div className="flex items-baseline gap-1 flex-row-reverse justify-end">
              <span className="text-[10px] font-bold text-slate-400">أوردر</span>
              <span className="text-2xl font-black text-slate-800 tracking-tight font-mono">{stats.count.toLocaleString()}</span>
            </div>
            <p className="text-[10px] text-slate-400 font-bold mt-1">المسجلة خلال الفترة والتاريخ المختار</p>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl shrink-0">
            <ClipboardList size={22} />
          </div>
        </div>

        {/* Revenue */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:-translate-y-0.5 transition-all duration-300 flex items-start justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">إجمالي مبيعات الأوردرات</span>
            <div className="flex items-baseline gap-1 flex-row-reverse justify-end">
              <span className="text-[10px] font-bold text-slate-400">ج.م</span>
              <span className="text-2xl font-black text-slate-800 tracking-tight font-mono">{(stats.revenue || 0).toLocaleString()}</span>
            </div>
            <p className="text-[10px] text-emerald-600 font-bold mt-1">قيمة كل الأوردرات بالفترة ما عدا الملغية</p>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl shrink-0">
            <DollarSign size={22} />
          </div>
        </div>

        {/* Total Costs */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:-translate-y-0.5 transition-all duration-300 flex items-start justify-between gap-4">
          <div className="space-y-1 w-full text-right">
            <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">التكاليف والمصاريف</span>
            <div className="flex items-baseline gap-1 flex-row-reverse justify-end">
              <span className="text-[10px] font-bold text-slate-400">ج.م</span>
              <span className="text-2xl font-black text-slate-800 tracking-tight font-mono">{totalCosts.toLocaleString()}</span>
            </div>
            <div className="text-[9px] text-slate-400 font-bold bg-slate-50 p-2.5 rounded-2xl border border-slate-100 space-y-1 mt-2">
              <div className="flex justify-between items-center text-slate-500 font-semibold">
                <span className="font-mono">{stats.mfgCost.toLocaleString()} ج.م</span>
                <span>🧵 خامات وتفصيل:</span>
              </div>
              <div className="flex justify-between items-center text-slate-500 font-semibold">
                <span className="font-mono">{totalExpenses.toLocaleString()} ج.م</span>
                <span>💸 مصاريف عامة:</span>
              </div>
            </div>
          </div>
          <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl shrink-0">
            <Package size={22} />
          </div>
        </div>

        {/* Profits */}
        <div className={`p-6 rounded-3xl shadow-sm hover:-translate-y-0.5 border flex items-start justify-between gap-4 transition-all duration-300 ${
          netProfit >= 0 ? "bg-emerald-50/10 border-emerald-100 text-emerald-950" : "bg-red-50/10 border-red-100 text-red-950"
        }`}>
          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">صافي الأرباح النهائية</span>
            <div className="flex items-baseline gap-1 flex-row-reverse justify-end">
              <span className="text-[10px] font-bold opacity-60">ج.م</span>
              <span className={`text-2xl font-black tracking-tight font-mono ${netProfit >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                {netProfit.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center gap-1.5 mt-2">
              <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-lg ${
                netProfit >= 0 ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
              }`}>
                هامش صافي الربح: <span className="font-mono">{netProfitMargin.toFixed(1)}%</span>
              </span>
            </div>
          </div>
          <div className={`p-3 rounded-2xl shrink-0 ${netProfit >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"}`}>
            <Coins size={22} />
          </div>
        </div>
      </div>



      {/* Recent Orders List Panel: REMADE EXACTLY LIKE THE ORDERS PAGE TABLE */}
      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden text-right">
        <div className="p-6 border-b border-slate-50 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="font-black text-lg text-slate-855 flex items-center gap-1.5">
              <span>أحدث الطلبات النشطة</span>
              <span className="bg-blue-50 text-blue-600 px-2.5 py-1 text-[10px] font-black rounded-xl">نشط</span>
            </h3>
            <p className="text-xs text-slate-400 font-bold">معروضة ومنسقة مثل دفتر الفواتير تماماً. انقر على أي سطر لمعاينته بالكامل</p>
          </div>
          <div className="relative w-full md:w-72">
            <input 
              type="text" 
              placeholder="ابحث برقم الأوردر، العميل، الهاتف..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-100 hover:bg-slate-100/50 rounded-xl px-4 py-2 text-xs font-bold text-slate-705 focus:outline-none focus:border-blue-500 text-right transition-colors"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="bg-slate-100/50 text-slate-455 font-extrabold border-b border-slate-100 select-none">
                <th className="p-4 text-right">مدة التوصيل</th>
                <th className="p-4 text-right">التاريخ</th>
                <th className="p-4 text-right">الاسم ورقم الطلب</th>
                <th className="p-4 text-right">رقم التليفون</th>
                <th className="p-4 text-right">العنوان</th>
                <th className="p-4 text-right">اسم الطفلة</th>
                <th className="p-4 text-right">القطع المطلوبة بمقاسها ولونها</th>
                <th className="p-4 text-left">إجمالي القيمة</th>
                <th className="p-4 text-center">حالة الأوردر</th>
                <th className="p-4 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-slate-700 font-bold font-sans">
              {filteredRecentOrders.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-16 text-center text-xs font-black text-slate-400 italic">
                    لا توجد فواتير أوردرات نشطة لعرضها حالياً بالدفتر.
                  </td>
                </tr>
              ) : (
                filteredRecentOrders.map(o => {
                  const isUrgent = o.isUrgent || o.deliveryDuration === "urgent";
                  const isDelivered = o.status === "delivered";
                  const isCancelled = o.status === "cancelled";
                  const statusMeta = STATUS_DETAILS[o.status] || { label: o.status, color: "bg-slate-100 text-slate-700 border-slate-200", icon: Clock };

                  const rowClass = isDelivered 
                    ? "bg-emerald-50 hover:bg-emerald-100/40 border-r-emerald-500 text-slate-800" 
                    : isUrgent && !isCancelled 
                      ? "bg-rose-50 hover:bg-rose-100/40 border-r-red-500 text-slate-800"
                      : "bg-white hover:bg-slate-50/50 border-r-transparent text-slate-700";

                  return (
                    <tr 
                      key={o.id} 
                      className={`transition-all cursor-pointer border-r-[4px] ${rowClass}`}
                      onClick={() => {
                        setSelectedOrder(o);
                        setIsOrderModalOpen(true);
                      }}
                    >
                      {/* 1. Delivery priority / duration detail */}
                      <td className="p-4">
                        {isUrgent && !isCancelled ? (
                          <span className="bg-red-50 text-red-601 px-2 py-1 rounded-lg text-[10px] font-black animate-pulse flex items-center gap-1 w-max">
                            ⚡ مستعجل
                          </span>
                        ) : (
                          <span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg text-[10px] font-black">
                            عادي
                          </span>
                        )}
                      </td>

                      {/* 2. Precise creation date formatted */}
                      <td className="p-4 whitespace-nowrap">
                        <div className="flex flex-col text-[10.5px] font-mono leading-relaxed text-right">
                          <span className="font-bold text-slate-750">
                            {safeDate(o.creationDate).toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" })}
                          </span>
                          <span className="text-slate-400 text-[10px] mt-0.5">
                            {safeDate(o.creationDate).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: true }).toLowerCase()}
                          </span>
                        </div>
                      </td>

                      {/* 3. Customer Name & Code */}
                      <td className="p-4 whitespace-nowrap">
                        <div className="flex flex-col text-right">
                          <span className="font-extrabold text-slate-800 text-xs">{o.customerName}</span>
                          <span className="text-[10.5px] text-blue-600 font-mono font-black mt-0.5">{o.id}</span>
                        </div>
                      </td>

                      {/* 4. Customer contact phone numbers */}
                      <td className="p-4 whitespace-nowrap">
                        <div className="flex flex-col text-xs font-mono text-slate-600 leading-normal text-right">
                          <span>{o.customerPhone}</span>
                          {o.customerPhone2 && <span className="text-slate-400 text-[10px]">{o.customerPhone2}</span>}
                        </div>
                      </td>

                      {/* 5. Delivery target coordinates */}
                      <td className="p-4 max-w-[200px]" title={`${o.governorate} - ${o.address}`}>
                        <div className="flex flex-col text-right max-w-[170px]">
                          <span className="text-blue-600 font-extrabold text-xs">{o.governorate}</span>
                          <span className="text-slate-500 font-bold text-[10.5px] mt-1 truncate">{o.address}</span>
                        </div>
                      </td>

                      {/* 6. Little girl name */}
                      <td className="p-4 text-slate-700 whitespace-nowrap text-xs font-black">
                        {(o.items || []).map(it => it.childName).filter(Boolean).join(" - ") || o.childName || "—"}
                      </td>

                      {/* 7. Physically ordered items list */}
                      <td className="p-4 max-w-[240px]">
                        <div className="flex flex-col gap-1 items-start">
                          {(o.items || []).map((it, idx) => (
                            <div key={idx} className="flex items-center gap-1.5 justify-start text-[11px]">
                              <span className="bg-slate-200/60 text-slate-755 px-1.5 py-0.5 rounded-md text-[9.5px] font-mono font-bold shrink-0">
                                {it.quantity}x
                              </span>
                              <span className="text-slate-700 font-extrabold truncate" title={it.productName || it.name}>
                                {it.productName || it.name}
                              </span>
                              <span className="text-slate-400 text-[9.5px] shrink-0 font-bold">
                                {it.size || it.color ? `(${it.size || ''}/${it.color || ''})` : ''}
                              </span>
                            </div>
                          ))}
                        </div>
                      </td>

                      {/* 8. Order total fee */}
                      <td className="p-4 font-black font-mono text-slate-800 whitespace-nowrap text-xs text-left">
                        <div>{(o.total || 0).toLocaleString()} ج.م</div>
                        {o.collectionTotal ? <div className="text-[9px] text-blue-500 font-bold mt-0.5">تحصيل: {o.collectionTotal} ج.م</div> : null}
                      </td>

                      {/* 9. Order general status pill dropdown */}
                      <td className="p-4 text-center whitespace-nowrap" onClick={e => e.stopPropagation()}>
                        <select
                          value={o.status}
                          onChange={e => handleStatusChange(o.id, e.target.value as OrderStatus)}
                          className={`text-[10px] font-black border rounded-xl py-1 px-2 w-max transition-all outline-none cursor-pointer text-center ${statusMeta.color}`}
                        >
                          {Object.entries(STATUS_DETAILS)
                            .filter(([k]) => k !== "completed")
                            .map(([k, v]) => (
                              <option key={k} value={k} className="bg-white text-slate-700">{v.label}</option>
                            ))}
                        </select>
                      </td>

                      {/* 10. Action buttons triggers */}
                      <td className="p-4 text-center whitespace-nowrap" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => {
                            setSelectedOrder(o);
                            setIsOrderModalOpen(true);
                          }}
                          className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors flex items-center gap-1 text-[10px] font-black border border-slate-200/50 w-full justify-center cursor-pointer"
                        >
                          <Eye size={12} />
                          <span>معاينة</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Details Modal popup */}
      {isOrderModalOpen && selectedOrder && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-[3px] z-[999] flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-2xl rounded-[2.5rem] overflow-hidden shadow-2xl p-6 text-right space-y-6">
            <div className="flex justify-between items-center border-b border-slate-50 pb-4">
              <button 
                onClick={() => {
                  setIsOrderModalOpen(false);
                  setSelectedOrder(null);
                }}
                className="p-1 px-2.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 font-black cursor-pointer"
              >
                <X size={20} />
              </button>
              <h3 className="text-base sm:text-lg font-black text-slate-850 flex items-center gap-2 select-none">
                <span>تفاصيل الأوردر الملي والتشغيلي</span>
                <span className="font-mono text-blue-600 font-black">{selectedOrder.id}</span>
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs font-black">
              {/* Box 1: Customer details */}
              <div className="p-4 bg-slate-50/70 rounded-2xl border border-slate-100 space-y-2 text-right">
                <h4 className="text-sm font-black text-slate-700 pb-1 border-b border-slate-100 flex justify-between items-center">
                  <span>معلومات العميل</span>
                  <span>👤</span>
                </h4>
                <div className="space-y-1.5 pt-1 text-slate-600">
                  <p>الاسم: <strong className="text-slate-800">{selectedOrder.customerName}</strong></p>
                  <p>موبايل 1: <strong className="text-slate-800 font-mono">{selectedOrder.customerPhone}</strong></p>
                  {selectedOrder.customerPhone2 && <p>موبايل 2: <strong className="text-slate-800 font-mono">{selectedOrder.customerPhone2}</strong></p>}
                  <p>المحافظة: <strong className="text-slate-800">{selectedOrder.governorate}</strong></p>
                  <p>العنوان: <strong className="text-slate-800 font-normal">{selectedOrder.address}</strong></p>
                </div>
              </div>

              {/* Box 2: Financial details */}
              <div className="p-4 bg-slate-50/70 rounded-2xl border border-slate-100 space-y-2 text-right">
                <h4 className="text-sm font-black text-slate-700 pb-1 border-b border-slate-100 flex justify-between items-center">
                  <span>التحصيل والمستحقات والربح</span>
                  <span>💰</span>
                </h4>
                <div className="space-y-1.5 pt-1 text-slate-600 font-sans">
                  <p className="flex justify-between">
                    <span>قيمة المنتجات:</span>
                    <strong className="text-slate-800">{(selectedOrder.items || []).reduce((sum, item) => sum + (item.price * item.quantity), 0).toLocaleString()} ج.م</strong>
                  </p>
                  <p className="flex justify-between">
                    <span>قيمة الشحن:</span>
                    <strong className="text-slate-800">
                      {selectedOrder.shippingAmount.toLocaleString()} ج.م 
                      {selectedOrder.shippingPaid ? <span className="text-[10px] text-green-600 font-semibold bg-green-50 px-1 rounded-md mr-1 select-none">مدفوع مسبقاً</span> : ""}
                    </strong>
                  </p>
                  {selectedOrder.discount ? (
                    <p className="flex justify-between text-rose-600">
                      <span>خصومات إضافية:</span>
                      <strong>-{selectedOrder.discount.toLocaleString()} ج.م</strong>
                    </p>
                  ) : ""}
                  {selectedOrder.collectionTotal ? (
                    <p className="flex justify-between text-blue-500">
                      <span>التحصيل المطلوب (للمندوب):</span>
                      <strong>{selectedOrder.collectionTotal.toLocaleString()} ج.م</strong>
                    </p>
                  ) : ""}
                  <p className="flex justify-between pt-1 border-t border-slate-200/50 text-slate-800 font-black">
                    <span>صافي القيمة الكلية:</span>
                    <span className="text-blue-600">{(selectedOrder.total || 0).toLocaleString()} ج.م</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Selected order garments items detail */}
            <div className="space-y-2">
              <h4 className="text-sm font-black text-slate-800 select-none flex items-center gap-1.5">
                <span>👕</span>
                <span>القطع المطلوبة بالأوردر ومراحل إنتاجها:</span>
              </h4>
              <div className="bg-slate-50/50 rounded-2xl border border-slate-100 p-4 divide-y divide-slate-100 space-y-3">
                {selectedOrder.items?.map((item, index) => (
                  <div key={index} className="flex justify-between items-center pt-2 first:pt-0 text-xs font-bold text-slate-600">
                    <div className="space-y-0.5 text-right flex-1">
                      <p className="font-black text-slate-800 text-sm">{item.productName || item.name}</p>
                      <p className="text-[11px] text-slate-400">
                        اللون: <strong className="text-slate-600">{item.color || "غير محدد"}</strong> | 
                        المقاس: <strong className="text-slate-600">{item.size || "S"}</strong> | 
                        الكمية: <strong className="text-slate-700 font-mono">{item.quantity} قطع</strong>
                      </p>
                      {item.childName && <p className="text-[11px] text-blue-500 font-black">مقاس مفصل للطفل: {item.childName}</p>}
                    </div>
                    <div className="text-left font-sans pl-2 shrink-0">
                      <span className="font-mono font-black text-slate-800">{(item.price * item.quantity).toLocaleString()} ج.م</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Foot note */}
            {selectedOrder.notes ? (
              <div className="bg-amber-50/40 p-4 border border-amber-100 rounded-2xl text-[11px] font-black text-amber-700">
                📝 ملاحظات إدارية: {selectedOrder.notes}
              </div>
            ) : null}

            {/* Screenshot */}
            {selectedOrder.screenshot ? (
              <div className="space-y-1.5 pt-1">
                <span className="text-[9px] font-black text-slate-400 block uppercase text-right">لقطة شاشة المحادثة المرفقة (Screenshot):</span>
                <img
                  src={selectedOrder.screenshot}
                  alt="Screenshot preview"
                  className="border border-slate-150 rounded-2xl overflow-hidden w-full object-contain shadow-sm bg-slate-50 cursor-pointer"
                  referrerPolicy="no-referrer"
                  onClick={() => window.open(selectedOrder.screenshot!, '_blank')}
                />
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
