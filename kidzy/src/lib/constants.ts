import { Clock, CheckCircle, Truck, Check, X, ShieldAlert, type LucideIcon } from 'lucide-react';
import type { OrderStatus } from '../types';

export const STATUS_DETAILS: Record<OrderStatus, { label: string; color: string; icon: LucideIcon }> = {
  new: { label: "جديد ⚡", color: "bg-blue-50 border border-blue-200 text-blue-700 font-bold", icon: Clock },
  manufactured: { label: "تم التصنيع 🧵", color: "bg-purple-50 border border-purple-200 text-purple-700 font-bold", icon: CheckCircle },
  shipped: { label: "تم الشحن 🚚", color: "bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold", icon: Truck },
  out_for_delivery: { label: "مع المندوب 🚚", color: "bg-amber-50 border border-amber-200 text-amber-700 font-bold", icon: Truck },
  in_delivery: { label: "قيد المتابعة 🔄", color: "bg-sky-50 border border-sky-200 text-sky-700 font-bold", icon: Truck },
  delivered: { label: "تم التوصيل ✅", color: "bg-emerald-100/70 border border-emerald-300 text-emerald-800 font-black", icon: Check },
  completed: { label: "مكتمل النهاية 💎", color: "bg-teal-50 border border-teal-200 text-teal-700 font-bold", icon: CheckCircle },
  delayed: { label: "مؤجل ⏳", color: "bg-yellow-50 border border-yellow-200 text-yellow-700 font-bold", icon: Clock },
  returned: { label: "مرتجع كلي 🚨", color: "bg-red-50 border border-red-200 text-red-700 font-bold", icon: ShieldAlert },
  returned_partial: { label: "مرتجع جزئي ⚠️", color: "bg-orange-50 border border-orange-200 text-orange-700 font-bold", icon: ShieldAlert },
  cancelled: { label: "ملغي ❌", color: "bg-slate-50 border border-slate-200 text-slate-500 font-bold", icon: X }
};

export const GOVERNORATES = [
  "القاهرة", "الجيزة", "الإسكندرية", "القليوبية", "الدقهلية", "الغربية",
  "المنوفية", "الشرقية", "البحيرة", "كفر الشيخ", "دمياط", "بورسعيد",
  "الإسماعيلية", "السويس", "الفيوم", "بني سويف", "المنيا", "أسيوط",
  "سوهاج", "قنا", "الأقصر", "أسوان", "مطروح", "البحر الأحمر", "شمال سيناء", "جنوب سيناء"
];

export const ORDER_SOURCES = ["فيسبوك", "إنستغرام", "تيك توك", "واتساب", "مكالمة هاتفية", "الموقع الإلكتروني", "أخرى"];
