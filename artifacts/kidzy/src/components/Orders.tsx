/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { Order, OrderStatus, Product, OrderItem } from '../types';
import { 
  Plus, Search, Calendar, Sparkles, AlertCircle, FileText, 
  MapPin, Phone, User, Eye, Trash2, Edit2, Upload, 
  RefreshCw,
  Clock
} from 'lucide-react';
import { STATUS_DETAILS, GOVERNORATES, ORDER_SOURCES } from '../lib/constants';

export const Orders: React.FC = () => {
  const { orders, setOrders, products } = useApp();

  // Dialog & View management
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | "returns">("all");
  const [modalType, setModalType] = useState<"manual" | "smart">("manual");
  const [sendConfirm, setSendConfirm] = useState(true);
  const [viewingOrder, setViewingOrder] = useState<Order | null>(null);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);

  // Filters State
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [govFilter, setGovFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState({ start: "", end: "" });

  // Order Creation Form State
  const [formState, setFormState] = useState<{
    customerName: string;
    childName: string;
    customerPhone: string;
    customerPhone2: string;
    governorate: string;
    address: string;
    items: { 
      productId: string; 
      variantId: string; 
      quantity: number; 
      price: number;
      color?: string;
      size?: string;
      childName?: string;
      notes?: string;
    }[];
    shippingAmount: number;
    discount: number;
    shippingPaid: boolean;
    deliveryDuration: "normal" | "urgent";
    source: string;
    notes: string;
    screenshot?: string;
  }>({
    customerName: "",
    childName: "",
    customerPhone: "",
    customerPhone2: "",
    governorate: "القاهرة",
    address: "",
    items: [],
    shippingAmount: 50,
    discount: 0,
    shippingPaid: false,
    deliveryDuration: "normal",
    source: "فيسبوك",
    notes: "",
    screenshot: undefined
  });

  // AI OCR Panel text state
  const [aiInputText, setAiInputText] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  // Filter calculations
  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      // Search Box
      const q = searchQuery.toLowerCase().trim();
      const matchSearch = !q || 
        o.id.toLowerCase().includes(q) ||
        o.customerName.toLowerCase().includes(q) ||
        o.customerPhone.includes(q) ||
        (o.customerPhone2 || "").includes(q);

      // Status
      const matchStatus = statusFilter === "all" || o.status === statusFilter;

      // Governorate
      const matchGov = govFilter === "all" || o.governorate === govFilter;

      // Source
      const matchSource = sourceFilter === "all" || o.source === sourceFilter;

      // Date Limit
      let matchDate = true;
      if (dateFilter.start) {
        matchDate = matchDate && new Date(o.creationDate) >= new Date(dateFilter.start);
      }
      if (dateFilter.end) {
        matchDate = matchDate && new Date(o.creationDate) <= new Date(dateFilter.end + "T23:59:59");
      }

      return matchSearch && matchStatus && matchGov && matchSource && matchDate;
    });
  }, [orders, searchQuery, statusFilter, govFilter, sourceFilter, dateFilter]);

  const returnedOrders = useMemo(() => {
    return orders.filter(o => {
      const isReturnedType = o.status === "returned" || o.status === "returned_partial";
      if (!isReturnedType) return false;

      const q = searchQuery.toLowerCase().trim();
      const matchSearch = !q || 
        o.id.toLowerCase().includes(q) ||
        o.customerName.toLowerCase().includes(q) ||
        o.customerPhone.includes(q) ||
        (o.customerPhone2 || "").includes(q);

      return matchSearch;
    });
  }, [orders, searchQuery]);

  // Order Calculations
  const calculateFormTotal = () => {
    const itemsTotal = formState.items.reduce((sum, item) => sum + ((item.price || 0) * (item.quantity || 0)), 0);
    const shipping = formState.shippingPaid ? 0 : (formState.shippingAmount || 0);
    return itemsTotal + shipping - (formState.discount || 0);
  };

  // Add Item to creation basket list
  const handleAddFormItem = () => {
    setFormState(prev => ({
      ...prev,
      items: [...prev.items, { 
        productId: "", 
        variantId: "", 
        quantity: 1, 
        price: 0, 
        color: "", 
        size: "", 
        childName: prev.childName || "", 
        notes: "" 
      }]
    }));
  };

  const handleRemoveFormItem = (idx: number) => {
    setFormState(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== idx)
    }));
  };

  const handleFormItemChange = (idx: number, field: string, val: string | number) => {
    setFormState(prev => {
      const updated = [...prev.items];
      updated[idx] = { ...updated[idx], [field]: val };

      // Reset dependent fields when product/color changes.
      if (field === "productId") {
        const prod = products.find(p => p.id === val);
        if (prod) {
          updated[idx].price = prod.sellingPrice;
        }
        updated[idx].variantId = "";
        updated[idx].color = "";
        updated[idx].size = "";
      }
      if (field === "color") {
        updated[idx].variantId = "";
        updated[idx].size = "";
      }

      // Match the exact variant once color + size are known.
      if (field === "size" || field === "variantId") {
        const prod = products.find(p => p.id === updated[idx].productId);
        const variant = prod?.variants?.find(v => {
          if (field === "variantId") return v.id === val;
          return v.color === updated[idx].color && v.size === val;
        });
        if (variant) {
          updated[idx].variantId = variant.id;
          updated[idx].color = variant.color || "";
          updated[idx].size = variant.size || "";
        }
      }
      return { ...prev, items: updated };
    });
  };

  // Parse order text using the exact moderator template format
  const parseOrderText = (text: string) => {
    // 1. Normalize Arabic digits to Western
    const arabicDigits = ['٠','١','٢','٣','٤','٥','٦','٧','٨','٩'];
    const westernDigits = ['0','1','2','3','4','5','6','7','8','9'];
    let cleanText = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    arabicDigits.forEach((digit, i) => cleanText = cleanText.split(digit).join(westernDigits[i]));

    const governorates = ['القاهرة','الجيزة','الإسكندرية','الدقهلية','الغربية','المنوفية','الشرقية','القليوبية','البحيرة','كفر الشيخ','دمياط','بورسعيد','الإسماعيلية','السويس','الفيوم','بني سويف','المنيا','أسيوط','سوهاج','قنا','الأقصر','أسوان','مطروح','شمال سيناء','جنوب سيناء','الوادي الجديد','البحر الأحمر'];

    // Extract value following a label in format "Label: Value" or "Label\nValue"
    const KNOWN_ORDER = ['الاسم','رقم تليفون','المحافظة','العنوان','نوع المنتج','اللون','المقاس','اسم الطفلة','سعر الاوردر','الشحن','توتال السعر','مدة التوصيل'];

    // Helper: find the label in text and capture what follows (until next label or end)
    const labelVal = (label: string): string => {
      const esc = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const nextLabels = KNOWN_ORDER.filter(l => l !== label).map(l => l.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
      // Try colon format: "Label: Value"
      const colonRe = new RegExp(`(?:^|\\n)\\s*${esc}\\s*[:=\\-]?\\s*([^\\n]+?)\\s*(?=\\n(?:${nextLabels})|\\n?$)`, 'mi');
      const m = cleanText.match(colonRe);
      if (m) return m[1].replace(/[:\-=]$/, '').trim();
      return '';
    };

    // Extract header/footer fields
    const customerName = labelVal('الاسم');
    const customerPhone = labelVal('رقم تليفون') || cleanText.match(/01[0-9]{9}/)?.[0] || '';
    const governorate = labelVal('المحافظة') || governorates.find(g => cleanText.includes(g)) || '';
    const address = labelVal('العنوان');
    const orderPrice = parseInt(labelVal('سعر الاوردر').replace(/[ج\.]/g, '')) || 0;
    const shippingAmount = parseInt(labelVal('الشحن').replace(/[ج\.]/g, '')) || 0;
    const totalPrice = parseInt(labelVal('توتال السعر').replace(/[ج\.]/g, '')) || 0;
    const deliveryText = labelVal('مدة التوصيل');

    // Extract item blocks (everything between the last "العنوان" value and "سعر الاوردر")
    // Strategy: find all occurrences of the 4 item labels in order and group them
    const itemLabels = ['نوع المنتج', 'اللون', 'المقاس', 'اسم الطفلة'];
    // Collect all label:value pairs in the document
    const allPairs: { label: string; value: string }[] = [];
    const allValues: Record<string, string[]> = { 'نوع المنتج': [], 'اللون': [], 'المقاس': [], 'اسم الطفلة': [] };

    // Scan for item labels with their values
    let searchFrom = 0;
    while (searchFrom < cleanText.length) {
      let found = false;
      for (const lbl of itemLabels) {
        const esc = lbl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const re = new RegExp(`(?:^|\\n)\\s*${esc}\\s*[:=\\-]?\\s*([^\\n]+?)\\s*(?=\\n|$)`, 'mi');
        re.lastIndex = searchFrom;
        const m = cleanText.substr(searchFrom).match(re);
        if (m && m.index !== undefined && m.index + searchFrom >= searchFrom) {
          const absoluteIdx = m.index + searchFrom;
          if (absoluteIdx >= searchFrom) {
            const val = m[1].replace(/[:\-=]$/, '').trim();
            allValues[lbl].push(val);
            searchFrom = absoluteIdx + m[0].length;
            found = true;
            break;
          }
        }
      }
      if (!found) break;
    }

    // Group the collected values into item blocks in order of capture
    const itemNamesList = allValues['نوع المنتج'];
    const itemColorsList = allValues['اللون'];
    const itemSizesList = allValues['المقاس'];
    const itemChildNamesList = allValues['اسم الطفلة'];
    const itemCount = Math.max(itemNamesList.length, itemColorsList.length, itemSizesList.length, itemChildNamesList.length);

    const parsedItems: { name: string; quantity: number; price: number; color: string; size: string; childName: string }[] = [];
    if (itemCount > 0) {
      const perItemPrice = orderPrice > 0 && itemCount > 0
        ? Math.round(orderPrice / itemCount)
        : 0;
      for (let idx = 0; idx < itemCount; idx++) {
        parsedItems.push({
          name: itemNamesList[idx] || '',
          quantity: 1,
          price: perItemPrice,
          color: itemColorsList[idx] || '',
          size: itemSizesList[idx] || '',
          childName: itemChildNamesList[idx] || itemChildNamesList[0] || '',
        });
      }
    }

    const deliveryDuration = /\b(?:مستعجل|عاجل|ضروري)\b/i.test(deliveryText) ? 'urgent' : 'normal';
    const shippingPaid = /\b(?:مدفوع|مدفوع سلفا|تم الدفع)\b/i.test(deliveryText) || /\b(?:مدفوع|مدفوع سلفا|تم الدفع)\b/i.test(cleanText);

    return { 
      customerName, 
      childName: itemChildNamesList[0] || '', 
      customerPhone, 
      customerPhone2: '', 
      governorate, 
      address, 
      discount: 0, 
      deliveryDuration, 
      shippingPaid,
      shippingAmount,
      notes: '', 
      parsedItems,
      totalPrice,
    };
  };

  const handleLocally = () => {
    if (!aiInputText.trim()) {
      alert('من فضلك اكتب نص الأوردر أولاً');
      return;
    }
    const parsed = parseOrderText(aiInputText);
    const transformedItems = parsed.parsedItems.map(extItem => {
      const matchedProd = products.find(p =>
        p.name.toLowerCase().includes(extItem.name.toLowerCase()) ||
        extItem.name.toLowerCase().includes(p.name.toLowerCase())
      );
      const matchedVariant = matchedProd?.variants?.find(v =>
        v.color === extItem.color && v.size === extItem.size
      ) || matchedProd?.variants?.[0];
      return {
        productId: matchedProd?.id || "",
        name: matchedProd?.name || extItem.name,
        productName: matchedProd?.name || extItem.name,
        variantId: matchedVariant?.id || "",
        quantity: extItem.quantity || 1,
        price: extItem.price || matchedProd?.sellingPrice || 0,
        color: matchedVariant?.color || extItem.color || "",
        size: matchedVariant?.size || extItem.size || "",
        childName: extItem.childName || "",
        productionStatus: "not_started" as const,
      };
    });

    setFormState(prev => ({
      ...prev,
      customerName: parsed.customerName || prev.customerName,
      customerPhone: parsed.customerPhone || prev.customerPhone,
      customerPhone2: parsed.customerPhone2 || prev.customerPhone2,
      governorate: parsed.governorate || prev.governorate,
      address: parsed.address || prev.address,
      discount: parsed.discount || prev.discount || 0,
      deliveryDuration: parsed.deliveryDuration || prev.deliveryDuration,
      shippingPaid: parsed.shippingPaid !== undefined ? parsed.shippingPaid : prev.shippingPaid,
      shippingAmount: parsed.shippingAmount || prev.shippingAmount,
      notes: parsed.notes || prev.notes,
      items: transformedItems.length > 0 ? transformedItems : prev.items,
    }));

    setModalType("manual");
    setAiInputText("");
  };



  // Drag over upload screenshot
  const handleContainerDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDropScreenshot = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = reader.result as string;
          setFormState(prev => ({ ...prev, screenshot: base64 }));
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setFormState(prev => ({ ...prev, screenshot: base64 }));
      };
      reader.readAsDataURL(file);
    }
  };

  // Submit Order Save
  const handleSaveOrder = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formState.customerName.trim() || !formState.customerPhone.trim()) {
      alert("يرجى إدخال اسم العميل ورقم الهاتف للتثبيت.");
      return;
    }

    if (formState.items.length === 0) {
      alert("الطلب فارغ! الرجاء تبييت قطعة ملابس واحدة على الأقل بالداخل.");
      return;
    }

    // Prepare items array
    const compiledItems: OrderItem[] = formState.items.map(basketItem => {
      const prod = products.find(p => p.id === basketItem.productId);
      const variant = prod?.variants?.find(v => 
        v.id === basketItem.variantId || (v.color === basketItem.color && v.size === basketItem.size)
      );
      
      return {
        id: `it-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        productId: basketItem.productId,
        productName: prod?.name || "موديل ممسوح",
        name: prod?.name || "موديل ممسوح",
        productCode: prod?.code || "N/A",
        variantId: basketItem.variantId || variant?.id || "",
        color: basketItem.color || variant?.color || "N/A",
        size: basketItem.size || variant?.size || "N/A",
        quantity: basketItem.quantity,
        price: basketItem.price,
        productionStatus: "not_started",
        childName: basketItem.childName || undefined,
        notes: basketItem.notes || undefined
      };
    });

    const basketSum = compiledItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const finalTotal = basketSum + (formState.shippingPaid ? 0 : formState.shippingAmount) - formState.discount;

    const computedChildName = formState.items.map(it => it.childName).filter(Boolean).join(" - ") || formState.childName || undefined;

    const newOrder: Order = {
      id: editingOrder ? editingOrder.id : `ORD-${Date.now().toString().slice(-4)}`,
      customerName: formState.customerName,
      customerPhone: formState.customerPhone,
      customerPhone2: formState.customerPhone2 || undefined,
      childName: computedChildName,
      governorate: formState.governorate,
      address: formState.address,
      items: compiledItems,
      discount: formState.discount,
      shippingAmount: formState.shippingAmount,
      shippingPaid: formState.shippingPaid,
      total: finalTotal,
      status: editingOrder ? editingOrder.status : "new",
      productionStatus: editingOrder ? editingOrder.productionStatus : "not_started",
      isRegisteredShipping: editingOrder ? editingOrder.isRegisteredShipping : false,
      isUrgent: formState.deliveryDuration === "urgent",
      deliveryDuration: formState.deliveryDuration,
      notes: formState.notes,
      source: formState.source,
      screenshot: formState.screenshot,
      creationDate: editingOrder ? editingOrder.creationDate : new Date().toISOString(),
      deadlineDate: editingOrder 
        ? editingOrder.deadlineDate 
        : new Date(Date.now() + 864e5 * (formState.deliveryDuration === "urgent" ? 2 : 5)).toISOString(),
      lastUpdateDate: new Date().toISOString()
    };

    if (editingOrder) {
      setOrders(orders.map(o => o.id === editingOrder.id ? newOrder : o));
    } else {
      setOrders([newOrder, ...orders]);
    }

    setIsFormOpen(false);
    setEditingOrder(null);
    // Reset FormState
    setFormState({
      customerName: "",
      childName: "",
      customerPhone: "",
      customerPhone2: "",
      governorate: "القاهرة",
      address: "",
      items: [],
      shippingAmount: 50,
      discount: 0,
      shippingPaid: false,
      deliveryDuration: "normal",
      source: "فيسبوك",
      notes: "",
      screenshot: undefined
    });
  };

  const handleOpenEdit = (ord: Order) => {
    setEditingOrder(ord);
    
    // Map existing Order items to form items
    const mappedItems = ord.items.map(item => ({
      productId: item.productId,
      variantId: item.variantId || "",
      quantity: item.quantity,
      price: item.price,
      color: item.color || "",
      size: item.size || "",
      childName: item.childName || "",
      notes: item.notes || ""
    }));

    setFormState({
      customerName: ord.customerName,
      childName: ord.childName || "",
      customerPhone: ord.customerPhone,
      customerPhone2: ord.customerPhone2 || "",
      governorate: ord.governorate,
      address: ord.address,
      items: mappedItems,
      shippingAmount: ord.shippingAmount ?? 50,
      discount: ord.discount ?? 0,
      shippingPaid: ord.shippingPaid,
      deliveryDuration: ord.deliveryDuration,
      source: ord.source,
      notes: ord.notes || "",
      screenshot: ord.screenshot
    });

    setIsFormOpen(true);
  };

  const handleStatusChange = (orderId: string, nextStatus: OrderStatus) => {
    setOrders(orders.map(o => {
      if (o.id === orderId) {
        return { ...o, status: nextStatus, lastUpdateDate: new Date().toISOString() };
      }
      return o;
    }));
  };

  const handleDeleteOrder = (id: string) => {
    if (confirm("🚨 هل أنت متأكد من حذف هذا الأوردر من السجلات نهائياً؟")) {
      setOrders(orders.filter(o => o.id !== id));
      if (viewingOrder?.id === id) setViewingOrder(null);
    }
  };

  // Filter urgent orders that are active (not delivered or cancelled)
  const urgentOrders = useMemo(() => {
    return filteredOrders.filter(
      o => (o.isUrgent || o.deliveryDuration === "urgent") &&
           o.status !== "delivered" && o.status !== "cancelled"
    );
  }, [filteredOrders, orders]);

  return (
    <div className="space-y-8 text-right pb-16 animate-in fade-in duration-300" dir="rtl">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
        <div className="space-y-1">
          <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
            <span>إدارة الأوردرات 📦</span>
          </h2>
          <p className="text-slate-400 font-bold text-xs mt-1">
            تتبع التصنيع والشحن والمتابعة
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Tab Selector Pill Button Group */}
          <div className="bg-slate-100 p-1 rounded-2xl flex items-center gap-1">
            <button
              onClick={() => {
                setActiveTab("all");
                setStatusFilter("all");
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === "all"
                  ? "bg-white text-slate-800 shadow-xs border border-slate-200/50"
                  : "text-slate-500 hover:text-slate-800 bg-transparent border-transparent"
              }`}
            >
              <span>جميع الأوردرات 📦</span>
            </button>
            <button
              onClick={() => {
                setActiveTab("returns");
                setStatusFilter("returned");
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer relative ${
                activeTab === "returns"
                  ? "bg-white text-slate-800 shadow-xs border border-slate-200/50"
                  : "text-slate-500 hover:text-slate-800 bg-transparent border-transparent"
              }`}
            >
              <span>إدارة المرتجعات 🔄</span>
              <span className="bg-red-500 text-white text-[9px] font-black w-4.5 h-4.5 rounded-full flex items-center justify-center shrink-0">
                {orders.filter(o => o.status === "returned" || o.status === "returned_partial").length}
              </span>
            </button>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setEditingOrder(null);
                setModalType("smart");
                setIsFormOpen(true);
                setAiInputText("");
              }}
              className="px-4 py-2.5 bg-[#ecfdf5] hover:bg-emerald-100 text-[#047857] hover:text-emerald-800 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer border border-emerald-100/50"
            >
              <Sparkles size={13} className="text-emerald-500 animate-pulse" />
              <span>إضافة ذكية ✨</span>
            </button>
            <button
              onClick={() => {
                setEditingOrder(null);
                setModalType("manual");
                setIsFormOpen(true);
              }}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-blue-100"
            >
              <Plus size={13} />
              <span>إضافة طلب ➕</span>
            </button>
          </div>
        </div>
      </div>

      {activeTab === "all" ? (
        <>
          {/* Advanced Filtering controls */}
          <div className="bg-white p-6 sm:p-8 rounded-[2.2rem] border border-slate-100/80 shadow-premium hover:shadow-premium-hover transition-all duration-300 space-y-5">
            <h3 className="text-xs font-extrabold text-slate-400 block shrink-0 uppercase tracking-wider">🔍 فلترة ذكية لجميع الطلبات</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {/* Search Box */}
              <div className="relative col-span-1 md:col-span-2">
                <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                <input
                  type="text"
                  placeholder="ابحث بالاسم، الموبايل، أو الكود..."
                  className="w-full bg-slate-50 hover:bg-slate-100/30 focus:bg-white border border-slate-100 focus:border-blue-500/30 rounded-xl py-3 pr-10 pl-4 text-xs font-bold focus:ring-4 focus:ring-blue-500/10 transition-all outline-none placeholder:text-slate-400 text-slate-700 text-right"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Status filter */}
              <div>
                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  className="w-full bg-slate-50 hover:bg-slate-100/30 focus:bg-white border border-slate-100 focus:border-blue-500/30 rounded-xl py-3 px-4 text-xs font-bold focus:ring-4 focus:ring-blue-500/10 transition-all outline-none text-slate-700 cursor-pointer text-right"
                >
                  <option value="all">كل حالات الأوردرات</option>
                  {Object.entries(STATUS_DETAILS)
                    .filter(([k]) => k !== "completed")
                    .map(([k, v]) => (
                      <option key={k} value={k}>{v.label}</option>
                    ))}
                </select>
              </div>

              {/* Governorate select */}
              <div>
                <select
                  value={govFilter}
                  onChange={e => setGovFilter(e.target.value)}
                  className="w-full bg-slate-50 hover:bg-slate-100/30 focus:bg-white border border-slate-100 focus:border-blue-500/30 rounded-xl py-3 px-4 text-xs font-bold focus:ring-4 focus:ring-blue-500/10 transition-all outline-none text-slate-700 cursor-pointer text-right"
                >
                  <option value="all">كل المحافظات والأماكن</option>
                  {GOVERNORATES.map(gov => (
                    <option key={gov} value={gov}>{gov}</option>
                  ))}
                </select>
              </div>

              {/* Source filters */}
              <div>
                <select
                  value={sourceFilter}
                  onChange={e => setSourceFilter(e.target.value)}
                  className="w-full bg-slate-50 hover:bg-slate-100/30 focus:bg-white border border-slate-100 focus:border-blue-500/30 rounded-xl py-3 px-4 text-xs font-bold focus:ring-4 focus:ring-blue-500/10 transition-all outline-none text-slate-700 cursor-pointer text-right"
                >
                  <option value="all">كل قنوات البيع</option>
                  {ORDER_SOURCES.map(src => (
                    <option key={src} value={src}>{src}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Date Filter line */}
            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2 text-xs font-bold text-slate-500">
              <div className="flex items-center gap-1.5 grayscale opacity-70 shrink-0">
                <Calendar size={14} />
                <span>نطاق تاريخ قيد الأوردر:</span>
              </div>
              <div className="flex items-center gap-2">
                <span>من</span>
                <input 
                  type="date" 
                  className="bg-slate-50 border-none rounded-lg p-2 text-xs font-bold focus:outline-none"
                  value={dateFilter.start}
                  onChange={e => setDateFilter({ ...dateFilter, start: e.target.value })}
                />
                <span>إلى</span>
                <input 
                  type="date" 
                  className="bg-slate-50 border-none rounded-lg p-2 text-xs font-bold focus:outline-none"
                  value={dateFilter.end}
                  onChange={e => setDateFilter({ ...dateFilter, end: e.target.value })}
                />
                {(dateFilter.start || dateFilter.end) && (
                  <button 
                    onClick={() => setDateFilter({ start: "", end: "" })}
                    className="text-rose-500 hover:underline cursor-pointer mr-2 text-[10px]"
                  >
                    تصفية التاريخ ✕
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Urgent Highlighted Alert Box */}
          {urgentOrders.length > 0 && (
            <div className="bg-rose-50/40 border border-rose-100/80 rounded-3xl p-5 text-right animate-in slide-in-from-top duration-250">
              <h4 className="text-red-600 font-extrabold text-xs flex items-center gap-1.5 mb-3 leading-none">
                <span>⚡ أوردرات مستعجلة ({urgentOrders.length})</span>
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {urgentOrders.map(uo => (
                  <div 
                    key={uo.id} 
                    onClick={() => setViewingOrder(uo)}
                    className="cursor-pointer bg-white border border-red-150/50 hover:bg-rose-50/50 p-4 rounded-2xl flex items-center justify-between shadow-xs hover:shadow-sm transition-all text-right"
                  >
                    <div>
                      <p className="font-extrabold text-slate-800 text-xs">{uo.customerName}</p>
                      <p className="font-mono text-[9.5px] text-slate-400 mt-1">
                        {uo.id} • متبقي {uo.deliveryDuration === "urgent" ? "٣" : "٧"} أيام
                      </p>
                    </div>
                    <span className="text-[10px] font-bold text-red-600 flex items-center gap-0.5 animate-pulse">
                      معاينة ⚡
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Table & Detailed Panel wrapper - modernized to full width */}
          <div className="bg-white rounded-[2rem] border border-slate-150/60 overflow-hidden shadow-sm">
            {/* Header of the table card */}
            <div className="p-6 border-b border-rose-100/30 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50/20 text-right">
              <h3 className="font-extrabold text-slate-800 text-xs sm:text-sm">قائمة الطلبات الجارية بالسيستم 📋</h3>
              <div className="text-slate-400 text-xs font-bold">
                العدد المصفى: <span className="text-slate-800 bg-slate-100 border border-slate-150 px-2.5 py-1 rounded-xl text-[11px] font-black">{filteredOrders.length} أوردر</span>
              </div>
            </div>

            {/* The Full Width Interactive Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-slate-100/50 text-slate-455 font-extrabold border-b border-slate-100">
                    <th className="p-4 text-right">مدة التوصيل</th>
                    <th className="p-4 text-right">التاريخ</th>
                    <th className="p-4 text-right">الاسم</th>
                    <th className="p-4 text-right">رقم التليفون</th>
                    <th className="p-4 text-right">العنوان</th>
                    <th className="p-4 text-right">اسم الطفلة</th>
                    <th className="p-4 text-right">القطع المطلوبة بمقاسها ولونها</th>
                    <th className="p-4 text-right">السعر لوحده</th>
                    <th className="p-4 text-center">حالة الأوردر</th>
                    <th className="p-4 text-center">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-slate-700 font-bold font-sans">
                  {filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="p-16 text-center text-xs font-bold text-slate-400">
                        لا توجد فواتير أوردرات مطابقة للتحديدات حالياً بالدفتر.
                      </td>
                    </tr>
                  ) : (
                    filteredOrders.map(o => {
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
                          onClick={() => setViewingOrder(o)}
                        >
                          {/* 1. Delivery priority / duration detail */}
                          <td className="p-4">
                            {isUrgent && !isCancelled ? (
                              <span className="bg-red-50 text-red-600 px-2 py-1 rounded-lg text-[10px] font-black animate-pulse flex items-center gap-1 w-max">
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
                                {new Date(o.creationDate).toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" })}
                              </span>
                              <span className="text-slate-400 text-[10px] mt-0.5">
                                {new Date(o.creationDate).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: true }).toLowerCase()}
                              </span>
                            </div>
                          </td>

                          {/* 3. Customer Name & Code */}
                          <td className="p-4 font-black text-slate-800 whitespace-nowrap text-xs">
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

                          {/* Order total fee */}
                          <td className="p-4 font-black font-mono text-slate-800 whitespace-nowrap text-xs">
                            {(o.total || 0).toLocaleString()} ج.م
                          </td>

                          {/* Order general status pill dropdown */}
                          <td className="p-4 text-center whitespace-nowrap" onClick={e => e.stopPropagation()}>
                            <select
                              value={o.status}
                              onChange={e => handleStatusChange(o.id, e.target.value as OrderStatus)}
                              className={`text-[10px] font-black border rounded-xl py-1 px-2.5 transition-all outline-none cursor-pointer ${statusMeta.color}`}
                            >
                              {Object.entries(STATUS_DETAILS)
                                .filter(([k]) => k !== "completed")
                                .map(([k, v]) => (
                                  <option key={k} value={k} className="bg-white text-slate-700">{v.label}</option>
                                ))}
                            </select>
                          </td>

                          {/* Action buttons triggers */}
                          <td className="p-4 text-center whitespace-nowrap" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => setViewingOrder(o)}
                                className="px-2 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors flex items-center gap-1 text-[10px] font-black border border-slate-200/50"
                              >
                                <Eye size={11} />
                                <span>معاينة</span>
                              </button>
                              <button
                                onClick={() => handleOpenEdit(o)}
                                className="p-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 border border-blue-100/50 transition-colors"
                                title="تعديل الأوردر"
                              >
                                <Edit2 size={11} />
                              </button>
                              <button
                                onClick={() => handleDeleteOrder(o.id)}
                                className="p-1.5 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-100 border border-rose-100/50 transition-all hover:scale-105"
                                title="حذف نهائياً"
                              >
                                <Trash2 size={11} />
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
        </>
      ) : (
        <>
          {/* Returns Stats Rows - Screenshot 4 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm text-center space-y-2">
              <p className="text-slate-500 font-extrabold text-xs">إجمالي المرتجعات</p>
              <p className="text-4xl font-black text-slate-800">
                {orders.filter(o => o.status === "returned" || o.status === "returned_partial").length}
              </p>
            </div>

            <div className="bg-emerald-50/50 p-6 rounded-[2rem] border border-emerald-100/50 shadow-sm text-center space-y-2">
              <p className="text-[#059669] font-extrabold text-xs">رجع من الشركة</p>
              <p className="text-4xl font-black text-[#059669]">
                {orders.filter(o => o.status === "returned").length}
              </p>
            </div>

            <div className="bg-blue-50/50 p-6 rounded-[2rem] border border-blue-100/50 shadow-sm text-center space-y-2">
              <p className="text-blue-600 font-extrabold text-xs">خرج في أوردر جديد</p>
              <p className="text-4xl font-black text-[#2563eb]">
                {orders.filter(o => o.status === "returned_partial").length}
              </p>
            </div>
          </div>

          {/* Search Box returns */}
          <div className="relative">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="ابحث بالاسم، الموديل، كود أوردر المرتجع..."
              className="w-full bg-white border border-slate-200/60 rounded-2xl py-3.5 pr-11 pl-4 text-xs font-bold text-right outline-none shadow-xs transition-all focus:ring-4 focus:ring-blue-500/10 placeholder:text-slate-400"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Returns Table List */}
          <div className="bg-white rounded-[2rem] border border-slate-150/60 overflow-hidden shadow-sm">
            <div className="p-6 border-b border-rose-100/30 flex justify-between items-center bg-slate-50/20 text-right">
              <h3 className="font-extrabold text-slate-800 text-xs sm:text-sm">سجلات الأوردر المرتجعة للورشة والمندوبين 🔄</h3>
              <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2.5 py-1 rounded-xl">
                {returnedOrders.length} مرتجع مصفى
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-slate-100/50 text-slate-455 font-extrabold border-b border-slate-100">
                    <th className="p-4 text-right">الأوردر والعميل</th>
                    <th className="p-4 text-right">تاريخ الأوردر</th>
                    <th className="p-4 text-right">المنتج والتفاصيل المرتجعة</th>
                    <th className="p-4 text-center">حالة المرتجع</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-slate-700 font-bold font-sans">
                  {returnedOrders.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-16 text-center text-xs font-bold text-slate-400">
                        لا يوجد مرتجعات مسجلة ومطابقة للتتبع الحالي.
                      </td>
                    </tr>
                  ) : (
                    returnedOrders.map(o => (
                      <tr key={o.id} className="hover:bg-slate-50/50 transition-all cursor-pointer" onClick={() => setViewingOrder(o)}>
                        <td className="p-4">
                          <div className="flex flex-col text-right">
                            <span className="font-extrabold text-slate-800 text-xs">{o.customerName}</span>
                            <span className="text-[10px] text-slate-450 font-mono mt-0.5">{o.id} • {o.customerPhone}</span>
                          </div>
                        </td>
                        <td className="p-4 text-slate-600">
                          {new Date(o.creationDate).toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" })}
                        </td>
                        <td className="p-4">
                          <div className="flex flex-col gap-1">
                            {(o.items || []).map((it, idx) => (
                              <div key={idx} className="flex items-center gap-1.5 justify-start text-[11px] text-slate-700">
                                <span className="bg-slate-100 text-slate-650 px-1.5 py-0.5 rounded text-[9px] font-mono shrink-0 font-bold">
                                  {it.quantity}x
                                </span>
                                <span className="truncate max-w-[180px] font-bold">{it.productName || it.name}</span>
                                <span className="text-slate-400 text-[9px] font-semibold">
                                  ({it.size || "عادي"}/{it.color || "عادي"})
                                </span>
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="p-4 text-center" onClick={e => e.stopPropagation()}>
                          <select
                            value={o.status}
                            onChange={e => handleStatusChange(o.id, e.target.value as OrderStatus)}
                            className="text-[11px] font-black border bg-rose-50 border-rose-200 text-rose-700 rounded-xl py-1 px-3 outline-none cursor-pointer"
                          >
                            <option value="returned">مرتجع كلي 🚨</option>
                            <option value="returned_partial">مرتجع جزئي ⚠️</option>
                            <option value="delivered">تم التوصيل ✅</option>
                            <option value="new">جديد ⚡</option>
                          </select>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Detailed Viewing Popup Modal Overlay */}
      {viewingOrder && (() => {
        // Find fresh copy of viewingOrder from orders array (in case it was updated in real-time)
        const currentRef = orders.find(ord => ord.id === viewingOrder.id) || viewingOrder;
        
        // Dynamic helpers to auto-save and stay reactive
        const updateCurrentOrder = (updater: (prev: Order) => Order) => {
          setOrders(orders.map(o => o.id === currentRef.id ? updater(o) : o));
          setViewingOrder(prev => prev && prev.id === currentRef.id ? updater(prev) : prev);
        };

        const handleToggleRegisteredShipping = (isReg: boolean) => {
          updateCurrentOrder(o => ({ ...o, isRegisteredShipping: isReg, lastUpdateDate: new Date().toISOString() }));
        };

        const handleToggleSentConfirmationMessage = (isSent: boolean) => {
          updateCurrentOrder(o => ({ ...o, sentConfirmationMessage: isSent, lastUpdateDate: new Date().toISOString() }));
        };

        const handleViewingOrderStatusChange = (nextStatus: OrderStatus) => {
          updateCurrentOrder(o => ({ ...o, status: nextStatus, lastUpdateDate: new Date().toISOString() }));
        };

        const handleViewingOrderNotesChange = (notes: string) => {
          updateCurrentOrder(o => ({ ...o, notes: notes, lastUpdateDate: new Date().toISOString() }));
        };

        const handleItemProductionStatusChange = (itemIdx: number, status: OrderItem["productionStatus"]) => {
          updateCurrentOrder(o => {
            const updatedItems = [...o.items];
            updatedItems[itemIdx] = { ...updatedItems[itemIdx], productionStatus: status };
            return { ...o, items: updatedItems, lastUpdateDate: new Date().toISOString() };
          });
        };

        const handleToggleItemReturn = (itemIdx: number) => {
          updateCurrentOrder(o => {
            const updatedItems = [...o.items];
            updatedItems[itemIdx] = { ...updatedItems[itemIdx], isReturned: !updatedItems[itemIdx].isReturned };
            return { ...o, items: updatedItems, lastUpdateDate: new Date().toISOString() };
          });
        };

        const totalItemsPrice = (currentRef.items || []).reduce((acc, it) => acc + ((it.quantity || 0) * (it.price || 0)), 0);

        return (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-250" dir="rtl">
            <div className="bg-white w-full max-w-xl rounded-3xl sm:rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col max-h-[95vh] sm:max-h-[92vh] border border-slate-100">
              
              {/* Header */}
              <div className="p-5 sm:p-6 pb-3 sm:pb-4 border-b border-slate-100 flex items-center justify-between bg-white text-right shrink-0">
                <button
                  onClick={() => setViewingOrder(null)}
                  className="w-10 h-10 rounded-full hover:bg-slate-100 flex items-center justify-center bg-slate-50 text-slate-450 font-bold transition-all cursor-pointer"
                >
                  ✕
                </button>
                <div className="flex items-center gap-2 sm:gap-3">
                  <h3 className="text-lg sm:text-xl font-black text-slate-800 font-sans">تفاصيل الأوردر</h3>
                  <span className="font-mono text-xs sm:text-sm font-black text-slate-700 bg-slate-100 px-3.5 py-1.5 rounded-2xl shrink-0">
                    {currentRef.id}
                  </span>
                </div>
              </div>

              {/* Modal Body with detailed card contents */}
              <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 overflow-y-auto overflow-x-hidden max-h-[70vh] text-right font-sans">
                
                {/* 1. Core coordinates / Customer Details Panel */}
                <div className="bg-slate-50/50 p-4 sm:p-6 rounded-[2rem] border border-slate-150/40 relative space-y-4">
                  {/* Edit button and details row */}
                  <div className="flex flex-col-reverse sm:flex-row justify-between items-stretch sm:items-start gap-3">
                    <button
                      onClick={() => {
                        const targetOrd = currentRef;
                        setViewingOrder(null);
                        handleOpenEdit(targetOrd);
                      }}
                      className="text-xs font-black text-blue-600 bg-white border border-blue-200 hover:bg-blue-50 px-3.5 py-2.5 rounded-xl transition-all cursor-pointer shadow-xs text-center w-full sm:w-auto shrink-0"
                    >
                      تعديل البيانات
                    </button>

                    <div className="space-y-2 text-right flex-1 min-w-0">
                      <div className="flex items-center gap-2 justify-end flex-wrap">
                        {currentRef.source && (
                          <span className="bg-blue-50 text-blue-600 px-2.5 py-0.5 rounded-xl text-[10px] font-black leading-none font-sans shrink-0">
                            {currentRef.source}
                          </span>
                        )}
                        <h4 className="text-lg sm:text-xl font-black text-slate-900 leading-tight w-full sm:w-auto break-words">{currentRef.customerName}</h4>
                      </div>
                      
                      {/* Phone Numbers row */}
                      <div className="flex flex-wrap gap-3 items-center justify-end text-xs font-bold text-slate-500 font-mono pt-1">
                        {currentRef.customerPhone2 && (
                          <span className="flex items-center gap-1.5 justify-end">
                            <span>{currentRef.customerPhone2}</span>
                            <Phone size={11} className="text-slate-400" />
                          </span>
                        )}
                        <span className="flex items-center gap-1.5 justify-end">
                          <span>{currentRef.customerPhone}</span>
                          <Phone size={11} className="text-slate-400" />
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Address Section */}
                  <div className="flex items-start gap-3 justify-end pt-3 border-t border-slate-150/40 mt-2">
                    <div className="text-right flex-1 min-w-0">
                      <span className="text-[10px] font-black text-slate-400 block uppercase">المحافظة: {currentRef.governorate}</span>
                      <span className="text-xs font-black text-slate-600 block mt-0.5 leading-relaxed break-words">
                        {currentRef.address || "غير مدخل تفصيلياً بعد."}
                      </span>
                    </div>
                    <div className="bg-blue-50 text-blue-600 p-2.5 rounded-xl h-10 w-10 flex items-center justify-center shrink-0 mt-0.5">
                      <MapPin size={18} />
                    </div>
                  </div>
                </div>

                {/* 2 & 3. Twin Toggles Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Courier / Shipping registration toggle ("التسجيل في شركة الشحن") */}
                  <div className="space-y-2 text-right bg-slate-50/40 p-4 rounded-3xl border border-slate-200/35">
                    <span className="text-xs font-black text-slate-500 block">التسجيل في شركة الشحن</span>
                    <div className="flex gap-2 bg-white p-1 rounded-xl border border-slate-100 shadow-2xs">
                      <button
                        type="button"
                        onClick={() => handleToggleRegisteredShipping(true)}
                        className={`flex-1 py-2 px-3 rounded-lg transition-all font-black text-xs flex items-center justify-center gap-1.5 cursor-pointer ${
                          currentRef.isRegisteredShipping
                            ? "bg-blue-600 text-white shadow-xs"
                            : "text-slate-400 hover:text-slate-600 bg-transparent"
                        }`}
                      >
                        نعم
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleRegisteredShipping(false)}
                        className={`flex-1 py-2 px-3 rounded-lg transition-all font-black text-xs flex items-center justify-center gap-1.5 cursor-pointer ${
                          !currentRef.isRegisteredShipping
                            ? "bg-slate-200 text-slate-700 shadow-xs"
                            : "text-slate-400 hover:text-slate-600 bg-transparent"
                        }`}
                      >
                        لا
                      </button>
                    </div>
                  </div>

                  {/* Send confirmation toggle ("ارسال رسالة التأكيد") */}
                  <div className="space-y-2 text-right bg-slate-50/40 p-4 rounded-3xl border border-slate-200/35">
                    <span className="text-xs font-black text-slate-500 block">ارسال رسالة التأكيد</span>
                    <div className="flex gap-2 bg-white p-1 rounded-xl border border-slate-100 shadow-2xs">
                      <button
                        type="button"
                        onClick={() => handleToggleSentConfirmationMessage(true)}
                        className={`flex-1 py-2 px-3 rounded-lg transition-all font-black text-xs flex items-center justify-center gap-1.5 cursor-pointer ${
                          currentRef.sentConfirmationMessage
                            ? "bg-blue-600 text-white shadow-xs"
                            : "text-slate-400 hover:text-slate-600 bg-transparent"
                        }`}
                      >
                        نعم
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleSentConfirmationMessage(false)}
                        className={`flex-1 py-2 px-3 rounded-lg transition-all font-black text-xs flex items-center justify-center gap-1.5 cursor-pointer ${
                          !currentRef.sentConfirmationMessage
                            ? "bg-slate-200 text-slate-700 shadow-xs"
                            : "text-slate-400 hover:text-slate-600 bg-transparent"
                        }`}
                      >
                        لا
                      </button>
                    </div>
                  </div>
                </div>

                {/* 4. Order status selection ("حالة الأوردر الحالية") */}
                <div className="space-y-2 text-right bg-[#f5fbf7] p-4 rounded-3xl border border-emerald-100/70">
                  <span className="text-xs font-black text-emerald-800 block">حالة الأوردر الحالية</span>
                  <div className="relative">
                    <select
                      value={currentRef.status}
                      onChange={e => handleViewingOrderStatusChange(e.target.value as OrderStatus)}
                      className="w-full bg-white hover:bg-emerald-50/40 border-2 border-emerald-500 text-emerald-900 focus:bg-white rounded-2xl py-3.5 px-5 text-sm font-black text-right outline-none cursor-pointer transition-all appearance-none shadow-xs"
                    >
                      {Object.entries(STATUS_DETAILS)
                        .filter(([k]) => k !== "completed")
                        .map(([k, v]) => (
                          <option key={k} value={k}>{v.label}</option>
                        ))}
                    </select>
                    <div className="absolute left-5 top-1/2 -translate-y-1/2 pointer-events-none text-emerald-600 font-bold text-xs">
                      ▼
                    </div>
                  </div>
                  <div className="text-[10px] font-bold text-slate-400 text-center pt-1 font-mono">
                    آخر تحديث: {new Date(currentRef.lastUpdateDate || currentRef.creationDate).toLocaleString("ar-EG")}
                  </div>
                </div>

                {/* 5. Follow up notes ("ملاحظات المتابعة (مندوب / عميلة)") */}
                <div className="space-y-2 text-right">
                  <span className="text-xs font-black text-slate-505 block">ملاحظات المتابعة (مندوب / عميلة)</span>
                  <textarea
                    value={currentRef.notes || ""}
                    onChange={e => handleViewingOrderNotesChange(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-150 focus:border-blue-550 rounded-2xl p-4 text-xs font-bold font-sans text-slate-755 min-h-[90px] text-right outline-none transition-all placeholder:text-slate-400 leading-relaxed"
                    placeholder="مثال: المندوب لم يرد، العميل طلب التأجيل، سيتم التسليم غداً..."
                  />
                </div>

                {/* 6. Ordered Items / Contents ("محتويات الأوردر") */}
                <div className="space-y-3">
                  <h4 className="text-xs font-black text-slate-400 block uppercase">محتويات الأوردر</h4>
                  <div className="space-y-3.5">
                    {(currentRef.items || []).map((item, idx) => (
                      <div key={idx} className="bg-white border border-slate-150/70 p-4 sm:p-5 rounded-3xl text-right flex flex-col gap-4 shadow-sm relative">
                        
                        {/* Header of Item block: Title on right, Qty/Price on left */}
                        <div className="flex flex-col-reverse sm:flex-row justify-between items-stretch sm:items-start gap-3">
                          {/* Qty & Price Left block */}
                          <div className="text-right sm:text-left shrink-0 flex sm:flex-col justify-between items-center sm:items-start pt-2 sm:pt-0 border-t sm:border-t-0 border-dashed border-slate-100">
                            <span className="text-[11px] font-bold text-slate-400 block font-mono">
                              {item.quantity} × {item.price} ج
                            </span>
                            <span className="text-blue-600 font-black text-base block font-mono">
                              {((item.quantity || 0) * (item.price || 0)).toLocaleString()} ج.م
                            </span>
                          </div>

                          {/* Item details right block */}
                          <div className="text-right space-y-1.5 flex-1 min-w-0">
                            <h5 className="font-black text-slate-900 text-sm sm:text-base leading-snug break-words">{item.productName || item.name}</h5>
                            <span className="text-[10px] sm:text-xs text-slate-400 block font-medium font-sans">
                              كود: <span className="font-mono text-slate-600">{item.productCode}</span> 
                              {item.color && <> • لون: <span className="text-slate-800 font-extrabold">{item.color}</span></>} 
                              {item.size && <> • مقاس: <span className="text-slate-800 font-extrabold">{item.size}</span></>}
                            </span>
                            {item.childName && (
                              <div className="text-[10px] sm:text-xs text-blue-600 font-extrabold block leading-none pt-0.5">
                                👶 اسم البنوتة: <span className="bg-blue-50/60 px-2 py-0.5 rounded-lg inline-block mt-1">{item.childName}</span>
                              </div>
                            )}
                            {item.notes && (
                              <div className="text-[10px] sm:text-xs text-rose-500 font-extrabold block leading-none pt-0.5">
                                📌 تعديل العميل: <span className="bg-rose-50/60 px-2 py-1 rounded-lg inline-block mt-1 text-right leading-normal break-words">{item.notes}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Interactive Item Control: Return Toggle & Production Status Dropdown (Responsive Grid) */}
                        <div className="pt-3 border-t border-slate-100 grid grid-cols-2 gap-3.5">
                          {/* Return Toggle Block */}
                          <div className="flex flex-col gap-1 text-right">
                            <span className="text-slate-405 font-black text-[10px]">مرتجع مخصص؟</span>
                            <button
                              type="button"
                              onClick={() => handleToggleItemReturn(idx)}
                              className={`w-full py-2.5 px-3 rounded-xl border text-[11px] font-black cursor-pointer flex items-center justify-center gap-1.5 transition-all outline-none ${
                                item.isReturned
                                  ? "bg-rose-55 hover:bg-rose-100/80 border-rose-200 text-rose-700"
                                  : "bg-blue-50/40 border-blue-105 text-blue-600 hover:bg-blue-50"
                              }`}
                            >
                              <span>{item.isReturned ? "مرتجع ↩️" : "تحديد كمرتجع 🔄"}</span>
                            </button>
                          </div>

                          {/* Production Stage Block */}
                          <div className="flex flex-col gap-1 text-right">
                            <span className="text-slate-405 font-black text-[10px]">مرحلة التصنيع</span>
                            <select
                              value={item.productionStatus || "not_started"}
                              onChange={e => handleItemProductionStatusChange(idx, e.target.value as OrderItem["productionStatus"])}
                              className={`w-full text-[11px] font-black border rounded-xl py-2 px-2.5 outline-none cursor-pointer text-right transition-all h-[38px] ${
                                item.productionStatus === "completed"
                                  ? "bg-[#ecfdf5] border-emerald-200 text-emerald-700"
                                  : item.productionStatus === "in_production"
                                  ? "bg-amber-50 border-amber-200 text-amber-700"
                                  : item.productionStatus === "cancelled"
                                  ? "bg-rose-50 border-rose-200 text-rose-700"
                                  : "bg-slate-50 border-slate-200 text-slate-650"
                              }`}
                            >
                              <option value="not_started">لم يبدأ بعد 🛑</option>
                              <option value="completed">تم التصنيع ✅</option>
                              <option value="cancelled">ملغي ❌</option>
                            </select>
                          </div>
                        </div>

                      </div>
                    ))}
                  </div>
                </div>

                {/* 7. Summary Numbers & Bill details */}
                <div className="border border-slate-150 p-4 sm:p-6 rounded-3xl space-y-4 bg-slate-50/35">
                  <div className="flex justify-between items-center text-xs font-bold text-slate-505">
                    <span>إجمالي المنتجات</span>
                    <span className="font-mono text-slate-700">{totalItemsPrice.toLocaleString()} ج.م</span>
                  </div>
                  
                  {currentRef.discount && currentRef.discount > 0 ? (
                    <div className="flex justify-between items-center text-xs font-bold text-rose-500">
                      <span>خصم مالي خاص:</span>
                      <span className="font-mono">-{currentRef.discount} ج.م</span>
                    </div>
                  ) : null}

                  <div className="flex justify-between items-center text-xs font-bold text-slate-505">
                    <span>مصاريف الشحن (تحصيل)</span>
                    <span className="font-mono text-slate-750">
                      {currentRef.shippingPaid ? "0 (مدفوع سلفاً)" : `${currentRef.shippingAmount} ج.م`}
                    </span>
                  </div>

                  <div className="pt-4 border-t border-slate-150 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 text-right">
                    {/* Notes detail right aligned */}
                    <div className="text-right space-y-1 sm:max-w-[240px]">
                      <span className="text-[10px] font-black text-slate-400 block">ملاحظات</span>
                      <span className="text-xs font-bold italic text-slate-600 block leading-relaxed break-words">
                        {currentRef.notes || "الرجاء الاتصال قبل الوصول"}
                      </span>
                    </div>

                    {/* Highly polished currency presentation */}
                    <div className="bg-emerald-50/40 p-4 rounded-2xl flex flex-row sm:flex-col justify-between items-center sm:items-end text-right sm:text-left shrink-0 gap-2">
                      <span className="text-[10px] font-black text-emerald-800 uppercase block">المبلغ المطلوب تحصيله</span>
                      <div className="flex items-baseline gap-1 font-sans">
                        <span className="text-2xl sm:text-3xl font-black text-emerald-950 font-mono">{(currentRef.total || 0).toLocaleString()}</span>
                        <span className="text-xs font-black text-emerald-700">ج.م</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Screenshot view if uploaded */}
                {currentRef.screenshot && (
                  <div className="space-y-1.5 pt-1.5 border-t border-slate-100">
                    <span className="text-[9px] font-black text-slate-400 block uppercase text-right">لقطة شاشة المحادثة المرفقة (Screenshot):</span>
                    <a href={currentRef.screenshot} target="_blank" rel="noreferrer" className="block border border-slate-150 rounded-2xl overflow-hidden hover:opacity-95 max-h-[160px] shadow-sm bg-slate-50">
                      <img src={currentRef.screenshot} alt="Screenshot preview" className="w-full object-cover max-h-[160px]" referrerPolicy="no-referrer" />
                    </a>
                  </div>
                )}

              </div>

              {/* Custom Modal Footer actions */}
              <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3 shrink-0">
                <button
                  onClick={() => setViewingOrder(null)}
                  className="flex-1 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold rounded-2xl text-xs sm:text-sm text-center transition-all cursor-pointer active:scale-95"
                >
                  إغلاق
                </button>
                <button
                  onClick={() => handleDeleteOrder(currentRef.id)}
                  className="py-3.5 px-4 sm:px-6 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 font-extrabold rounded-2xl text-xs sm:text-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                >
                  <span>حذف الأوردر</span>
                  <span>🗑️</span>
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Main Creation/Edit Order Form Popup */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          {modalType === "smart" ? (
            /* AI Smart Order Add Modal (Screenshot 0) */
            <div className="bg-white w-full max-w-2xl rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200 text-right">
              {/* Header */}
              <div className="p-8 pb-4 flex justify-between items-start gap-4">
                <button 
                  onClick={() => { setIsFormOpen(false); setEditingOrder(null); setAiInputText(""); }}
                  className="w-10 h-10 rounded-full hover:bg-slate-100 flex items-center justify-center bg-slate-50 text-slate-400 font-bold transition-all"
                >
                  ✕
                </button>
                <div className="flex items-center gap-4">
                  <div>
                    <h3 className="text-xl font-black text-slate-800">إضافة أوردر بالذكاء الاصطناعي</h3>
                    <p className="text-slate-400 font-bold text-xs mt-1 font-sans">الصق نص رسالة التأكيد وارفع صورة الأوردر إن وجدت</p>
                  </div>
                  <div className="bg-emerald-50 text-emerald-500 p-2.5 rounded-2xl h-12 w-12 flex items-center justify-center border border-emerald-100/50">
                    <Sparkles size={20} className="animate-pulse" />
                  </div>
                </div>
              </div>

              {/* Body */}
              <div className="p-8 pt-2 space-y-6 overflow-y-auto max-h-[68vh]">
                {/* 1. Chat input text area */}
                <div className="space-y-2">
                  <label className="text-xs font-extrabold text-slate-800 block">نص الأوردر (أمانة، فيسبوك، واتس اب..)</label>
                  <textarea
                    className="w-full bg-[#f8fafc] focus:bg-white border border-slate-100 focus:border-emerald-500/30 focus:ring-4 focus:ring-emerald-500/5 rounded-2xl p-4 text-xs font-bold min-h-[140px] text-right outline-none leading-relaxed transition-all placeholder:text-slate-400"
                    placeholder="مثال: أوردر لـ أحمد علي من القاهرة، مدينة نصر، بكرة ضروري، عايز تيشيرت ابيض لارج و بنطلون ازرق، 0123456789"
                    value={aiInputText}
                    onChange={e => setAiInputText(e.target.value)}
                  />
                </div>

                {/* Separator - إرفاق صورة */}
                <div className="relative py-2">
                  <div className="absolute inset-0 flex items-center" aria-hidden="true">
                    <div className="w-full border-t border-slate-100"></div>
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="bg-white px-4 text-[11px] font-black text-slate-400">إرفاق صورة تأكيد الأوردر (اختياري)</span>
                  </div>
                </div>

                {/* 2. Drag & Drop photo area — save only, no AI extraction */}
                <div 
                  onDragEnter={handleContainerDrag}
                  onDragOver={handleContainerDrag}
                  onDragLeave={handleContainerDrag}
                  onDrop={handleDropScreenshot}
                  className="border-2 border-dashed border-slate-200 hover:border-blue-400/40 rounded-[1.8rem] flex flex-col items-center justify-center p-8 text-center transition-all bg-slate-50/30 hover:bg-white relative cursor-pointer group min-h-[140px]"
                >
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  
                  {formState.screenshot ? (
                    <div className="space-y-3 w-full">
                      <img src={formState.screenshot} alt="Preview" className="mx-auto max-h-[160px] rounded-xl object-contain shadow-xs border border-slate-100" />
                      <p className="text-blue-500 font-extrabold text-xs">تم إرفاق صورة الأوردر بنجاح! 📸 (للحفظ فقط)</p>
                      <button 
                        type="button" 
                        onClick={(e) => { e.stopPropagation(); setFormState({...formState, screenshot: undefined}); }}
                        className="text-xs font-bold text-rose-500 hover:underline z-20 relative"
                      >
                        حذف الصورة ✕
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="bg-slate-100/80 group-hover:bg-blue-50 text-slate-400 group-hover:text-blue-400 p-3.5 rounded-2xl transition-colors">
                        <Upload size={24} className="mx-auto" />
                      </div>
                      <span className="text-slate-600 font-extrabold text-xs block mt-4 select-none">اسحب الصورة هنا أو اضغط للاختيار</span>
                      <span className="text-slate-400 font-semibold text-[10px] block mt-1.5 select-none font-sans">الصورة هتتحفظ مع الأوردر — الذكاء الاصطناعي بيقرأ النص بس</span>
                    </>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3">
                <button
                  type="button"
                  onClick={() => { setIsFormOpen(false); setEditingOrder(null); setAiInputText(""); }}
                  className="w-1/3 bg-white hover:bg-slate-100 hover:text-slate-800 text-slate-500 font-black py-3.5 rounded-2xl border border-slate-200 transition-all cursor-pointer text-xs"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  disabled={!aiInputText.trim()}
                  onClick={() => { handleLocally(); }}
                  className={`w-2/3 py-3.5 rounded-2xl text-xs font-black transition-all flex items-center justify-center gap-2 ${
                    !aiInputText.trim()
                      ? "bg-[#cbd5e1] text-white cursor-not-allowed"
                      : "bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-100 cursor-pointer"
                  }`}
                >
                  <Sparkles size={14} />
                  <span>استخراج البيانات من النص</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white w-full max-w-2xl sm:max-w-3xl rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col max-h-[92vh] border border-slate-100">
              {/* Header */}
              <div className="p-6 bg-white border-b border-slate-100 flex justify-between items-center text-right">
                <button 
                  type="button"
                  onClick={() => { setIsFormOpen(false); setEditingOrder(null); }}
                  className="w-10 h-10 rounded-full hover:bg-slate-100 flex items-center justify-center bg-slate-50 text-slate-400 font-bold transition-all border border-transparent hover:border-slate-150"
                >
                  ✕
                </button>
                <h3 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
                  <span>إضافة أوردر يدوياً</span>
                </h3>
              </div>

            {/* Modal Form Body */}
            <form onSubmit={handleSaveOrder} className="p-6 space-y-6 overflow-y-auto max-h-[75vh]">
              {/* Row 1: Customer Name */}
              <div className="space-y-1.5 text-right">
                <label className="text-xs font-black text-slate-500 block flex items-center gap-1 justify-start">
                  <span>اسم العميل</span>
                  <span>👤</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: ياسمين أحمد"
                  className="w-full bg-[#f8fafc] border border-slate-100 focus:border-blue-500 focus:bg-white rounded-2xl py-3.5 px-4 text-xs font-bold text-right outline-none transition-all placeholder:text-slate-400 text-slate-700"
                  value={formState.customerName}
                  onChange={e => setFormState({ ...formState, customerName: e.target.value })}
                />
              </div>

              {/* Row 2: Source selection as horizontal pills */}
              <div className="space-y-2 text-right">
                <label className="text-xs font-bold text-slate-500 block flex items-center gap-1 justify-start">
                  <span>مصدر الأوردر</span>
                  <span>🗂️</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: "فيسبوك", value: "فيسبوك" },
                    { label: "انستجرام", value: "إنستغرام" },
                    { label: "واتس اب", value: "واتساب" },
                    { label: "ويب سايت", value: "الموقع الإلكتروني" }
                  ].map(src => (
                    <button
                      key={src.value}
                      type="button"
                      onClick={() => setFormState({ ...formState, source: src.value })}
                      className={`py-3 px-4 rounded-2xl text-xs font-bold text-center border-2 transition-all cursor-pointer ${
                        formState.source === src.value
                          ? "border-blue-600 bg-blue-50/40 text-blue-700 font-extrabold"
                          : "border-slate-100 bg-slate-50/50 text-slate-500 hover:bg-slate-100"
                      }`}
                    >
                      {src.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Row 3: Primary Phone & Second Phone */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5 text-right">
                  <label className="text-xs font-bold text-slate-500 block flex items-center gap-1 justify-start">
                    <span>رقم التليفون الأساسي</span>
                    <span>📞</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="01xxxxxxxxx"
                    className="w-full bg-[#f8fafc] border border-slate-100 focus:border-blue-500 focus:bg-white rounded-2xl py-3.5 px-4 text-xs font-mono font-bold text-right outline-none transition-all placeholder:text-slate-400 text-slate-700"
                    value={formState.customerPhone}
                    onChange={e => setFormState({ ...formState, customerPhone: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5 text-right">
                  <label className="text-xs font-bold text-slate-500 block flex items-center gap-1 justify-start">
                    <span>رقم التليفون الثاني</span>
                    <span>☎️</span>
                  </label>
                  <input
                    type="text"
                    placeholder="01xxxxxxxxx"
                    className="w-full bg-[#f8fafc] border border-slate-100 focus:border-blue-500 focus:bg-white rounded-2xl py-3.5 px-4 text-xs font-mono font-bold text-right outline-none transition-all placeholder:text-slate-400 text-slate-700"
                    value={formState.customerPhone2}
                    onChange={e => setFormState({ ...formState, customerPhone2: e.target.value })}
                  />
                </div>
              </div>

              {/* Row 4: Governorate & Detailed Address */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5 text-right">
                  <label className="text-xs font-bold text-slate-500 block flex items-center gap-1 justify-start">
                    <span>المحافظة</span>
                    <span>🗺️</span>
                  </label>
                  <select
                    required
                    value={formState.governorate}
                    onChange={e => {
                      const selectedGov = e.target.value;
                      const deltaCities = ["الدقهلية", "الغربية", "المنوفية", "الشرقية", "البحيرة", "كفر الشيخ"];
                      const upperEgypt = ["أسيوط", "سوهاج", "قنا", "الأقصر", "أسوان", "المنيا", "بني سويف"];
                      let rate = 50;
                      if (selectedGov === "القاهرة" || selectedGov === "الجيزة") rate = 45;
                      else if (deltaCities.includes(selectedGov)) rate = 55;
                      else if (upperEgypt.includes(selectedGov)) rate = 65;
                      else if (selectedGov === "الإسكندرية") rate = 50;

                      setFormState({ ...formState, governorate: selectedGov, shippingAmount: rate });
                    }}
                    className="w-full bg-[#f8fafc] border border-slate-100 focus:border-blue-500 focus:bg-white rounded-2xl py-3.5 px-4 text-xs font-bold text-right outline-none transition-all text-slate-800"
                  >
                    {GOVERNORATES.map(gov => (
                      <option key={gov} value={gov}>{gov}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5 text-right">
                  <label className="text-xs font-bold text-slate-500 block flex items-center gap-1 justify-start">
                    <span>العنوان بالتفصيل</span>
                    <span>🏠</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="الشارع، الدور، مبنى، علامة مميزة..."
                    className="w-full bg-[#f8fafc] border border-slate-100 focus:border-blue-500 focus:bg-white rounded-2xl py-3.5 px-4 text-xs font-bold text-right outline-none transition-all placeholder:text-slate-400 text-slate-700"
                    value={formState.address}
                    onChange={e => setFormState({ ...formState, address: e.target.value })}
                  />
                </div>
              </div>

              {/* Order Item Details Panel */}
              <div className="p-6 bg-slate-50/50 rounded-[2rem] border border-slate-150/40 space-y-5 text-right">
                <div className="flex flex-col-reverse sm:flex-row justify-between items-stretch sm:items-center gap-4 bg-white p-4 sm:px-5 sm:py-4 rounded-xl sm:rounded-2xl border border-slate-100">
                  <button
                    type="button"
                    onClick={handleAddFormItem}
                    className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-black px-5 py-3 rounded-2xl text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all shadow-md shadow-blue-100 active:scale-95 cursor-pointer shrink-0"
                  >
                    <span>+ إضافة قطعة للأوردر</span>
                  </button>
                  <h4 className="text-sm font-black text-slate-800 flex items-center justify-center sm:justify-start gap-1.5 font-sans shrink-0 text-center sm:text-right">
                    <span>تفاصيل قطع الأوردر</span>
                    <span>👕</span>
                  </h4>
                </div>

                <div className="space-y-5">
                  {formState.items.length === 0 ? (
                    <div className="text-center py-10 px-4 bg-white rounded-3xl border-2 border-dashed border-slate-150 flex flex-col items-center justify-center">
                      <span className="text-slate-650 font-black text-sm block">لا توجد قطع مضافة بعد!</span>
                      <span className="text-slate-410 font-bold text-xs mt-1 block max-w-sm leading-relaxed">يرجى الضغط على زر "+ إضافة قطعة للأوردر" وتحديد مواصفاتها من السيستم بالكامل.</span>
                    </div>
                  ) : (
                    formState.items.map((item, idx) => {
                      const sProd = products.find(p => p.id === item.productId);
                      const selectedVariants = sProd?.variants || [];
                      const availableColors = Array.from(
                        new Set(selectedVariants.map(v => v.color).filter((color): color is string => Boolean(color)))
                      );
                      const availableSizes = Array.from(new Set(
                        selectedVariants
                          .filter(v => !item.color || v.color === item.color)
                          .map(v => v.size)
                          .filter((size): size is string => Boolean(size))
                      ));
                      return (
                        <div key={idx} className="bg-white p-6 rounded-3xl border border-slate-150/60 relative space-y-4 text-right shadow-sm group">
                          {/* Remove button at top-left corner */}
                          <button
                            type="button"
                            onClick={() => handleRemoveFormItem(idx)}
                            className="absolute top-6 left-6 w-9 h-9 bg-rose-50 hover:bg-rose-100 text-rose-500 rounded-full flex items-center justify-center border border-rose-100/50 transition-all cursor-pointer"
                            title="حذف القطعة"
                          >
                            ✕
                          </button>

                          {/* Row 1: Product dropdown */}
                          <div className="space-y-1.5">
                            <label className="text-[11px] font-black text-slate-400 block font-sans">🔍 اختر المنتج من السيستم</label>
                            <select
                              required
                              value={item.productId}
                              onChange={e => handleFormItemChange(idx, "productId", e.target.value)}
                              className="w-full bg-[#f8fafc] border border-slate-100 rounded-2xl p-3.5 text-xs sm:text-sm font-bold outline-none transition-all"
                            >
                              <option value="">-- اختر من المنتجات المسجلة --</option>
                              {products.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                              ))}
                            </select>
                          </div>

                          {/* Row 2: Color, Size, Qty, Price */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-1">
                            {/* Color Select */}
                            <div className="space-y-1 text-right">
                              <label className="text-[10px] font-black text-slate-400 block">اللون 🎨</label>
                              <select
                                required
                                value={item.color || ""}
                                onChange={e => handleFormItemChange(idx, "color", e.target.value)}
                                disabled={!item.productId}
                                className="w-full bg-slate-50 focus:bg-white border border-slate-100 focus:border-blue-500 rounded-xl p-3 text-xs sm:text-sm font-bold text-right outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <option value="">{item.productId ? "-- اختر اللون --" : "اختر المنتج أولاً"}</option>
                                {availableColors.map(color => (
                                  <option key={color} value={color}>{color}</option>
                                ))}
                              </select>
                            </div>

                            {/* Size Select */}
                            <div className="space-y-1 text-right">
                              <label className="text-[10px] font-black text-slate-400 block">المقاس 📐</label>
                              <select
                                required
                                value={item.size || ""}
                                onChange={e => handleFormItemChange(idx, "size", e.target.value)}
                                disabled={!item.productId || !item.color}
                                className="w-full bg-slate-50 focus:bg-white border border-slate-100 focus:border-blue-500 rounded-xl p-3 text-xs sm:text-sm font-bold text-right outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <option value="">{!item.productId ? "اختر المنتج أولاً" : !item.color ? "اختر اللون أولاً" : "-- اختر المقاس --"}</option>
                                {availableSizes.map(size => (
                                  <option key={size} value={size}>{size}</option>
                                ))}
                              </select>
                            </div>

                            {/* Quantity Input */}
                            <div className="space-y-1 text-right">
                              <label className="text-[10px] font-black text-slate-400 block">الكمية 🔢</label>
                              <input
                                type="number"
                                min="1"
                                required
                                value={item.quantity}
                                onChange={e => handleFormItemChange(idx, "quantity", parseInt(e.target.value) || 1)}
                                className="w-full bg-slate-50 focus:bg-white border border-slate-100 focus:border-blue-500 rounded-xl p-3 text-center text-xs font-black font-mono outline-none transition-all"
                              />
                            </div>

                            {/* Price Input */}
                            <div className="space-y-1 text-right">
                              <label className="text-[10px] font-black text-slate-400 block">السعر للقطعة 💰</label>
                              <input
                                type="number"
                                required
                                value={item.price || ""}
                                onChange={e => handleFormItemChange(idx, "price", parseFloat(e.target.value) || 0)}
                                className="w-full bg-slate-50 focus:bg-white border border-slate-100 focus:border-blue-500 rounded-xl p-3 text-center text-xs font-black font-mono outline-none transition-all"
                              />
                            </div>
                          </div>

                          {/* Row 3: Child Name & Notes Details Field */}
                          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-1">
                            {/* Child's Name */}
                            <div className="md:col-span-4 space-y-1">
                              <label className="text-[10px] font-black text-blue-500 block">👶 اسم البنوتة / الطفل</label>
                              <input
                                type="text"
                                placeholder="مثال: جوري / فهد"
                                value={item.childName || ""}
                                onChange={e => handleFormItemChange(idx, "childName", e.target.value)}
                                className="w-full bg-slate-50 focus:bg-white border-2 border-slate-100 focus:border-blue-500 rounded-xl p-3 text-xs sm:text-sm font-black text-right outline-none transition-all"
                              />
                            </div>

                            {/* Special notes or modifications */}
                            <div className="md:col-span-8 space-y-1">
                              <label className="text-[10px] font-black text-slate-400 block">📝 الملاحظات أو تعديلات العميل لهذه القطعة</label>
                              <input
                                type="text"
                                placeholder="تطريز الاسم 'فهد' بلون برونزي، تقصير 3 سم..."
                                value={item.notes || ""}
                                onChange={e => handleFormItemChange(idx, "notes", e.target.value)}
                                className="w-full bg-slate-50 focus:bg-white border border-slate-200 focus:border-blue-500 rounded-xl p-3 text-xs sm:text-sm font-bold text-right outline-none transition-all text-slate-755 placeholder:text-slate-350"
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Delivery details & shipping inputs */}
              <div className="p-5 bg-slate-50/50 rounded-[2rem] border border-slate-100 space-y-4 text-right">
                <h4 className="text-xs font-extrabold text-slate-700 flex items-center gap-1 justify-start">
                  <span>تفاصيل التوصيل ومصاريف الشحن</span>
                  <span>🚚</span>
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                  {/* Shipping Amount */}
                  <div className="space-y-1.5 text-right">
                    <label className="text-[11px] font-bold text-slate-500 block">مصاريف الشحن (ج.م) 📬</label>
                    <input
                      type="number"
                      className="w-full bg-white border border-[#f1f5f9] focus:border-blue-500 focus:bg-white rounded-2xl py-3 px-4 text-xs font-mono font-black text-right outline-none"
                      value={formState.shippingAmount}
                      onChange={e => setFormState({ ...formState, shippingAmount: parseFloat(e.target.value) || 0 })}
                    />
                  </div>

                  {/* Discount Direct for Customer */}
                  <div className="space-y-1.5 text-right">
                    <label className="text-[11px] font-bold text-slate-500 block">خصم مالي مضاف (ج.م) 💸</label>
                    <input
                      type="number"
                      className="w-full bg-white border border-[#f1f5f9] focus:border-blue-500 focus:bg-white rounded-2xl py-3 px-4 text-xs font-sans font-black text-right outline-none"
                      value={formState.discount || ""}
                      onChange={e => setFormState({ ...formState, discount: parseFloat(e.target.value) || 0 })}
                    />
                  </div>

                  {/* Delivery Duration Custom Selector Toggle */}
                  <div className="space-y-1.5 text-right">
                    <span className="text-[11px] font-bold text-slate-500 block mb-1">تصنيف الشحن</span>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setFormState({ ...formState, deliveryDuration: "urgent" })}
                        className={`px-3 py-3 rounded-2xl text-center text-xs font-bold font-sans transition-all flex flex-col justify-center items-center gap-1 border-2 cursor-pointer ${
                          formState.deliveryDuration === "urgent"
                            ? "bg-rose-50/50 border-rose-500 text-rose-700 font-extrabold"
                            : "bg-white border-slate-150 text-slate-500 hover:bg-slate-50"
                        }`}
                      >
                        <span>مستعجل ⚡</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormState({ ...formState, deliveryDuration: "normal" })}
                        className={`px-3 py-3 rounded-2xl text-center text-xs font-bold font-sans transition-all flex flex-col justify-center items-center gap-1 border-2 cursor-pointer ${
                          formState.deliveryDuration === "normal"
                            ? "bg-blue-50/50 border-blue-600 text-blue-800 font-extrabold"
                            : "bg-white border-slate-150 text-slate-500 hover:bg-slate-50"
                        }`}
                      >
                        <span>طبيعي 📦 (5-7 أيام)</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Combined Checkbox Controls Container */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-slate-50/30 rounded-2xl border border-slate-100">
                <label className="flex items-center gap-3 cursor-pointer select-none justify-start px-2 py-1">
                  <input
                    type="checkbox"
                    checked={formState.deliveryDuration === "urgent"}
                    onChange={e => setFormState({ ...formState, deliveryDuration: e.target.checked ? "urgent" : "normal" })}
                    className="w-5 h-5 rounded-lg text-rose-600 focus:ring-rose-500 border-slate-200 transition-all cursor-pointer"
                  />
                  <span className="text-xs font-bold text-rose-600 flex items-center gap-1">
                    أوردر مستعجل؟ 🚨
                  </span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer select-none justify-start px-2 py-1">
                  <input
                    type="checkbox"
                    checked={formState.shippingPaid}
                    onChange={e => setFormState({ ...formState, shippingPaid: e.target.checked })}
                    className="w-5 h-5 rounded-lg text-emerald-600 focus:ring-emerald-500 border-slate-200 transition-all cursor-pointer"
                  />
                  <span className="text-xs font-bold text-emerald-700">
                    الشحن مدفوع سلفاً؟ 💵 (لن يتم تحصيله عند التوصيل)
                  </span>
                </label>
              </div>

              {/* Screenshot upload module */}
              <div className="space-y-2 text-right">
                <label className="text-xs font-bold text-slate-500 block flex items-center gap-1 justify-start">
                  <span>إرفاق سكرين شوت الأوردر (اختياري)</span>
                  <span>📸</span>
                </label>
                <div 
                  onDragEnter={handleContainerDrag}
                  onDragOver={handleContainerDrag}
                  onDragLeave={handleContainerDrag}
                  onDrop={handleDropScreenshot}
                  className="border-2 border-dashed border-slate-200 hover:border-blue-500 rounded-3xl flex flex-col items-center justify-center p-8 text-center transition-all bg-slate-50/30 hover:bg-white relative cursor-pointer group min-h-[140px]"
                >
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  
                  {formState.screenshot ? (
                    <div className="space-y-3 w-full">
                      <img src={formState.screenshot} alt="Screenshot Preview" className="mx-auto max-h-[140px] rounded-2xl object-contain shadow-sm border border-slate-100" />
                      <p className="text-emerald-600 font-extrabold text-xs">تم إرفاق صورة الأوردر بنجاح! 📸</p>
                      <button 
                        type="button" 
                        onClick={(e) => { e.stopPropagation(); setFormState({...formState, screenshot: undefined}); }}
                        className="text-xs font-bold text-rose-500 hover:underline z-20 relative cursor-pointer"
                      >
                        حذف الصورة ✕
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="text-amber-500 text-3xl mb-2">📁</div>
                      <span className="text-slate-700 font-extrabold text-xs block">اضغط هنا أو اسحب سكرين شوت لإرفاقها بالأوردر</span>
                      <span className="text-slate-400 font-semibold text-[10px] block mt-1">انقر للاختيار أو اسحب الملف</span>
                    </>
                  )}
                </div>
              </div>

              {/* Send Confirmation Options */}
              <div className="space-y-2 text-right">
                <label className="text-xs font-bold text-slate-500 block flex items-center gap-1 justify-start">
                  <span>ارسال رسالة التأكيد</span>
                  <span>💬</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setSendConfirm(true)}
                    className={`py-3 rounded-2xl text-center text-xs font-bold transition-all border-2 flex items-center justify-center gap-1.5 cursor-pointer ${
                      sendConfirm
                        ? "bg-emerald-50/50 border-emerald-500 text-emerald-800 font-extrabold"
                        : "bg-white border-slate-100 text-slate-500 hover:bg-slate-50"
                    }`}
                  >
                    <span>نعم ✅</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSendConfirm(false)}
                    className={`py-3 rounded-2xl text-center text-xs font-bold transition-all border-2 flex items-center justify-center gap-1.5 cursor-pointer ${
                      !sendConfirm
                        ? "bg-rose-50/50 border-rose-500 text-rose-800 font-extrabold"
                        : "bg-white border-slate-100 text-slate-500 hover:bg-slate-50"
                    }`}
                  >
                    <span>لا ❌</span>
                  </button>
                </div>
              </div>

              {/* Dashboard Notes Textarea Box */}
              <div className="space-y-1.5 text-right">
                <label className="text-xs font-bold text-slate-500 block flex items-center gap-1 justify-start">
                  <span>ملاحظات عامة للداشبورد / متابعة الأوردر</span>
                  <span>📝</span>
                </label>
                <textarea
                  className="w-full bg-[#f8fafc] focus:bg-white border border-slate-100 focus:border-blue-500 rounded-2xl p-4 text-xs font-bold min-h-[90px] text-right outline-none leading-relaxed transition-all placeholder:text-slate-400"
                  placeholder="اكتب ملاحظة عامة أو رقم الأوردر أو أي تفاصيل تخص توصيل الشحنة..."
                  value={formState.notes}
                  onChange={e => setFormState({ ...formState, notes: e.target.value })}
                />
              </div>

              {/* Live total cash calculation display banner */}
              <div className="bg-[#ecfdf5] border border-[#a7f3d0] rounded-3xl p-5 flex justify-between items-center text-right font-sans">
                <div className="space-y-1">
                  <span className="text-xs font-bold text-[#065f46]">إجمالي المطلوب تحصيله من العميل</span>
                  <span className="text-[10px] text-emerald-600 block font-semibold">
                                         سعر قطع الأوردر ({formState.items.reduce((sum, item) => sum + ((item.price || 0) * (item.quantity || 0)), 0)} ج.م) + الشحن ({formState.shippingPaid ? "0 ج.م" : `${formState.shippingAmount} ج.م`}){formState.discount > 0 ? ` - الخصم (${formState.discount} ج.م)` : ""}
                  </span>
                </div>
                <div className="text-left font-sans flex items-baseline gap-1">
                  <span className="text-2xl font-black text-[#047857] font-mono">{calculateFormTotal().toLocaleString()}</span>
                  <span className="text-xs font-black text-[#047857] inline-block font-bold">ج.م</span>
                </div>
              </div>

              {/* Action footer triggers */}
              <div className="pt-4 border-t border-slate-100 flex gap-3">
                <button
                  type="button"
                  onClick={() => { setIsFormOpen(false); setEditingOrder(null); }}
                  className="w-1/3 bg-slate-50 hover:bg-slate-100 text-slate-600 font-extrabold py-4 rounded-3xl transition-all cursor-pointer text-xs"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="w-2/3 bg-blue-600 hover:bg-blue-700 text-white font-extrabold py-4 rounded-3xl transition-all shadow-xl shadow-blue-100 flex items-center justify-center gap-1.5 cursor-pointer text-xs sm:text-sm"
                >
                  <span>حفظ ونشر الأوردر بالسيستم 💾</span>
                </button>
              </div>
            </form>
          </div>
          )}
        </div>
      )}
    </div>
  );
};

// Simple Mock icons to bypass dependencies
const Coins = ({ className, size }: { className?: string; size?: number }) => (
  <span className={className} style={{ fontSize: size }}>🪙</span>
);
