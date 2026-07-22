import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Plus, Search, Filter, Pencil, Trash2, AlertCircle, 
  Package as PackageIcon, TrendingUp, DollarSign, Layers,
  ChevronDown, ChevronUp, History, Tag, Box, X
} from 'lucide-react';
import { Product, ProductVariant } from '../types';

export function Inventory() {
  const { products = [], setProducts } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null);
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);
  const [productToDelete, setProductToDelete] = useState<string | null>(null);

  const filteredProducts = (products || []).filter(p => 
    (p.name || '').includes(searchTerm) || (p.code || '').includes(searchTerm)
  );

  const handleDeleteProduct = (id: string) => {
    setProductToDelete(id);
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;

    const totalCost = (editingProduct.materialsCost || 0) + 
                     (editingProduct.workshopFee || 0) + 
                     (editingProduct.packagingCost || 0) + 
                     (editingProduct.marketingCost || 0) + 
                     (editingProduct.extraCost || 0);
    const expectedProfit = (editingProduct.retailPrice || editingProduct.sellingPrice || 0) - totalCost;

    const finalProduct = {
      ...editingProduct,
      totalCost,
      expectedProfit,
      variants: editingProduct.variants || []
    } as Product;

    if (editingProduct.id) {
      setProducts(products.map(p => p.id === editingProduct.id ? finalProduct : p));
    } else {
      setProducts([...products, { ...finalProduct, id: `PRD-${Date.now()}` }]);
    }
    setIsModalOpen(false);
    setEditingProduct(null);
  };

  return (
    <div className="space-y-6 pb-20 text-right" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="text-right">
          <h2 className="text-xl sm:text-2xl font-black text-slate-800 flex items-center gap-2 justify-start sm:justify-start">
            <Box size={24} className="text-blue-600 shrink-0" />
            <span>صفحة المنتجات وتفاصيلها</span>
          </h2>
          <p className="text-slate-500 font-bold mt-1 text-xs sm:text-sm">إدارة الموديلات والألوان والمقاسات والتكاليف</p>
        </div>
        <button 
          onClick={() => {
            setEditingProduct({
              name: '',
              code: '',
              materialsCost: 0,
              workshopFee: 0,
              packagingCost: 0,
              marketingCost: 0,
              extraCost: 0,
              sellingPrice: 0,
              retailPrice: 0,
              wholesalePriceBreaks: [],
              variants: []
            });
            setIsModalOpen(true);
          }}
          className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-2xl flex items-center justify-center gap-2 font-black transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 active:scale-95 text-xs sm:text-sm shrink-0"
        >
          <Plus size={16} />
          <span>إضافة منتج جديد</span>
        </button>
      </div>

      {/* Unified Filter Bar with Responsive Bento Stats Row */}
      <div className="space-y-3">
        {/* Search */}
        <div className="bg-white p-3 rounded-[2rem] border border-slate-100 shadow-sm">
          <div className="relative w-full">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="ابحثي هنا باسم الموديل أو كود المنتج..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border-none rounded-2xl py-3 pr-11 pl-4 text-xs sm:text-sm font-bold focus:ring-2 focus:ring-blue-100 transition-all text-right"
            />
          </div>
        </div>

        {/* Bento Stats Row */}
        <div className="grid grid-cols-1 gap-3">
          {/* Stat 1 */}
          <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shrink-0">
              <Box size={20} />
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-black uppercase">إجمالي الموديلات</p>
              <p className="text-base font-black text-slate-800 mt-0.5">{(products || []).length} موديل</p>
            </div>
          </div>
        </div>
      </div>

      {/* List */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="divide-y divide-slate-50">
          {filteredProducts.map((product) => (
            <div key={product.id} className="bg-white">
              <div 
                className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between cursor-pointer hover:bg-slate-50/50 transition-all gap-4 text-right ${expandedProduct === product.id ? 'bg-slate-50/50' : ''}`}
                onClick={() => setExpandedProduct(expandedProduct === product.id ? null : product.id)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center border border-blue-100 shrink-0">
                    <Tag size={18} />
                  </div>
                  <div>
                    <h4 className="font-black text-sm sm:text-base text-slate-800 flex items-center gap-1.5 flex-wrap">
                      <span>{product.name}</span>
                      <span className="text-[10px] sm:text-xs font-mono font-bold bg-slate-100 px-2 py-0.5 rounded-md text-slate-600 shrink-0">{product.code}</span>
                    </h4>
                    <p className="text-[11px] text-slate-400 font-bold mt-0.5">{(product.variants || []).length} أنواع ألوان/مقاسات</p>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-4 border-t border-slate-50 pt-3 sm:pt-0 sm:border-0">
                  <div className="flex items-center gap-3">
                    <div className="text-center">
                      <p className="text-[9px] text-blue-500 font-black">قطاعي</p>
                      <p className="text-xs font-black text-blue-600">{product.retailPrice || product.sellingPrice || 0} ج.م</p>
                    </div>
                    <div className="w-px h-6 bg-slate-200"></div>
                    <div className="text-center">
                      <p className="text-[9px] text-emerald-500 font-black">جملة</p>
                      {(product.wholesalePriceBreaks || []).length > 0 ? (
                        <p className="text-[10px] font-black text-emerald-600">{(product.wholesalePriceBreaks || []).length} شريحة</p>
                      ) : (
                        <p className="text-[10px] font-black text-slate-400">-</p>
                      )}
                    </div>
                  </div>
                  <div className="w-8 h-8 rounded-lg bg-slate-100/80 flex items-center justify-center hover:bg-blue-50 hover:text-blue-600 transition-colors shrink-0">
                    {expandedProduct === product.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>
                </div>
              </div>

              {expandedProduct === product.id && (
                <div className="p-4 bg-slate-50/30 border-t border-slate-50 space-y-4 animate-in fade-in slide-in-from-top-2 text-right">
                  {/* Detailed Costs */}
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                      <div className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm text-right">
                        <p className="text-[10px] text-slate-400 font-black mb-1">تكلفة الخامات</p>
                        <p className="text-sm font-black text-slate-700">{product.materialsCost} ج.م</p>
                      </div>
                      <div className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm text-right">
                        <p className="text-[10px] text-slate-400 font-black mb-1">شغل الورشة</p>
                        <p className="text-sm font-black text-slate-700">{product.workshopFee} ج.م</p>
                      </div>
                      <div className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm text-right">
                        <p className="text-[10px] text-slate-400 font-black mb-1">إجمالي التكلفة</p>
                        <p className="text-sm font-black text-slate-700">{product.totalCost} ج.م</p>
                      </div>
                      <div className="bg-blue-50 p-3 rounded-2xl border border-blue-100 shadow-sm text-right">
                        <p className="text-[10px] text-blue-500 font-black mb-1">سعر القطاعي</p>
                        <p className="text-sm font-black text-blue-600">{product.retailPrice || product.sellingPrice || 0} ج.م</p>
                      </div>
                      <div className="bg-emerald-50 p-3 rounded-2xl border border-emerald-100 shadow-sm text-right">
                        <p className="text-[10px] text-emerald-500 font-black mb-1">أسعار الجملة</p>
                        {(product.wholesalePriceBreaks || []).length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {(product.wholesalePriceBreaks || []).sort((a, b) => a.from - b.from).map((brk, i) => (
                              <span key={i} className="text-[9px] font-black px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700">{brk.from}-{brk.to} = {brk.price} ج</span>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs font-black text-slate-400">غير محدد</p>
                        )}
                      </div>
                    </div>

                    {/* Action buttons row */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white/50 p-3 rounded-2xl border border-dashed border-slate-200">
                      <span className="text-[11px] sm:text-xs text-slate-500 font-bold">التحكم في بيانات وتسعير موديل المنتج:</span>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={(e) => { e.stopPropagation(); setEditingProduct(product); setIsModalOpen(true); }}
                          className="flex items-center justify-center gap-1.5 px-4 py-2 bg-blue-50 hover:bg-blue-600 text-blue-600 hover:text-white rounded-xl text-xs font-black transition-all flex-1 sm:flex-initial"
                          title="تعديل المنتج"
                        >
                          <Pencil size={14} />
                          <span>تعديل التكاليف والتسعير</span>
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleDeleteProduct(product.id); }}
                          className="flex items-center justify-center gap-1.5 px-3 py-2 bg-red-50 hover:bg-red-600 text-red-600 hover:text-white rounded-xl text-xs font-black transition-all"
                          title="حذف المنتج"
                        >
                          <Trash2 size={14} />
                          <span>حذف الموديل</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Variants Table */}
                  <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
                    <table className="w-full text-right text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-black">
                          <th className="px-4 py-3">اللون</th>
                          <th className="px-4 py-3 text-left">المقاس</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {(product.variants || []).map((v) => (
                          <tr 
                            key={v.id} 
                            className="hover:bg-slate-50/50 transition-all duration-150"
                          >
                            <td className="px-4 py-3 font-bold">{v.color}</td>
                            <td className="px-4 py-3 text-left font-bold">{v.size}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      {/* Add/Edit Modal */}
      {isModalOpen && editingProduct && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-[32px] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-6 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-xl font-black text-slate-800">
                {editingProduct.id ? 'تعديل موديل' : 'إضافة موديل جديد'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition-all">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSaveProduct} className="p-6 space-y-6 overflow-y-auto overflow-x-hidden">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest block font-sans">اسم الموديل</label>
                  <input 
                    required
                    className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-bold focus:ring-2 focus:ring-blue-100 transition-all text-right"
                    value={editingProduct.name || ''}
                    onChange={e => setEditingProduct({...editingProduct, name: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest block font-sans">كود المنتج (Code)</label>
                  <input 
                    required
                    className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-bold focus:ring-2 focus:ring-blue-100 transition-all font-mono text-right"
                    value={editingProduct.code || ''}
                    onChange={e => setEditingProduct({...editingProduct, code: e.target.value})}
                  />
                </div>
              </div>

              {/* Pricing & Costs */}
              <div className="bg-blue-50/50 p-4 rounded-3xl space-y-4">
                <label className="text-xs font-black text-blue-600 uppercase tracking-widest block">التكاليف والتسعير</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 block">تكلفة الخامات</label>
                    <input 
                      type="number"
                      className="w-full bg-white border-none rounded-xl p-3 text-sm font-bold font-sans text-right"
                      value={editingProduct.materialsCost || ''}
                      onFocus={e => e.target.select()}
                      onChange={e => setEditingProduct({...editingProduct, materialsCost: parseFloat(e.target.value) || 0})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 block">شغل الورشة (المصنعية)</label>
                    <input 
                      type="number"
                      className="w-full bg-white border-none rounded-xl p-3 text-sm font-bold font-sans text-right"
                      value={editingProduct.workshopFee || ''}
                      onFocus={e => e.target.select()}
                      onChange={e => setEditingProduct({...editingProduct, workshopFee: parseFloat(e.target.value) || 0})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 block">تكلفة التغليف</label>
                    <input 
                      type="number"
                      className="w-full bg-white border-none rounded-xl p-3 text-sm font-bold font-sans text-right"
                      value={editingProduct.packagingCost || ''}
                      onFocus={e => e.target.select()}
                      onChange={e => setEditingProduct({...editingProduct, packagingCost: parseFloat(e.target.value) || 0})}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 block">تكلفة التسويق</label>
                    <input 
                      type="number"
                      className="w-full bg-white border-none rounded-xl p-3 text-sm font-bold font-sans text-right"
                      value={editingProduct.marketingCost || ''}
                      onFocus={e => e.target.select()}
                      onChange={e => setEditingProduct({...editingProduct, marketingCost: parseFloat(e.target.value) || 0})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 block">تكاليف إضافية</label>
                    <input 
                      type="number"
                      className="w-full bg-white border-none rounded-xl p-3 text-sm font-bold font-sans text-right"
                      value={editingProduct.extraCost || ''}
                      onFocus={e => e.target.select()}
                      onChange={e => setEditingProduct({...editingProduct, extraCost: parseFloat(e.target.value) || 0})}
                    />
                  </div>
                </div>
                <div className="pt-3 border-t border-blue-100 flex flex-col gap-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-black text-blue-600 block">سعر البيع القطاعي</label>
                      <input 
                        type="number"
                        className="w-full bg-white border-2 border-blue-200 rounded-xl p-3 text-lg font-black text-blue-600 font-sans text-right outline-none"
                        value={editingProduct.retailPrice || ''}
                        onFocus={e => e.target.select()}
                        onChange={e => setEditingProduct({...editingProduct, retailPrice: parseFloat(e.target.value) || 0})}
                        placeholder="0"
                      />
                    </div>
                  </div>

                  {/* Wholesale Price Breaks */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-black text-emerald-600 block">أسعار الجملة حسب الكمية</label>
                      <button 
                        type="button"
                        onClick={() => {
                          const breaks = editingProduct.wholesalePriceBreaks || [];
                          const lastTo = breaks.length > 0 ? breaks[breaks.length - 1].to : 0;
                          setEditingProduct({
                            ...editingProduct, 
                            wholesalePriceBreaks: [...breaks, { from: lastTo + 1, to: lastTo + 50, price: 0 }]
                          });
                        }}
                        className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-xl hover:bg-emerald-100 transition-all"
                      >
                        + إضافة شريحة سعر
                      </button>
                    </div>
                    {(editingProduct.wholesalePriceBreaks || []).length === 0 && (
                      <p className="text-[11px] text-slate-400 font-bold text-center py-3 bg-emerald-50/30 rounded-2xl border border-dashed border-emerald-100">لم تُحدد أسعار جملة بعد - أضيفي شريحة سعر لكل كمية</p>
                    )}
                    {(editingProduct.wholesalePriceBreaks || []).map((brk, idx) => {
                      const totalCost = (editingProduct.materialsCost || 0) + (editingProduct.workshopFee || 0) + (editingProduct.packagingCost || 0) + (editingProduct.marketingCost || 0) + (editingProduct.extraCost || 0);
                      const profit = brk.price - totalCost;
                      return (
                        <div key={idx} className="flex flex-col sm:flex-row sm:items-center gap-2 bg-emerald-50/50 p-3 rounded-2xl border border-emerald-100">
                          <div className="flex-1 flex flex-wrap items-center gap-2">
                            <span className="text-[10px] text-slate-500 font-bold">من</span>
                            <input 
                              type="number" 
                              min="1"
                              className="w-16 bg-white border border-emerald-200 rounded-xl py-2 px-2 text-xs font-bold text-center outline-none focus:ring-2 focus:ring-emerald-100"
                              value={brk.from || ''}
                              onFocus={e => e.target.select()}
                              onChange={e => {
                                const newBreaks = [...(editingProduct.wholesalePriceBreaks || [])];
                                newBreaks[idx].from = parseInt(e.target.value) || 0;
                                setEditingProduct({...editingProduct, wholesalePriceBreaks: newBreaks});
                              }}
                            />
                            <span className="text-[10px] text-slate-500 font-bold">لى</span>
                            <input 
                              type="number" 
                              min="1"
                              className="w-16 bg-white border border-emerald-200 rounded-xl py-2 px-2 text-xs font-bold text-center outline-none focus:ring-2 focus:ring-emerald-100"
                              value={brk.to || ''}
                              onFocus={e => e.target.select()}
                              onChange={e => {
                                const newBreaks = [...(editingProduct.wholesalePriceBreaks || [])];
                                newBreaks[idx].to = parseInt(e.target.value) || 0;
                                setEditingProduct({...editingProduct, wholesalePriceBreaks: newBreaks});
                              }}
                            />
                            <span className="text-[10px] text-slate-500 font-bold">قطعة</span>
                            <span className="text-[10px] text-slate-400 font-bold mx-1">|</span>
                            <input 
                              type="number" 
                              min="0"
                              className="w-24 bg-white border border-emerald-200 rounded-xl py-2 px-2 text-xs font-bold text-center outline-none focus:ring-2 focus:ring-emerald-100"
                              value={brk.price || ''}
                              onFocus={e => e.target.select()}
                              onChange={e => {
                                const newBreaks = [...(editingProduct.wholesalePriceBreaks || [])];
                                newBreaks[idx].price = parseFloat(e.target.value) || 0;
                                setEditingProduct({...editingProduct, wholesalePriceBreaks: newBreaks});
                              }}
                              placeholder="السعر"
                            />
                            <span className="text-[10px] text-slate-500 font-bold">ج.م/قطعة</span>
                            {brk.price > 0 && totalCost > 0 && (
                              <span className={`text-[9px] font-black px-2 py-0.5 rounded-lg ${profit > 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                                ربح {profit.toFixed(0)} ج/قطعة
                              </span>
                            )}
                          </div>
                          <button 
                            type="button"
                            onClick={() => {
                              const newBreaks = (editingProduct.wholesalePriceBreaks || []).filter((_, i) => i !== idx);
                              setEditingProduct({...editingProduct, wholesalePriceBreaks: newBreaks});
                            }}
                            className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all self-center"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  <div className="text-right space-y-1 font-sans bg-white/50 p-3 rounded-2xl border border-dashed border-slate-200">
                    <p className="text-xs font-black text-slate-400">إجمالي التكلفة: <span className="text-slate-800 font-bold">{(editingProduct.materialsCost || 0) + (editingProduct.workshopFee || 0) + (editingProduct.packagingCost || 0) + (editingProduct.marketingCost || 0) + (editingProduct.extraCost || 0)} ج.م</span></p>
                    <p className="text-xs font-black text-blue-500">ربح القطاعي: <span className="font-bold">{(editingProduct.retailPrice || 0) - ((editingProduct.materialsCost || 0) + (editingProduct.workshopFee || 0) + (editingProduct.packagingCost || 0) + (editingProduct.marketingCost || 0) + (editingProduct.extraCost || 0))} ج.م/قطعة</span></p>
                    {(editingProduct.wholesalePriceBreaks || []).length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {(editingProduct.wholesalePriceBreaks || []).sort((a, b) => a.from - b.from).map((brk, idx) => (
                          <span key={idx} className="text-[9px] font-black px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-600">
                            {brk.from}-{brk.to} قطعة = {brk.price} ج.م
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Variants Setup */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest">تحديد الأنواع (ألوان ومقاسات)</label>
                  <button 
                    type="button"
                    onClick={() => setEditingProduct({...editingProduct, variants: [...(editingProduct.variants || []), { id: `v-${Date.now()}`, color: '', size: '', quantity: 0, lowStockThreshold: 5 }]})}
                    className="text-xs font-black text-blue-600 bg-blue-50 px-3 py-2 rounded-xl hover:bg-blue-100 transition-all"
                  >
                    + إضافة لون/مقاس
                  </button>
                </div>
                
                <div className="space-y-3">
                  {editingProduct.variants?.map((variant, idx) => (
                    <div key={variant.id} className="flex flex-col sm:flex-row sm:items-center gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-100 text-right">
                      {/* Color & Size Inputs Group */}
                      <div className="flex gap-2 flex-1">
                        <input 
                          placeholder="اللون"
                          className="bg-white border-none rounded-xl p-2.5 text-xs font-bold flex-1 text-right"
                          value={variant.color || ''}
                          onChange={e => {
                            const newVariants = [...(editingProduct.variants || [])];
                            newVariants[idx].color = e.target.value;
                            setEditingProduct({...editingProduct, variants: newVariants});
                          }}
                        />
                        <input 
                          placeholder="المقاس"
                          className="bg-white border-none rounded-xl p-2.5 text-xs font-bold flex-1 text-right"
                          value={variant.size || ''}
                          onChange={e => {
                            const newVariants = [...(editingProduct.variants || [])];
                            newVariants[idx].size = e.target.value;
                            setEditingProduct({...editingProduct, variants: newVariants});
                          }}
                        />
                      </div>
                      
                      {/* Delete Button */}
                      <button 
                        type="button"
                        onClick={() => {
                          const newVariants = editingProduct.variants?.filter((_, i) => i !== idx);
                          setEditingProduct({...editingProduct, variants: newVariants});
                        }}
                        className="text-red-500 hover:bg-red-50 hover:text-red-700 p-2.5 rounded-xl transition-all flex justify-center shrink-0 border border-transparent hover:border-red-100"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                  {(!editingProduct.variants || editingProduct.variants.length === 0) && (
                    <p className="text-center text-xs text-slate-400 font-bold py-4">لا يوجد أنواع مسجلة بعد</p>
                  )}
                </div>
              </div>

              <div className="pt-4 sticky bottom-0 bg-white">
                <button 
                  type="submit"
                  className="w-full bg-blue-600 text-white font-black py-4 rounded-2xl shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all text-sm"
                >
                  حفظ تفاصيل وبيانات المنتج
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom Product Delete Confirmation Modal */}
      {productToDelete && (() => {
        const prod = products.find(p => p.id === productToDelete);
        return (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[155] flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-md rounded-3xl overflow-hidden shadow-2xl p-6 text-right animate-in fade-in zoom-in-95 duration-200" dir="rtl">
              <div className="text-center space-y-3">
                <div className="w-12 h-12 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto text-xl">
                  ⚠️
                </div>
                <h3 className="text-lg font-black text-slate-800">تأكيد حذف المنتج</h3>
                <p className="text-xs text-slate-500 font-bold leading-relaxed font-sans">
                  هل أنتِ متأكدة من رغبتكِ في حذف المنتج <strong className="text-slate-800">"{prod?.name || ''}"</strong> نهائياً من السيستم؟ سيتم أيضاً حذف جميع الألوان والمقاسات التابعة له ولا يمكن التراجع عن هذه الخطوة.
                </p>
              </div>
              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setProducts(products.filter(p => p.id !== productToDelete));
                    setProductToDelete(null);
                  }}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-black py-3 rounded-2xl transition-all shadow-md shadow-red-100"
                >
                  نعم، احذف نهائياً
                </button>
                <button
                  type="button"
                  onClick={() => setProductToDelete(null)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-black py-3 rounded-2xl transition-all"
                >
                  إلغاء التراجع
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
