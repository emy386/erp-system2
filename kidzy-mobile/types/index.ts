export interface Variant {
  id: string;
  color: string;
  size: string;
  quantity: number;
  lowStockThreshold: number;
}

export interface Product {
  id: string;
  name: string;
  code: string;
  materialsCost: number;
  workshopFee: number;
  packagingCost: number;
  marketingCost: number;
  extraCost: number;
  totalCost: number;
  sellingPrice: number;
  expectedProfit: number;
  variants: Variant[];
}

export interface OrderItem {
  productId: string;
  name: string;
  productName?: string;
  color?: string;
  size?: string;
  quantity: number;
  price: number;
  productionStatus: "not_started" | "in_production" | "completed" | "cancelled";
  isReturned?: boolean;
  variantId?: string;
  productCode?: string;
  childName?: string;
  notes?: string;
}

export type OrderStatus =
  | "new"
  | "manufactured"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "returned"
  | "out_for_delivery"
  | "in_delivery"
  | "completed"
  | "delayed"
  | "returned_partial";

export interface Order {
  id: string;
  customerName: string;
  customerPhone: string;
  customerPhone2?: string;
  childName?: string;
  screenshot?: string;
  governorate: string;
  address: string;
  total: number;
  shippingPaid: boolean;
  shippingAmount: number;
  discount?: number;
  status: OrderStatus;
  productionStatus: "not_started" | "in_production" | "completed";
  isRegisteredShipping: boolean;
  sentConfirmationMessage?: boolean;
  isUrgent: boolean;
  deliveryDuration: "normal" | "urgent";
  notes?: string;
  source: string;
  creationDate: string;
  deadlineDate: string;
  lastUpdateDate: string;
  items: OrderItem[];
  payments?: { id: string; date: string; amount: number; notes?: string }[];
}

export interface Payment {
  id: string;
  date: string;
  amount: number;
  notes?: string;
  workerId?: string;
}

export interface Worker {
  id: string;
  name: string;
  phone?: string;
  role: string;
  totalFinishedItems: number;
  totalOwed: number;
  totalPaid: number;
  remainingBalance: number;
  payments: Payment[];
}

export interface ProductionIntake {
  id: string;
  date: string;
  workerId: string;
  workerName: string;
  productId: string;
  productName: string;
  variantId: string;
  color: string;
  size: string;
  quantity: number;
  costPerItem: number;
  totalCost: number;
  stage?: string;
  receiptId?: string;
  type?: string;
  paidAmount?: number;
}

export interface InventoryMovement {
  id: string;
  date: string;
  productId: string;
  productName: string;
  variantId: string;
  color: string;
  size: string;
  quantity: number;
  type: "in" | "out" | "intake" | string;
  notes?: string;
  refId?: string;
}

export interface GeneralExpense {
  id: string;
  date: string;
  category: string;
  description: string;
  amount: number;
  paidAmount?: number;
  isPaid?: boolean;
  notes?: string;
}

export interface StaffRole {
  id: string;
  name: string;
  pay: number;
  paidAmount?: number;
  isPaid?: boolean;
}

export interface VariableTask {
  id: string;
  name: string;
  pay: number;
  status: "paid" | "unpaid";
  date: string;
  amount: number;
  paidAmount?: number;
  isPaid?: boolean;
  notes?: string;
  description?: string;
  type?: string;
}

export interface User {
  id: string;
  name: string;
  phone: string;
  role: "owner" | "manager" | "staff";
  permissions: string[];
  staffRoles: StaffRole[];
  variableTasks: VariableTask[];
  email: string;
  password?: string;
  jobTitle: string;
}
