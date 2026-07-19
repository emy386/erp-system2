import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Users, Package, Plus, Search, Calendar, 
  DollarSign, CheckCircle2, AlertCircle, 
  ChevronDown, History, UserCheck, TrendingUp,
  CreditCard, ArrowDownCircle, ArrowUpCircle,
  X, Trash2, Eye, Receipt, ChevronLeft, Scissors, Edit
} from 'lucide-react';
import { Worker, ProductionIntake, Product, ProductVariant, WorkerPayment } from '../types';

interface IntakeItem {
  productId: string;
  variantId: string;
  quantity: number;
  costPerItem: number;
  type: 'cutting' | 'sewing'; // تحديد نوع التوريد: قص أو تقفيل
}

export function Production() {
  const { 
    workers, setWorkers, 
    products, setProducts, 
    productionIntakes, setProductionIntakes,
    inventoryMovements, setInventoryMovements
  } = useApp();

  // Tabs: production (الإنتاج الموحد) | accounts (حسابات الورش) | cutting (القص) | sewing (التقفيل) | packaging (التغليف)
  const [activeTab, setActiveTab] = useState<'production' | 'accounts' | 'cutting' | 'sewing' | 'packaging'>('production');

  // Production statuses: tracks shipped count + timestamped history per variant
  const [productionStatuses, setProductionStatuses] = useState<Record<string, { shipped: number; history: { date: string; amount: number }[] }>>(() => {
    const saved = localStorage.getItem('kidzy_production_statuses');
    if (!saved) return {};
    try {
      const parsed = JSON.parse(saved);
      // Migration from old format ('available'/'shipped' or per-piece keys)
      if (typeof Object.values(parsed)[0] === 'string') {
        return {};
      }
      return parsed;
    } catch { return {}; }
  });
  const [productionStatusFilter, setProductionStatusFilter] = useState<'all' | 'available' | 'shipped'>('all');

  // Accounts Filters
  const [accountsSearchQuery, setAccountsSearchQuery] = useState<string>('');
  const [accountsWorkerFilter, setAccountsWorkerFilter] = useState<string>('all');
  const [accountsStartDate, setAccountsStartDate] = useState<string>('');
  const [accountsEndDate, setAccountsEndDate] = useState<string>('');

  // Cutting stage tab filters
  const [cuttingSearchQuery, setCuttingSearchQuery] = useState<string>('');
  const [cuttingWorkerFilter, setCuttingWorkerFilter] = useState<string>('all');
  const [cuttingStartDate, setCuttingStartDate] = useState<string>('');
  const [cuttingEndDate, setCuttingEndDate] = useState<string>('');

  // Sewing stage tab filters
  const [sewingSearchQuery, setSewingSearchQuery] = useState<string>('');
  const [sewingWorkerFilter, setSewingWorkerFilter] = useState<string>('all');
  const [sewingStartDate, setSewingStartDate] = useState<string>('');
  const [sewingEndDate, setSewingEndDate] = useState<string>('');

  // Packaging stage tab filters
  const [packagingSearchQuery, setPackagingSearchQuery] = useState<string>('');
  const [packagingWorkerFilter, setPackagingWorkerFilter] = useState<string>('all');
  const [packagingStartDate, setPackagingStartDate] = useState<string>('');
  const [packagingEndDate, setPackagingEndDate] = useState<string>('');

  // Inventory/Production tab filter
  const [productionSearchQuery, setProductionSearchQuery] = useState<string>('');

  // Individual intake slip payment edit state:
  const [editingIntakeId, setEditingIntakeId] = useState<string | null>(null);
  const [newStagePaidAmount, setNewStagePaidAmount] = useState<number>(0);

  const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(null);

  const [confirmDeleteState, setConfirmDeleteState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });
  
  // Modals status
  const [isWorkerModalOpen, setIsWorkerModalOpen] = useState(false);
  const [isIntakeModalOpen, setIsIntakeModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isPackagingModalOpen, setIsPackagingModalOpen] = useState(false);
  const [selectedStage, setSelectedStage] = useState<'cutting' | 'sewing' | 'packaging'>('cutting');

  // Intake Form State
  const [intakeWorkerId, setIntakeWorkerId] = useState('');
  const [intakeDate, setIntakeDate] = useState(new Date().toISOString().split('T')[0]);
  const [intakeItems, setIntakeItems] = useState<IntakeItem[]>([]);

  // Packaging Form State
  const [pkgWorkerId, setPkgWorkerId] = useState('');
  const [pkgDate, setPkgDate] = useState(new Date().toISOString().split('T')[0]);
  const [pkgQuantity, setPkgQuantity] = useState<number>(0);
  const [pkgCostPerItem, setPkgCostPerItem] = useState<number>(0);

  const [newWorker, setNewWorker] = useState<Partial<Worker>>({
    name: '',
    phone: '',
    role: 'cutting'
  });

  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentNote, setPaymentNote] = useState('');
  const [payingWorkerId, setPayingWorkerId] = useState('');

  const [editingWorker, setEditingWorker] = useState<Worker | null>(null);
  const [isEditWorkerModalOpen, setIsEditWorkerModalOpen] = useState(false);
  const [editWorkerName, setEditWorkerName] = useState('');
  const [editWorkerPhone, setEditWorkerPhone] = useState('');
  const [editWorkerRole, setEditWorkerRole] = useState<'cutting' | 'sewing' | 'packaging'>('cutting');

  const [editingIntake, setEditingIntake] = useState<ProductionIntake | null>(null);
  const [isEditIntakeModalOpen, setIsEditIntakeModalOpen] = useState(false);
  const [editIntakeDate, setEditIntakeDate] = useState('');
  const [editIntakeQuantity, setEditIntakeQuantity] = useState<number>(0);
  const [editIntakeCostPerItem, setEditIntakeCostPerItem] = useState<number>(0);

  const handleOpenEditWorker = (worker: Worker) => {
    setEditingWorker(worker);
    setEditWorkerName(worker.name);
    setEditWorkerPhone(worker.phone || '');
    setEditWorkerRole((worker.role || 'cutting') as 'cutting' | 'sewing' | 'packaging');
    setIsEditWorkerModalOpen(true);
  };

  const handleUpdateWorker = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingWorker) return;

    setWorkers(workers.map(w => {
      if (w.id === editingWorker.id) {
        return {
          ...w,
          name: editWorkerName,
          phone: editWorkerPhone,
          role: editWorkerRole
        };
      }
      return w;
    }));
    setIsEditWorkerModalOpen(false);
    setEditingWorker(null);
  };

  const handleDeleteWorker = (workerId: string) => {
    const worker = workers.find(w => w.id === workerId);
    if (!worker) return;

    const workerIntakes = productionIntakes.filter(i => i.workerId === workerId);
    if (workerIntakes.length > 0) {
      setConfirmDeleteState({
        isOpen: true,
        title: "تأكيد حذف العامل والسجلات ⚠️",
        message: `هذا العامل "${worker.name}" لديه ${workerIntakes.length} مرحلة إنتاج مسجلة باسمه. هل أنت متأكد من حذفه نهائياً؟ سيتم أيضاً حذف جميع مراحل التشغيل الخاصة به من السجل ومن كشف الحساب وتعديل المخزون!`,
        onConfirm: () => {
          let updatedProducts = [...products];
          let updatedMovements = [...inventoryMovements];

          workerIntakes.forEach(intake => {
            if (intake.productId && intake.variantId) {
              updatedProducts = updatedProducts.map(p => {
                if (p.id === intake.productId) {
                  return {
                    ...p,
                    variants: p.variants.map(v => {
                      if (v.id === intake.variantId) {
                        return {
                          ...v,
                          quantity: Math.max(0, v.quantity - intake.quantity)
                        };
                      }
                      return v;
                    })
                  };
                }
                return p;
              });
              updatedMovements = updatedMovements.filter(m => m.refId !== intake.id);
            }
          });

          setProducts(updatedProducts);
          setInventoryMovements(updatedMovements);
          setProductionIntakes(productionIntakes.filter(i => i.workerId !== workerId));
          setWorkers(workers.filter(w => w.id !== workerId));
          if (selectedWorkerId === workerId) {
            setSelectedWorkerId(null);
          }
        }
      });
    } else {
      setConfirmDeleteState({
        isOpen: true,
        title: "حذف العامل / ورشة العمل ❌",
        message: `هل أنت متأكد من حذف العامل/الورشة "${worker.name}"؟`,
        onConfirm: () => {
          setWorkers(workers.filter(w => w.id !== workerId));
          if (selectedWorkerId === workerId) {
            setSelectedWorkerId(null);
          }
        }
      });
    }
  };

  const handleOpenEditIntake = (intake: ProductionIntake) => {
    setEditingIntake(intake);
    setEditIntakeDate(intake.date);
    setEditIntakeQuantity(intake.quantity);
    setEditIntakeCostPerItem(intake.costPerItem);
    setIsEditIntakeModalOpen(true);
  };

  const handleUpdateIntake = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingIntake) return;

    const oldQuantity = editingIntake.quantity;
    const oldCostPerItem = editingIntake.costPerItem;
    const newQuantity = editIntakeQuantity;
    const newCostPerItem = editIntakeCostPerItem;

    const quantityDifference = newQuantity - oldQuantity;
    const newTotalCost = newQuantity * newCostPerItem;

    // 1. Update intake record
    const updatedIntakes = productionIntakes.map(item => {
      if (item.id === editingIntake.id) {
        return {
          ...item,
          date: editIntakeDate,
          quantity: newQuantity,
          costPerItem: newCostPerItem,
          totalCost: newTotalCost
        };
      }
      return item;
    });
    setProductionIntakes(updatedIntakes);

    // 2. Adjust Product Inventory
    if (editingIntake.productId && editingIntake.variantId) {
      const updatedProducts = products.map(p => {
        if (p.id === editingIntake.productId) {
          return {
            ...p,
            variants: p.variants.map(v => {
              if (v.id === editingIntake.variantId) {
                return {
                  ...v,
                  quantity: Math.max(0, v.quantity + quantityDifference)
                };
              }
              return v;
            })
          };
        }
        return p;
      });
      setProducts(updatedProducts);

      // Adjust associated inventory movements quantity
      const updatedMovements = inventoryMovements.map(m => {
        if (m.refId === editingIntake.id) {
          return {
            ...m,
            quantity: newQuantity
          };
        }
        return m;
      });
      setInventoryMovements(updatedMovements);
    }

    setIsEditIntakeModalOpen(false);
    setEditingIntake(null);
  };

  const handleDeleteIntake = (intakeId: string) => {
    const intake = productionIntakes.find(i => i.id === intakeId);
    if (!intake) return;

    setConfirmDeleteState({
      isOpen: true,
      title: "تأكيد حذف مرحلة الإنتاج 🗑️",
      message: "هل أنت متأكد من حذف هذه المرحلة؟ سيتم تعديل الحسابات والمخزون تلقائياً.",
      onConfirm: () => {
        // Revert inventory
        if (intake.productId && intake.variantId) {
          const updatedProducts = products.map(p => {
            if (p.id === intake.productId) {
              return {
                ...p,
                variants: p.variants.map(v => {
                  if (v.id === intake.variantId) {
                    return {
                      ...v,
                      quantity: Math.max(0, v.quantity - intake.quantity)
                    };
                  }
                  return v;
                })
              };
            }
            return p;
          });
          setProducts(updatedProducts);

          // Clean up associated inventory movements
          const updatedMovements = inventoryMovements.filter(m => m.refId !== intakeId);
          setInventoryMovements(updatedMovements);
        }

        setProductionIntakes(productionIntakes.filter(i => i.id !== intakeId));
      }
    });
  };

  const handleDeletePayment = (workerId: string, paymentId: string) => {
    setConfirmDeleteState({
      isOpen: true,
      title: "حذف دفعة مالية 💵",
      message: "هل أنت متأكد من حذف هذه الدفعة المالية؟ سيتم تحديث كشف الحساب والماليات تلقائياً.",
      onConfirm: () => {
        setWorkers(workers.map(w => {
          if (w.id === workerId) {
            const updatedPayments = (w.payments || []).filter(p => p.id !== paymentId);
            const nextPaid = updatedPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
            return {
              ...w,
              payments: updatedPayments,
              totalPaid: nextPaid,
              remainingBalance: w.totalOwed - nextPaid
            };
          }
          return w;
        }));
      }
    });
  };

  // Filtering logs
  const filteredIntakes = productionIntakes;

  // Tab filtered items
  const cuttingIntakes = useMemo(() => {
    let list = productionIntakes.filter(i => i.type === 'cutting');
    
    if (cuttingWorkerFilter && cuttingWorkerFilter !== 'all') {
      list = list.filter(i => i.workerId === cuttingWorkerFilter);
    }

    if (cuttingSearchQuery.trim() !== '') {
      const q = cuttingSearchQuery.toLowerCase();
      list = list.filter(i => 
        (i.productName && i.productName.toLowerCase().includes(q)) ||
        (i.workerName && i.workerName.toLowerCase().includes(q)) ||
        (i.receiptId && i.receiptId.toLowerCase().includes(q))
      );
    }

    if (cuttingStartDate) {
      list = list.filter(i => i.date >= cuttingStartDate);
    }
    if (cuttingEndDate) {
      list = list.filter(i => i.date <= cuttingEndDate);
    }
    return list;
  }, [productionIntakes, cuttingSearchQuery, cuttingStartDate, cuttingEndDate, cuttingWorkerFilter]);

  const sewingIntakes = useMemo(() => {
    let list = productionIntakes.filter(i => i.type === 'sewing' || !i.type);
    
    if (sewingWorkerFilter && sewingWorkerFilter !== 'all') {
      list = list.filter(i => i.workerId === sewingWorkerFilter);
    }

    if (sewingSearchQuery.trim() !== '') {
      const q = sewingSearchQuery.toLowerCase();
      list = list.filter(i => 
        (i.productName && i.productName.toLowerCase().includes(q)) ||
        (i.workerName && i.workerName.toLowerCase().includes(q)) ||
        (i.receiptId && i.receiptId.toLowerCase().includes(q))
      );
    }

    if (sewingStartDate) {
      list = list.filter(i => i.date >= sewingStartDate);
    }
    if (sewingEndDate) {
      list = list.filter(i => i.date <= sewingEndDate);
    }
    return list;
  }, [productionIntakes, sewingSearchQuery, sewingStartDate, sewingEndDate, sewingWorkerFilter]);

  const packagingIntakes = useMemo(() => {
    let list = productionIntakes.filter(i => i.type === 'packaging');
    
    if (packagingWorkerFilter && packagingWorkerFilter !== 'all') {
      list = list.filter(i => i.workerId === packagingWorkerFilter);
    }

    if (packagingSearchQuery.trim() !== '') {
      const q = packagingSearchQuery.toLowerCase();
      list = list.filter(i => 
        (i.productName && i.productName.toLowerCase().includes(q)) ||
        (i.workerName && i.workerName.toLowerCase().includes(q)) ||
        (i.receiptId && i.receiptId.toLowerCase().includes(q))
      );
    }

    if (packagingStartDate) {
      list = list.filter(i => i.date >= packagingStartDate);
    }
    if (packagingEndDate) {
      list = list.filter(i => i.date <= packagingEndDate);
    }
    return list;
  }, [productionIntakes, packagingSearchQuery, packagingStartDate, packagingEndDate, packagingWorkerFilter]);

  const enrichedWorkers = useMemo(() => {
    return workers.map(w => {
      let list = productionIntakes.filter(i => i.workerId === w.id);
      let payments = w.payments || [];

      if (accountsStartDate) {
        list = list.filter(i => i.date >= accountsStartDate);
        payments = payments.filter(p => {
          const pDate = p.date ? p.date.split('T')[0] : '';
          return pDate >= accountsStartDate;
        });
      }
      if (accountsEndDate) {
        list = list.filter(i => i.date <= accountsEndDate);
        payments = payments.filter(p => {
          const pDate = p.date ? p.date.split('T')[0] : '';
          return pDate <= accountsEndDate;
        });
      }

      const totalOwed = list.reduce((sum, i) => sum + (i.totalCost || 0), 0);
      const totalPaid = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
      const remainingBalance = totalOwed - totalPaid;
      const totalFinishedItems = list.reduce((sum, i) => sum + (i.quantity || 0), 0);
      return {
        ...w,
        totalOwed,
        totalPaid,
        remainingBalance,
        totalFinishedItems
      };
    });
  }, [workers, productionIntakes, accountsStartDate, accountsEndDate]);

  const displayedWorkers = useMemo(() => {
    let list = enrichedWorkers;
    if (accountsWorkerFilter && accountsWorkerFilter !== 'all') {
      list = list.filter(w => w.id === accountsWorkerFilter);
    }
    if (accountsSearchQuery.trim() !== '') {
      const q = accountsSearchQuery.toLowerCase();
      list = list.filter(w => w.name.toLowerCase().includes(q));
    }
    return list;
  }, [enrichedWorkers, accountsWorkerFilter, accountsSearchQuery]);

  // Dashboard Stats
  const statsSummary = useMemo(() => {
    const totalIntakeCount = filteredIntakes.length;
    
    const cutPieces = filteredIntakes
      .filter(i => i.type === 'cutting')
      .reduce((sum, i) => sum + i.quantity, 0);

    const sewPieces = filteredIntakes
      .filter(i => i.type === 'sewing' || !i.type)
      .reduce((sum, i) => sum + i.quantity, 0);

    const pkgPieces = filteredIntakes
      .filter(i => i.type === 'packaging')
      .reduce((sum, i) => sum + i.quantity, 0);

    const totalActiveOwed = enrichedWorkers.reduce((sum, w) => sum + (w.remainingBalance > 0 ? w.remainingBalance : 0), 0);

    return {
      totalIntakeCount,
      cutPieces,
      sewPieces,
      pkgPieces,
      totalActiveOwed
    };
  }, [filteredIntakes, enrichedWorkers]);

  const selectedWorker = useMemo(() => enrichedWorkers.find(w => w.id === selectedWorkerId), [enrichedWorkers, selectedWorkerId]);
  
  const workerIntakes = useMemo(() => 
    selectedWorkerId ? productionIntakes.filter(i => i.workerId === selectedWorkerId) : []
  , [productionIntakes, selectedWorkerId]);

  // Aggregate production intakes by variant to group the cutting and sewing stages into unified pieces
  const producedPieces = useMemo(() => {
    const piecesMap: Record<string, {
      variantId: string;
      productId: string;
      productName: string;
      productCode: string;
      color: string;
      size: string;
      cutQty: number;
      cutWorkers: string[];
      sewQty: number;
      sewWorkers: string[];
      pkgQty: number;
      pkgWorkers: string[];
    }> = {};

    productionIntakes.forEach(intake => {
      // We only care about entries that are linked to products and variants
      if (!intake.productId || !intake.variantId) return;
      
      const key = `${intake.productId}-${intake.variantId}`;
      if (!piecesMap[key]) {
        const prod = products.find(p => p.id === intake.productId);
        piecesMap[key] = {
          variantId: intake.variantId,
          productId: intake.productId,
          productName: intake.productName || prod?.name || 'موديل غير معروف',
          productCode: prod?.code || '',
          color: intake.color || 'عام',
          size: intake.size || 'عام',
          cutQty: 0,
          cutWorkers: [],
          sewQty: 0,
          sewWorkers: [],
          pkgQty: 0,
          pkgWorkers: []
        };
      }

      const item = piecesMap[key];
      if (intake.type === 'cutting') {
        item.cutQty += intake.quantity;
        if (intake.workerName && !item.cutWorkers.includes(intake.workerName)) {
          item.cutWorkers.push(intake.workerName);
        }
      } else if (intake.type === 'sewing' || !intake.type) {
        item.sewQty += intake.quantity;
        if (intake.workerName && !item.sewWorkers.includes(intake.workerName)) {
          item.sewWorkers.push(intake.workerName);
        }
      } else if (intake.type === 'packaging') {
        item.pkgQty += intake.quantity;
        if (intake.workerName && !item.pkgWorkers.includes(intake.workerName)) {
          item.pkgWorkers.push(intake.workerName);
        }
      }
    });

    return Object.values(piecesMap);
  }, [productionIntakes, products]);

  const handleCreateWorker = (e: React.FormEvent) => {
    e.preventDefault();
    const worker: Worker = {
      id: `WRK-${Date.now()}`,
      name: newWorker.name || '',
      phone: newWorker.phone || '',
      role: newWorker.role || 'cutting',
      totalFinishedItems: 0,
      totalOwed: 0,
      totalPaid: 0,
      remainingBalance: 0,
      payments: []
    };
    setWorkers([...workers, worker]);
    setIsWorkerModalOpen(false);
    setNewWorker({ name: '', phone: '', role: 'cutting' });
  };

  const handleAddIntakeItem = (type: 'cutting' | 'sewing' = 'sewing') => {
    setIntakeItems([...intakeItems, { productId: '', variantId: '', quantity: 0, costPerItem: 0, type }]);
  };

  const handleRemoveIntakeItem = (idx: number) => {
    setIntakeItems(intakeItems.filter((_, i) => i !== idx));
  };

  const handleRegisterIntake = (e: React.FormEvent) => {
    e.preventDefault();
    if (!intakeWorkerId || intakeItems.length === 0) return;

    const worker = workers.find(w => w.id === intakeWorkerId);
    if (!worker) return;

    const receiptId = `RCPT-${Date.now()}`;
    const newIntakes: ProductionIntake[] = [];
    let totalReceiptCost = 0;
    let totalPieces = 0;

    const updatedProducts = [...products];
    const updatedMovements = [...inventoryMovements];

    intakeItems.forEach(item => {
      const product = updatedProducts.find(p => p.id === item.productId);
      const variant = product?.variants.find(v => v.id === item.variantId);
      
      if (product && variant) {
        const itemCost = item.quantity * item.costPerItem;
        totalReceiptCost += itemCost;
        totalPieces += item.quantity;

        const intake: ProductionIntake = {
          id: `INTK-${Date.now()}-${Math.random()}`,
          receiptId,
          workerId: worker.id,
          workerName: worker.name,
          date: intakeDate,
          productId: product.id,
          productName: product.name,
          variantId: variant.id,
          color: variant.color,
          size: variant.size,
          quantity: item.quantity,
          costPerItem: item.costPerItem,
          totalCost: itemCost,
          type: item.type // 'cutting' or 'sewing'
        };
        newIntakes.push(intake);

        // Update Inventory in local copy (increase stock with supplies received)
        const pIdx = updatedProducts.findIndex(p => p.id === product.id);
        const vIdx = updatedProducts[pIdx].variants.findIndex(v => v.id === variant.id);
        updatedProducts[pIdx].variants[vIdx].quantity += item.quantity;

        // Add Movement
        updatedMovements.unshift({
          id: `MOV-${Date.now()}-${Math.random()}`,
          productId: product.id,
          productName: product.name,
          variantId: variant.id,
          color: variant.color,
          size: variant.size,
          type: 'in',
          quantity: item.quantity,
          notes: `استلام إنتاج (${item.type === 'cutting' ? 'قص' : 'تقفيل'}) - إيصال ${receiptId}`,
          date: new Date().toISOString(),
          refId: intake.id
        });
      }
    });

    setProductionIntakes([...newIntakes, ...productionIntakes]);
    setProducts(updatedProducts);
    setInventoryMovements(updatedMovements);

    // Update Worker balance
    setWorkers(workers.map(w => {
      if (w.id === worker.id) {
        const newTotalOwed = w.totalOwed + totalReceiptCost;
        const newTotalFinished = w.totalFinishedItems + totalPieces;
        return {
          ...w,
          totalOwed: newTotalOwed,
          totalFinishedItems: newTotalFinished,
          remainingBalance: newTotalOwed - w.totalPaid
        };
      }
      return w;
    }));

    setIsIntakeModalOpen(false);
    setIntakeWorkerId('');
    setIntakeItems([]);
  };

  // Register Packaging Day Work
  const handleRegisterPackaging = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pkgWorkerId || pkgQuantity <= 0) return;

    const worker = workers.find(w => w.id === pkgWorkerId);
    if (!worker) return;

    const totalCost = pkgQuantity * pkgCostPerItem;
    const receiptId = `PKG-${Date.now()}`;
    
    // Create Intake Record (packaging) WITHOUT productId, variantId, color, size
    const intake: ProductionIntake = {
      id: `INTK-${Date.now()}-${Math.random()}`,
      receiptId,
      workerId: worker.id,
      workerName: worker.name,
      date: pkgDate,
      productId: '',
      productName: 'تغليف عام',
      variantId: '',
      color: 'غير محدد',
      size: 'عام',
      quantity: pkgQuantity,
      costPerItem: pkgCostPerItem,
      totalCost: totalCost,
      type: 'packaging'
    };

    // Update Worker Ledger
    const updatedWorkers = workers.map(w => {
      if (w.id === worker.id) {
        const nextOwed = (w.totalOwed || 0) + totalCost;
        const nextFinished = (w.totalFinishedItems || 0) + pkgQuantity;
        return {
          ...w,
          totalOwed: nextOwed,
          totalFinishedItems: nextFinished,
          remainingBalance: nextOwed - w.totalPaid
        };
      }
      return w;
    });

    setProductionIntakes([intake, ...productionIntakes]);
    setWorkers(updatedWorkers);

    setIsIntakeModalOpen(false);
    setIsPackagingModalOpen(false);
    setPkgWorkerId('');
    setPkgQuantity(0);
    setPkgCostPerItem(0);
  };

  const handlePayWorker = (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingWorkerId || paymentAmount <= 0) return;

    setWorkers(workers.map(w => {
      if (w.id === payingWorkerId) {
        const payment: WorkerPayment = {
          id: `PAY-${Date.now()}`,
          workerId: w.id,
          amount: paymentAmount,
          date: new Date().toISOString(),
          note: paymentNote
        };
        const newTotalPaid = w.totalPaid + paymentAmount;
        return {
          ...w,
          totalPaid: newTotalPaid,
          remainingBalance: w.totalOwed - newTotalPaid,
          payments: [payment, ...(w.payments || [])]
        };
      }
      return w;
    }));

    setIsPaymentModalOpen(false);
    setPaymentAmount(0);
    setPaymentNote('');
  };

  const handleUpdateIntakePaidAmount = (intakeId: string, amountToPay: number) => {
    if (amountToPay <= 0) return;
    
    // Find intake
    const intake = productionIntakes.find(i => i.id === intakeId);
    if (!intake) return;

    // 1. Update intake record
    const updatedIntakes = productionIntakes.map(item => {
      if (item.id === intakeId) {
        const currentPaid = item.paidAmount || 0;
        const updatedPaid = Math.min(item.totalCost, currentPaid + amountToPay);
        return {
          ...item,
          paidAmount: updatedPaid
        };
      }
      return item;
    });
    setProductionIntakes(updatedIntakes);

    // 2. Add payment transaction to worker payments and update worker totalPaid & remainingBalance
    const updatedWorkers = workers.map(w => {
      if (w.id === intake.workerId) {
        const payment: WorkerPayment = {
          id: `PAY-${Date.now()}`,
          workerId: w.id,
          amount: amountToPay,
          date: new Date().toISOString(),
          note: `سداد قيمة تشغيل: ${intake.productName} (${intake.color}/${intake.size}) - ${intake.type === 'cutting' ? 'قص' : intake.type === 'packaging' ? 'تغليف' : 'تقفيل'}`
        };
        const newTotalPaid = (w.totalPaid || 0) + amountToPay;
        return {
          ...w,
          totalPaid: newTotalPaid,
          remainingBalance: (w.totalOwed || 0) - newTotalPaid,
          payments: [payment, ...(w.payments || [])]
        };
      }
      return w;
    });
    setWorkers(updatedWorkers);

    setEditingIntakeId(null);
    setNewStagePaidAmount(0);
  };

  const handleUpdateStatus = (variantId: string, delta: number) => {
    const prev = productionStatuses[variantId] || { shipped: 0, history: [] };
    const newShipped = Math.max(0, Math.min(prev.shipped + delta, 9999));
    if (newShipped === prev.shipped) return;
    const updated = {
      ...productionStatuses,
      [variantId]: {
        shipped: newShipped,
        history: [{ date: new Date().toISOString(), amount: delta }, ...prev.history].slice(0, 50)
      }
    };
    setProductionStatuses(updated);
    localStorage.setItem('kidzy_production_statuses', JSON.stringify(updated));
  };

  const handleUndoStatus = (variantId: string) => {
    const prev = productionStatuses[variantId];
    if (!prev || prev.history.length === 0) return;
    const lastEntry = prev.history[0];
    const revertedShipped = Math.max(0, prev.shipped - lastEntry.amount);
    const updated = {
      ...productionStatuses,
      [variantId]: {
        shipped: revertedShipped,
        history: prev.history.slice(1)
      }
    };
    setProductionStatuses(updated);
    localStorage.setItem('kidzy_production_statuses', JSON.stringify(updated));
  };

  const handleResetStatus = (variantId: string) => {
    const prev = productionStatuses[variantId];
    if (!prev || prev.shipped === 0) return;
    const resetHistory = prev.shipped > 0
      ? [{ date: new Date().toISOString(), amount: -prev.shipped }, ...prev.history]
      : prev.history;
    const updated = {
      ...productionStatuses,
      [variantId]: {
        shipped: 0,
        history: resetHistory.slice(0, 50)
      }
    };
    setProductionStatuses(updated);
    localStorage.setItem('kidzy_production_statuses', JSON.stringify(updated));
  };

  const getPaymentStatus = (worker: Worker) => {
    if (worker.remainingBalance <= 0) return { label: 'مدفوع بالكامل', color: 'text-emerald-600 bg-emerald-50' };
    if (worker.totalPaid === 0) return { label: 'غير مدفوع', color: 'text-red-600 bg-red-50' };
    return { label: 'مدفوع جزئي', color: 'text-amber-600 bg-amber-50' };
  };

  const renderEditModals = () => {
    return (
      <>
        {/* Edit Worker Modal */}
        {isEditWorkerModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-sm rounded-[32px] overflow-hidden shadow-2xl text-right">
              <div className="p-6 bg-slate-50 border-b border-slate-100 flex justify-between items-center text-right">
                <h3 className="text-lg font-black text-slate-800">تعديل بيانات ورشة / عامل ✏️</h3>
                <button onClick={() => { setIsEditWorkerModalOpen(false); setEditingWorker(null); }} className="text-slate-400 font-bold hover:text-slate-600 p-1">✕</button>
              </div>
              <form onSubmit={handleUpdateWorker} className="p-6 space-y-4 text-right">
                <div className="space-y-1 text-right">
                  <label className="text-[10px] font-black text-slate-400 uppercase block text-right">اسم المصنع أو العامل القائم بالعمل</label>
                  <input 
                    required
                    className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm font-bold text-right outline-none"
                    value={editWorkerName}
                    onChange={e => setEditWorkerName(e.target.value)}
                  />
                </div>
                <div className="space-y-1 text-right">
                  <label className="text-[10px] font-black text-slate-400 uppercase block text-right">رقم الهاتف / التواصل</label>
                  <input 
                    type="text"
                    className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm font-bold text-right outline-none"
                    value={editWorkerPhone}
                    onChange={e => setEditWorkerPhone(e.target.value)}
                  />
                </div>
                <div className="space-y-1 text-right">
                  <label className="text-[10px] font-black text-slate-400 uppercase block text-right">الدور / المرحلة الأساسية</label>
                  <select
                    required
                    className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm font-bold text-right outline-none"
                    value={editWorkerRole}
                    onChange={e => setEditWorkerRole(e.target.value as 'cutting' | 'sewing' | 'packaging')}
                  >
                    <option value="cutting">🧵 قص</option>
                    <option value="sewing">🪡 تقفيل / خياطة</option>
                    <option value="packaging">📦 تغليف</option>
                  </select>
                </div>
                <button type="submit" className="w-full bg-blue-600 text-white font-black py-4 rounded-xl shadow-md hover:bg-blue-700 transition-all mt-4">
                  حفظ التغييرات
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Edit Intake Modal */}
        {isEditIntakeModalOpen && editingIntake && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-sm rounded-[32px] overflow-hidden shadow-2xl text-right">
              <div className="p-6 bg-slate-50 border-b border-slate-100 flex justify-between items-center text-right">
                <h3 className="text-lg font-black text-slate-800">تعديل سجل الإنتاج 🛠️</h3>
                <button onClick={() => { setIsEditIntakeModalOpen(false); setEditingIntake(null); }} className="text-slate-400 font-bold hover:text-slate-600 p-1">✕</button>
              </div>
              <form onSubmit={handleUpdateIntake} className="p-6 space-y-4 text-right">
                <div className="bg-slate-50 p-3 rounded-2xl text-xs font-bold text-slate-500 mb-2 text-right">
                  <p>المنتج: <span className="text-slate-800 font-black">{editingIntake.productName}</span></p>
                  <p>المتفرع: <span className="text-slate-800 font-black">{editingIntake.color} / {editingIntake.size}</span></p>
                  <p>المرحلة: <span className="text-blue-600 font-black">{editingIntake.type === 'cutting' ? 'قص' : editingIntake.type === 'packaging' ? 'تغليف' : 'تقفيل'}</span></p>
                </div>

                <div className="space-y-1 text-right">
                  <label className="text-[10px] font-black text-slate-400 uppercase block">التاريخ واليومية</label>
                  <input 
                    type="date"
                    required
                    className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm font-bold text-right outline-none"
                    value={editIntakeDate}
                    onChange={e => setEditIntakeDate(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1 text-right">
                    <label className="text-[10px] font-black text-slate-400">الكمية المسلمة</label>
                    <input 
                      type="number"
                      required
                      className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm font-black font-sans text-right outline-none"
                      value={editIntakeQuantity || ''}
                      onFocus={e => e.target.select()}
                      onChange={e => setEditIntakeQuantity(parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <div className="space-y-1 text-right">
                    <label className="text-[10px] font-black text-slate-400">سعر القطعة (ج.م)</label>
                    <input 
                      type="number"
                      required
                      className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm font-black font-sans text-right outline-none"
                      value={editIntakeCostPerItem || ''}
                      onFocus={e => e.target.select()}
                      onChange={e => setEditIntakeCostPerItem(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                </div>

                <div className="bg-blue-50/50 p-2.5 rounded-xl text-center text-xs font-black text-blue-700">
                  التكلفة الإجمالية الجديدة: {(editIntakeQuantity * editIntakeCostPerItem).toLocaleString()} ج.م
                </div>

                <button type="submit" className="w-full bg-blue-600 text-white font-black py-4 rounded-xl shadow-md hover:bg-blue-700 transition-all mt-4">
                  تأكيد وحفظ التعديلات
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Custom Confirmation Modal */}
        {confirmDeleteState.isOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[250] flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-sm rounded-[32px] overflow-hidden shadow-2xl text-right animate-in zoom-in-95 duration-200">
              <div className="p-6 bg-red-50 border-b border-red-100 flex justify-between items-center flex-row-reverse text-right">
                <h3 className="text-lg font-black text-red-800">{confirmDeleteState.title}</h3>
                <button 
                  onClick={() => setConfirmDeleteState(prev => ({ ...prev, isOpen: false }))} 
                  className="text-red-400 font-bold hover:text-red-600 p-1"
                >
                  ✕
                </button>
              </div>
              <div className="p-6 space-y-4 text-right">
                <p className="text-sm font-bold text-slate-600 leading-relaxed text-right">
                  {confirmDeleteState.message}
                </p>
                <div className="flex gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      confirmDeleteState.onConfirm();
                      setConfirmDeleteState(prev => ({ ...prev, isOpen: false }));
                    }}
                    className="w-1/2 bg-red-600 text-white font-black py-3 rounded-2xl shadow-xl shadow-red-100 hover:bg-red-700 transition-all text-sm"
                  >
                    نعم، تأكيد الحذف
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteState(prev => ({ ...prev, isOpen: false }))}
                    className="w-1/2 bg-slate-100 text-slate-600 font-black py-3 rounded-2xl hover:bg-slate-200 transition-all text-sm"
                  >
                    إلغاء
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </>
    );
  };

  // Profile View
  if (selectedWorkerId && selectedWorker) {
    return (
      <div className="space-y-6 pb-20">
        <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <div className="text-right">
              <h2 className="text-2xl font-black text-slate-800">{selectedWorker.name}</h2>
              <p className="text-slate-400 font-bold text-sm">حسابات وسجل الورشة المالي</p>
            </div>
            <button 
              onClick={() => setSelectedWorkerId(null)}
              className="p-2 hover:bg-slate-50 rounded-full transition-all text-slate-400"
            >
              <ChevronLeft size={24} />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="bg-slate-50 p-4 rounded-3xl text-center">
              <p className="text-[10px] text-slate-400 font-black uppercase mb-1">إجمالي المستحقات</p>
              <p className="text-lg font-black text-slate-800">{(selectedWorker.totalOwed || 0).toLocaleString()} <span className="text-[10px]">ج.م</span></p>
            </div>
            <div className="bg-slate-50 p-4 rounded-3xl text-center">
              <p className="text-[10px] text-slate-400 font-black uppercase mb-1">إجمالي المدفوع</p>
              <p className="text-lg font-black text-slate-800">{(selectedWorker.totalPaid || 0).toLocaleString()} <span className="text-[10px]">ج.م</span></p>
            </div>
            <div className="bg-blue-50 p-4 rounded-3xl text-center">
              <p className="text-[10px] text-blue-400 font-black uppercase mb-1">المتبقي له</p>
              <p className={`text-lg font-black ${selectedWorker.remainingBalance > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                {Math.abs(selectedWorker.remainingBalance || 0).toLocaleString()} <span className="text-[10px]">ج.م</span>
              </p>
            </div>
          </div>

          <div className="flex gap-3">
             <button 
                onClick={() => { 
                  setPayingWorkerId(selectedWorker.id); 
                  setPaymentNote('دفعة تحت الحساب / سلفة مقدمة');
                  setPaymentAmount(0);
                  setIsPaymentModalOpen(true); 
                }}
                className="w-full bg-emerald-600 text-white font-black py-4 rounded-2xl shadow-lg shadow-emerald-100 flex items-center justify-center gap-2"
             >
                <DollarSign size={20} />
                تسجيل دفعة تحت الحساب / سلفة
             </button>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="font-black text-slate-800 text-lg flex items-center gap-2 text-right justify-end">
            سجل العمليات والدفعات
            <History size={20} className="text-slate-400" />
          </h3>
          
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
             <div className="divide-y divide-slate-50">
                <div className="p-4 bg-slate-50/50">
                  <p className="text-xs font-black text-slate-400 mb-4 text-right">آخر مراحل التشغيل المُسجلة</p>
                  <div className="space-y-3">
                    {workerIntakes.length === 0 ? (
                      <p className="text-center text-xs text-slate-400 py-4">لا يوجد إنتاج مستلم بعد لهذا العامل</p>
                    ) : (
                      workerIntakes.slice(0, 15).map(intake => {
                        const paid = intake.paidAmount || 0;
                        const remaining = (intake.totalCost || 0) - paid;
                        const isFullyPaid = paid >= (intake.totalCost || 0);
                        
                        return (
                          <div key={intake.id} className="bg-white p-4 rounded-2xl border border-slate-100 space-y-3 text-right shadow-sm relative group">
                            {/* Edit/Delete overlays for this specific intake stage log */}
                            <div className="absolute top-2 left-2 flex gap-1 bg-white/95 p-1.5 rounded-xl shadow-md border border-slate-100 z-30">
                              <button 
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenEditIntake(intake);
                                }}
                                className="p-1 hover:text-blue-600 hover:bg-slate-50 text-slate-400 rounded transition-all cursor-pointer"
                                title="تعديل تفاصيل المرحلة"
                              >
                                <Edit size={13} />
                              </button>
                              <button 
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteIntake(intake.id);
                                }}
                                className="p-1 hover:text-red-600 hover:bg-slate-50 text-slate-400 rounded transition-all cursor-pointer"
                                title="حذف المرحلة بالكامل"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>

                            <div className="flex justify-between items-center gap-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-slate-50 text-slate-500 rounded-lg flex items-center justify-center shrink-0">
                                  <Package size={16} />
                                </div>
                                <div className="text-right">
                                  <p className="text-xs font-black text-slate-800">{intake.productName} ({intake.color} / {intake.size})</p>
                                  <div className="flex items-center gap-1.5 mt-1">
                                    <span className={`text-[9.5px] px-2 py-0.5 rounded-md font-bold ${
                                      intake.type === 'cutting' ? 'bg-orange-50 text-orange-600 border border-orange-100' :
                                      intake.type === 'packaging' ? 'bg-purple-50 text-purple-600 border border-purple-100' :
                                      'bg-blue-50 text-blue-600 border border-blue-100'
                                    }`}>
                                      {intake.type === 'cutting' ? 'قص 🧵' : intake.type === 'packaging' ? 'تغليف 📦' : 'تقفيل 🪡'}
                                    </span>
                                    <span className="text-[10px] text-slate-400 font-mono font-bold">{new Date(intake.date).toLocaleDateString('ar-EG')}</span>
                                  </div>
                                </div>
                              </div>
                              <div className="text-left font-bold text-xs shrink-0 pl-14">
                                <p className="text-slate-800">{intake.quantity} قطعة</p>
                                <p className="text-[10px] text-slate-400 font-mono">بسعر {intake.costPerItem} ج.م</p>
                              </div>
                            </div>
                            
                            {/* Financial Summary and Paying for this stage */}
                            <div className="bg-slate-50/50 p-2.5 rounded-xl flex justify-between items-center text-xs font-bold gap-2">
                              <div className="text-center">
                                <p className="text-[9px] text-slate-400 mb-0.5">التكلفة</p>
                                <p className="text-slate-800 font-black">{((intake.totalCost || 0)).toLocaleString()} ج.م</p>
                              </div>
                              <div className="text-center">
                                <p className="text-[9px] text-slate-400 mb-0.5">المسدد لها</p>
                                <p className="text-emerald-600 font-black">{(paid).toLocaleString()} ج.م</p>
                              </div>
                              <div className="text-center">
                                <p className="text-[9px] text-slate-400 mb-0.5">المتبقي</p>
                                <p className="text-red-500 font-black">{(remaining).toLocaleString()} ج.م</p>
                              </div>
                              
                              <div className="mr-auto">
                                {editingIntakeId === intake.id ? (
                                  <div className="flex items-center gap-1 justify-end">
                                    <input
                                      type="number"
                                      value={newStagePaidAmount || ''}
                                      placeholder="مبلغ..."
                                      onFocus={e => e.target.select()}
                                      onChange={(e) => setNewStagePaidAmount(Number(e.target.value))}
                                      className="w-16 p-1 text-center border border-indigo-200 rounded-lg text-xs font-sans font-bold bg-white outline-none"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => {
                                        handleUpdateIntakePaidAmount(intake.id, newStagePaidAmount);
                                        setEditingIntakeId(null);
                                        setNewStagePaidAmount(0);
                                      }}
                                      className="bg-emerald-600 text-white p-1 rounded-lg hover:bg-emerald-700 transition"
                                      title="حفظ السداد"
                                    >
                                      ✓
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => { setEditingIntakeId(null); setNewStagePaidAmount(0); }}
                                      className="bg-slate-200 text-slate-500 p-1 rounded-lg hover:bg-slate-300"
                                    >
                                      ✕
                                    </button>
                                  </div>
                                ) : (
                                  <div>
                                    {isFullyPaid ? (
                                      <span className="text-[9px] bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-md border border-emerald-100 font-black">✓ كاملة</span>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setEditingIntakeId(intake.id);
                                          setNewStagePaidAmount(remaining);
                                        }}
                                        className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-2.5 py-1 text-[10px] rounded-lg transition font-black"
                                      >
                                        دفع للمرحلة
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                <div className="p-4">
                  <p className="text-xs font-black text-slate-400 mb-4 text-right">المدفوعات المالية المستلمة</p>
                  <div className="space-y-3">
                    {(selectedWorker.payments || []).length === 0 ? (
                      <p className="text-center text-xs text-slate-400 py-4">لا يوجد دفعات مسجلة بعد</p>
                    ) : (
                      (selectedWorker.payments || []).map(pay => (
                        <div key={pay.id} className="bg-emerald-50/30 p-3 rounded-2xl border border-emerald-100 flex justify-between items-center text-right group">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center shrink-0">
                              <DollarSign size={16} />
                            </div>
                            <div className="text-right">
                              <p className="text-xs font-black text-emerald-600">تسليم دفعة نقدية ({pay.amount.toLocaleString()} ج.م)</p>
                              <p className="text-[9px] text-slate-400 font-bold">{new Date(pay.date).toLocaleDateString('ar-EG')} • {pay.note || 'بدون ملاحظات إضافية'}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 text-left shrink-0 z-10">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeletePayment(selectedWorker.id, pay.id);
                              }}
                              className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition cursor-pointer z-20"
                              title="حذف الدفعة"
                            >
                              <Trash2 size={14} />
                            </button>
                            <CheckCircle2 size={16} className="text-emerald-500" />
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
             </div>
          </div>
        </div>

        {/* Unified Modals */}
        <Modals 
          isIntakeModalOpen={isIntakeModalOpen} setIsIntakeModalOpen={setIsIntakeModalOpen}
          isPaymentModalOpen={isPaymentModalOpen} setIsPaymentModalOpen={setIsPaymentModalOpen}
          isWorkerModalOpen={isWorkerModalOpen} setIsWorkerModalOpen={setIsWorkerModalOpen}
          isPackagingModalOpen={isPackagingModalOpen} setIsPackagingModalOpen={setIsPackagingModalOpen}
          selectedStage={selectedStage} setSelectedStage={setSelectedStage}
          intakeWorkerId={intakeWorkerId} setIntakeWorkerId={setIntakeWorkerId}
          intakeDate={intakeDate} setIntakeDate={setIntakeDate}
          intakeItems={intakeItems} setIntakeItems={setIntakeItems}
          handleAddIntakeItem={handleAddIntakeItem} handleRemoveIntakeItem={handleRemoveIntakeItem}
          handleRegisterIntake={handleRegisterIntake}
          handlePayWorker={handlePayWorker}
          paymentAmount={paymentAmount} setPaymentAmount={setPaymentAmount}
          paymentNote={paymentNote} setPaymentNote={setPaymentNote}
          payingWorkerId={payingWorkerId} setPayingWorkerId={setPayingWorkerId}
          workers={workers} products={products} productionIntakes={productionIntakes}
          newWorker={newWorker} setNewWorker={setNewWorker}
          handleCreateWorker={handleCreateWorker}
          pkgWorkerId={pkgWorkerId} setPkgWorkerId={setPkgWorkerId}
          pkgDate={pkgDate} setPkgDate={setPkgDate}
          pkgQuantity={pkgQuantity} setPkgQuantity={setPkgQuantity}
          pkgCostPerItem={pkgCostPerItem} setPkgCostPerItem={setPkgCostPerItem}
          handleRegisterPackaging={handleRegisterPackaging}
        />
        {renderEditModals()}
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 text-right" dir="rtl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="text-right">
          <h2 className="text-2xl font-black text-slate-800">الإنتاج والورش</h2>
          <p className="text-slate-500 font-bold mt-1 text-sm">متابعة دقيقة لمراحل (القص، التقفيل، التغليف) مع الحسابات</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <button 
            onClick={() => setIsWorkerModalOpen(true)}
            className="flex-1 md:flex-none border-2 border-blue-600/10 bg-white text-blue-600 px-5 py-2.5 rounded-2xl flex items-center justify-center gap-2 font-black transition-all"
          >
            <UserCheck size={18} />
            <span>عامل/ورشة جديد</span>
          </button>
          
          <button 
            onClick={() => { 
                setSelectedStage((activeTab === 'cutting' || activeTab === 'sewing' || activeTab === 'packaging') ? activeTab : 'cutting');
                setIntakeWorkerId(''); 
                setIntakeItems([{ productId: '', variantId: '', quantity: 0, costPerItem: 0, type: activeTab === 'sewing' ? 'sewing' : 'cutting' }]);
                // Reset packaging states too:
                setPkgWorkerId('');
                setPkgDate(new Date().toISOString().split('T')[0]);
                setPkgQuantity(0);
                setPkgCostPerItem(0);
                setIsIntakeModalOpen(true); 
            }}
            className="flex-1 md:flex-none bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-2xl flex items-center justify-center gap-2 font-black transition-all shadow-lg shadow-blue-100"
          >
            <ArrowDownCircle size={18} />
            <span>تسجيل مرحلة</span>
          </button>
        </div>
      </div>

      {/* Internal Subtabs Menu */}
      <div className="flex flex-wrap bg-slate-100 p-1 rounded-3xl gap-1">
        <button 
          onClick={() => setActiveTab('production')}
          className={`flex-1 min-w-[120px] py-3 text-xs md:text-sm font-black rounded-2xl transition-all ${activeTab === 'production' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
        >
          📦 المخزون
        </button>
        <button 
          onClick={() => setActiveTab('accounts')}
          className={`flex-1 min-w-[120px] py-3 text-xs md:text-sm font-black rounded-2xl transition-all ${activeTab === 'accounts' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
        >
          💰 حسابات العمال
        </button>
        <button 
          onClick={() => setActiveTab('cutting')}
          className={`flex-1 min-w-[100px] py-3 text-xs md:text-sm font-black rounded-2xl transition-all ${activeTab === 'cutting' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
        >
          🧵 مرحلة القص
        </button>
        <button 
          onClick={() => setActiveTab('sewing')}
          className={`flex-1 min-w-[100px] py-3 text-xs md:text-sm font-black rounded-2xl transition-all ${activeTab === 'sewing' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
        >
          🪡 مرحلة التقفيل
        </button>
        <button 
          onClick={() => setActiveTab('packaging')}
          className={`flex-1 min-w-[100px] py-3 text-xs md:text-sm font-black rounded-2xl transition-all ${activeTab === 'packaging' ? 'bg-white text-purple-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
        >
          📦 مرحلة التغليف
        </button>
      </div>

      {/* Quick Counters Dashboard info */}
      <div className="bg-white p-4 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
         <div className="text-right">
           <span className="text-xs text-slate-400 font-bold">ملخص إجمالي نشاط الورش من العمليات المسجلة</span>
         </div>
         <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto">
            <div className="bg-slate-50 px-4 py-2.5 rounded-2xl border border-slate-100 flex items-center gap-4 whitespace-nowrap w-full md:w-auto justify-between">
              <div className="text-right">
                <p className="text-[9px] text-slate-400 font-black uppercase">إجمالي مسموح القص</p>
                <p className="text-xs font-black text-orange-600">{statsSummary.cutPieces} قطعة</p>
              </div>
              <div className="w-px h-5 bg-slate-200"></div>
              <div className="text-right">
                <p className="text-[9px] text-slate-400 font-black uppercase">إجمالي التقفيل</p>
                <p className="text-xs font-black text-blue-600">{statsSummary.sewPieces} قطعة</p>
              </div>
              <div className="w-px h-5 bg-slate-200"></div>
              <div className="text-right">
                <p className="text-[9px] text-slate-400 font-black uppercase">إجمالي المغلف</p>
                <p className="text-xs font-black text-purple-600">{statsSummary.pkgPieces} قطعة</p>
              </div>
            </div>
         </div>
      </div>

      {activeTab === 'production' && (
        <div className="space-y-6">
          {/* Production Tab Filter Bar */}
          <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm space-y-3">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  placeholder="ابحث باسم الموديل، كود الموديل، اللون، أو المقاس..."
                  className="w-full bg-slate-50 border-none rounded-2xl py-3 pr-11 pl-4 text-sm font-bold focus:ring-2 focus:ring-blue-100 transition-all text-right"
                  value={productionSearchQuery}
                  onChange={(e) => setProductionSearchQuery(e.target.value)}
                />
              </div>
            </div>
            <div className="flex flex-wrap bg-slate-100/75 p-1 rounded-2xl w-full gap-1">
              <button 
                onClick={() => setProductionStatusFilter('all')}
                className={`flex-1 lg:flex-none px-4 py-2 text-xs font-black rounded-xl transition-all whitespace-nowrap ${productionStatusFilter === 'all' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500'}`}
              >
                جميع الحالات ({producedPieces.reduce((sum, p) => sum + Math.max(p.cutQty, p.sewQty, p.pkgQty), 0)})
              </button>
              <button 
                onClick={() => setProductionStatusFilter('available')}
                className={`flex-1 lg:flex-none px-4 py-2 text-xs font-black rounded-xl transition-all whitespace-nowrap ${productionStatusFilter === 'available' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500'}`}
              >
                📦 موجودة في المخزون ({producedPieces.reduce((sum, p) => {
                  const total = Math.max(p.cutQty, p.sewQty, p.pkgQty);
                  const info = productionStatuses[p.variantId];
                  return sum + total - (info?.shipped || 0);
                }, 0)})
              </button>
              <button 
                onClick={() => setProductionStatusFilter('shipped')}
                className={`flex-1 lg:flex-none px-4 py-2 text-xs font-black rounded-xl transition-all whitespace-nowrap ${productionStatusFilter === 'shipped' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500'}`}
              >
                🚚 خرجت في أوردر ({producedPieces.reduce((sum, p) => {
                  const info = productionStatuses[p.variantId];
                  return sum + (info?.shipped || 0);
                }, 0)})
              </button>
            </div>
          </div>

            {/* Production Pieces List */}
            {(() => {
              const filteredProducedPieces = producedPieces.filter(piece => {
                const q = productionSearchQuery.toLowerCase().trim();
                const matchesSearch = !q || 
                  piece.productName.toLowerCase().includes(q) ||
                  piece.productCode.toLowerCase().includes(q) ||
                  piece.color.toLowerCase().includes(q) ||
                  piece.size.toLowerCase().includes(q) ||
                  piece.cutWorkers.some(w => w.toLowerCase().includes(q)) ||
                  piece.sewWorkers.some(w => w.toLowerCase().includes(q));

                const totalPieces = Math.max(piece.cutQty, piece.sewQty, piece.pkgQty);
                const statusInfo = productionStatuses[piece.variantId];
                const shipped = statusInfo?.shipped || 0;
                const available = totalPieces - shipped;
                let matchesStatus = true;
                if (productionStatusFilter === 'available') {
                  matchesStatus = available > 0;
                } else if (productionStatusFilter === 'shipped') {
                  matchesStatus = shipped > 0;
                }

                return matchesSearch && matchesStatus;
              });

              if (filteredProducedPieces.length === 0) {
                return (
                  <div className="bg-white p-20 rounded-[2.5rem] border border-dashed border-slate-200 text-center space-y-3">
                    <Package size={52} className="mx-auto text-slate-300" />
                    <p className="text-slate-400 font-bold text-base">لا يوجد قطع جاهزة تطابق تصفية البحث الحالية</p>
                    <p className="text-xs text-slate-400">عند تسجيل تفاصيل تشغيل لمرحلة قص أو تقفيل لأي موديل، ستظهر تجميعاتها هنا تلقائياً</p>
                  </div>
                );
              }

              return (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredProducedPieces.map(piece => {
                    const totalPieces = Math.max(piece.cutQty, piece.sewQty, piece.pkgQty);
                    const statusInfo = productionStatuses[piece.variantId];
                    const shipped = statusInfo?.shipped || 0;
                    const available = totalPieces - shipped;
                    const allShipped = shipped >= totalPieces;
                    const allAvailable = available >= totalPieces;
                    return (
                      <div 
                        key={piece.variantId} 
                        className={`bg-white p-5 rounded-[2rem] border transition-all duration-300 flex flex-col justify-between text-right shadow-sm ${
                          allShipped 
                            ? 'border-slate-150 bg-slate-50/40 opacity-70 hover:opacity-100 grayscale-[15%]' 
                            : allAvailable
                            ? 'border-emerald-100/60 shadow-emerald-50/10 hover:border-emerald-200'
                            : 'border-amber-200/70 bg-amber-50/20 shadow-amber-50'
                        }`}
                      >
                        <div>
                          {/* Upper Details */}
                          <div className="flex justify-between items-start mb-4">
                            <span className={`text-[10px] px-2.5 py-1 rounded-xl font-black ${
                              allAvailable 
                                ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' 
                                : allShipped
                                ? 'bg-slate-100 text-slate-500'
                                : 'bg-amber-50 text-amber-600 border border-amber-100'
                            }`}>
                              {allAvailable ? '📦 موجودة في المخزون' : allShipped ? '🚚 خرجت في أوردر' : `📦 ${available}/${totalPieces} متاحة`}
                            </span>
                            <span className="text-[10px] font-mono text-slate-400 bg-slate-50 px-2 py-1 rounded-lg">
                              كود: {piece.productCode || 'N/A'}
                            </span>
                          </div>

                          {/* Title and Variant */}
                          <h4 className="font-black text-slate-800 text-md truncate mb-1">{piece.productName}</h4>
                          <div className="flex gap-2 mb-4 justify-end">
                            <span className="text-[10px] bg-indigo-50 text-indigo-600 px-2.5 py-0.5 rounded-md font-bold">مقاس: {piece.size}</span>
                            <span className="text-[10px] bg-rose-50 text-rose-600 px-2.5 py-0.5 rounded-md font-bold">لون: {piece.color}</span>
                          </div>

                          {/* Merged Timeline / Production Stages Info */}
                          <div className="space-y-3 p-4 bg-slate-50/80 rounded-2xl mb-4 text-xs font-bold text-slate-600">
                            {/* 1. Cutting */}
                            <div className="flex justify-between items-center text-right">
                              <div className="flex items-center gap-1.5 text-right">
                                <span className="text-orange-600">🧵 تم قص:</span>
                                <span className="text-[10.5px] text-slate-500 font-bold truncate max-w-[130px]" title={piece.cutWorkers.join('، ')}>
                                  {piece.cutWorkers.length > 0 ? piece.cutWorkers.join('، ') : 'غير محدد'}
                                </span>
                              </div>
                              <div className="text-left">
                                <span className="text-slate-800 font-black">{piece.cutQty}</span> قطعة
                              </div>
                            </div>

                            {/* 2. Sewing */}
                            <div className="flex justify-between items-center text-right">
                              <div className="flex items-center gap-1.5 text-right">
                                <span className="text-blue-600">🪡 تم تقفيل:</span>
                                <span className="text-[10.5px] text-slate-500 font-bold truncate max-w-[130px]" title={piece.sewWorkers.join('، ')}>
                                  {piece.sewWorkers.length > 0 ? piece.sewWorkers.join('، ') : 'غير محدد'}
                                </span>
                              </div>
                              <div className="text-left">
                                <span className="text-slate-800 font-black">{piece.sewQty}</span> قطعة
                              </div>
                            </div>

                            {/* Status comparison bar */}
                            <div className="pt-2 border-t border-slate-200/50">
                              <div className="flex justify-between items-center mb-1 text-[10px] text-slate-400">
                                <span className="text-emerald-600 font-black">نسبة التقفيل: {piece.cutQty > 0 ? Math.round((piece.sewQty / piece.cutQty) * 100) : 0}%</span>
                                <span>جاهزية التشغيل</span>
                              </div>
                              <div className="w-full bg-slate-200/50 rounded-full h-1.5 overflow-hidden">
                                <div 
                                  className="bg-emerald-500 h-1.5 rounded-full transition-all duration-300"
                                  style={{ width: `${Math.min(100, piece.cutQty > 0 ? (piece.sewQty / piece.cutQty) * 100 : 0)}%` }}
                                ></div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Counter stepper + history */}
                        <div className="border-t border-slate-100 pt-3 mt-auto space-y-3">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-1">
                              {statusInfo && statusInfo.history.length > 0 && (
                                <button
                                  type="button"
                                  onClick={() => handleUndoStatus(piece.variantId)}
                                  className="text-[9px] px-1.5 py-0.5 rounded-lg bg-slate-100 text-slate-400 hover:bg-red-50 hover:text-red-500 font-bold transition-all cursor-pointer"
                                  title="تراجع عن آخر خطوة"
                                >
                                  ↩
                                </button>
                              )}
                              {shipped > 0 && (
                                <button
                                  type="button"
                                  onClick={() => handleResetStatus(piece.variantId)}
                                  className="text-[9px] px-1.5 py-0.5 rounded-lg bg-red-50 text-red-300 hover:bg-red-100 hover:text-red-500 font-bold transition-all cursor-pointer"
                                  title="إعادة تعيين الكل للمخزن"
                                >
                                  ✕
                                </button>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-400 font-bold">القطع في المخزن:</span>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleUpdateStatus(piece.variantId, -1)}
                                disabled={shipped <= 0}
                                className="w-8 h-8 rounded-full bg-rose-50 text-rose-500 hover:bg-rose-100 disabled:opacity-30 disabled:cursor-not-allowed font-bold text-sm flex items-center justify-center transition-all cursor-pointer"
                              >
                                −
                              </button>
                              <div className="flex gap-3 text-xs font-black">
                                <span className="text-emerald-600">{available} متاح</span>
                                <span className="text-slate-300">|</span>
                                <span className="text-slate-500">{shipped} خارج</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleUpdateStatus(piece.variantId, 1)}
                                disabled={shipped >= totalPieces}
                                className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-500 hover:bg-emerald-100 disabled:opacity-30 disabled:cursor-not-allowed font-bold text-sm flex items-center justify-center transition-all cursor-pointer"
                              >
                                +
                              </button>
                            </div>
                          </div>
                          {statusInfo?.history && statusInfo.history.length > 0 && (
                            <div className="bg-slate-50/60 rounded-xl p-2 max-h-[100px] overflow-y-auto space-y-1">
                              {statusInfo.history.slice(0, 10).map((entry, ei) => (
                                <div key={ei} className="flex justify-between items-center text-[9px] text-slate-400 font-bold">
                                  <span>{entry.amount > 0 ? '🚚 خرج' : '📦 عودة'} {Math.abs(entry.amount)} قطعة</span>
                                  <span className="font-mono">{new Date(entry.date).toLocaleString('ar-EG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        )}

        {/* ==================== TAB 2: FINANCIAL ACCOUNTS (الحسابات والماليات للورش) ==================== */}
        {activeTab === 'accounts' && (
          <div className="space-y-6">
            
            {/* Accounts Tab Filter Bar */}
            <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
              <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center">
                <div className="relative flex-1">
                  <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="text"
                    placeholder="ابحث باسم العامل أو الورشة..."
                    className="w-full bg-slate-50 border-none rounded-2xl py-3 pr-11 pl-4 text-sm font-bold focus:ring-2 focus:ring-blue-105 transition-all text-right"
                    value={accountsSearchQuery}
                    onChange={(e) => setAccountsSearchQuery(e.target.value)}
                  />
                </div>

                {/* Worker Select Filter */}
                <div className="text-right shrink-0">
                  <select
                    value={accountsWorkerFilter}
                    onChange={(e) => setAccountsWorkerFilter(e.target.value)}
                    className="bg-slate-50 border-none rounded-2xl py-3 px-4 text-xs font-black text-slate-700 text-right outline-none focus:ring-2 focus:ring-blue-100 transition-all cursor-pointer min-w-[170px] h-full"
                  >
                    <option value="all">كل العمال والمصانع</option>
                    {workers.map(w => (
                      <option key={w.id} value={w.id}>{w.name}</option>
                    ))}
                  </select>
                </div>

                {/* Inline Date Range Filters */}
                <div className="flex items-center gap-1 bg-slate-50 px-3 py-2 rounded-2xl self-stretch lg:self-auto">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-slate-400 font-black">من:</span>
                    <input
                      type="date"
                      value={accountsStartDate}
                      onChange={(e) => setAccountsStartDate(e.target.value)}
                      className="bg-transparent border-none p-0 text-xs font-bold text-slate-700 outline-none w-28 focus:ring-0 text-right font-sans"
                    />
                  </div>
                  <div className="w-px h-4 bg-slate-200 mx-1"></div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-slate-400 font-black">إلى:</span>
                    <input
                      type="date"
                      value={accountsEndDate}
                      onChange={(e) => setAccountsEndDate(e.target.value)}
                      className="bg-transparent border-none p-0 text-xs font-bold text-slate-700 outline-none w-28 focus:ring-0 text-right font-sans"
                    />
                  </div>
                  {(accountsStartDate || accountsEndDate) && (
                    <button 
                      onClick={() => { setAccountsStartDate(''); setAccountsEndDate(''); }}
                      className="text-xs font-black text-red-500 hover:text-red-700 mr-2 bg-red-50 px-2 py-0.5 rounded-lg"
                    >
                      مسح ✕
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Financial Performance Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gradient-to-br from-indigo-50 to-indigo-100/40 p-5 rounded-[2rem] border border-indigo-100/50 shadow-sm text-right flex flex-col justify-between">
                <div className="flex justify-between items-center mb-3">
                  <p className="text-[11px] text-indigo-500 font-black uppercase">إجمالي قيمة تشغيل الإنتاج</p>
                  <div className="w-10 h-10 bg-indigo-500/10 text-indigo-700 rounded-xl flex items-center justify-center">
                    <TrendingUp size={20} />
                  </div>
                </div>
                <div>
                  <h3 className="text-2xl font-black text-slate-800">
                    {displayedWorkers.reduce((sum, item) => sum + (item.totalOwed || 0), 0).toLocaleString()} <span className="text-xs">ج.م</span>
                  </h3>
                </div>
              </div>

              <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/40 p-5 rounded-[2rem] border border-emerald-100/50 shadow-sm text-right flex flex-col justify-between">
                <div className="flex justify-between items-center mb-3">
                  <p className="text-[11px] text-emerald-500 font-black uppercase">إجمالي المبالغ المصروفة</p>
                  <div className="w-10 h-10 bg-emerald-500/10 text-emerald-700 rounded-xl flex items-center justify-center">
                    <CheckCircle2 size={20} />
                  </div>
                </div>
                <div>
                  <h3 className="text-2xl font-black text-slate-800">
                    {displayedWorkers.reduce((sum, item) => sum + (item.totalPaid || 0), 0).toLocaleString()} <span className="text-xs">ج.م</span>
                  </h3>
                </div>
              </div>

              <div className="bg-gradient-to-br from-red-50 to-red-100/40 p-5 rounded-[2rem] border border-red-100/50 shadow-sm text-right flex flex-col justify-between">
                <div className="flex justify-between items-center mb-3">
                  <p className="text-[11px] text-red-500 font-black uppercase">إجمالي المتبقي المستحق</p>
                  <div className="w-10 h-10 bg-red-500/10 text-red-700 rounded-xl flex items-center justify-center">
                    <DollarSign size={20} />
                  </div>
                </div>
                <div>
                  <h3 className="text-2xl font-black text-slate-800">
                     {displayedWorkers.reduce((sum, item) => sum + (item.remainingBalance > 0 ? item.remainingBalance : 0), 0).toLocaleString()} <span className="text-xs">ج.م</span>
                  </h3>
                </div>
              </div>
            </div>



            {/* General Workers Balances lists with Profile view link */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 justify-start">
                <Users size={18} className="text-blue-500" />
                <h3 className="text-md font-black text-slate-800">الأرصدة وبطاقات كشف حساب العمال والورش</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {enrichedWorkers.map(worker => {
                  const status = getPaymentStatus(worker);
                  return (
                    <div key={worker.id} className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm space-y-4 hover:border-blue-100 transition-all text-right">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center font-black text-lg">
                            {worker?.name?.[0] ?? ''}
                          </div>
                          <div className="text-right">
                            <h4 className="font-black text-slate-800">{worker.name}</h4>
                            <div className={`mt-1 text-[10px] px-2 py-0.5 rounded-full inline-block font-black ${status.color}`}>
                              {status.label}
                            </div>
                          </div>
                        </div>
                        <div className="text-left">
                          <p className="text-[10px] text-slate-400 font-black uppercase">المتبقي له</p>
                          <p className={`text-lg font-black ${worker.remainingBalance > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                            {Math.abs(worker.remainingBalance || 0).toLocaleString()} <span className="text-[10px]">ج.م</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button 
                          onClick={() => setSelectedWorkerId(worker.id)}
                          className="flex-1 bg-slate-50 text-slate-600 py-3 rounded-2xl text-xs font-black hover:bg-slate-100 transition-all flex items-center justify-center gap-2"
                        >
                          <Eye size={16} />
                          تفاصيل كشف السجل والماليات
                        </button>
                        <button 
                          onClick={() => { setPayingWorkerId(worker.id); setIsPaymentModalOpen(true); }}
                          className="px-4 bg-emerald-50 text-emerald-600 rounded-2xl hover:bg-emerald-100 transition-all"
                          title="صرف دفعة نقدية لشريك العمل"
                        >
                          <DollarSign size={18} />
                        </button>
                        <button 
                          onClick={() => handleOpenEditWorker(worker)}
                          className="px-3 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-2xl transition-all"
                          title="تعديل بيانات ورشة العمل"
                        >
                          <Edit size={16} />
                        </button>
                        <button 
                          onClick={() => handleDeleteWorker(worker.id)}
                          className="px-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-2xl transition-all"
                          title="حذف ورشة العمل وكل سجلاتها"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ==================== TAB 2: CUTTING (القص) ==================== */}
        {activeTab === 'cutting' && (
          <div className="space-y-4">
            {/* Cutting stage tab filters container */}
            <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
              <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center">
                <div className="relative flex-1">
                  <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="text"
                    placeholder="ابحث بالموديل، اسم القاص، أو رقم الإيصال..."
                    className="w-full bg-slate-50 border-none rounded-2xl py-3 pr-11 pl-4 text-sm font-bold focus:ring-2 focus:ring-blue-105 transition-all text-right"
                    value={cuttingSearchQuery}
                    onChange={(e) => setCuttingSearchQuery(e.target.value)}
                  />
                </div>

                {/* Worker select filter for cutting */}
                <div className="text-right shrink-0">
                  <select
                    value={cuttingWorkerFilter}
                    onChange={(e) => setCuttingWorkerFilter(e.target.value)}
                    className="bg-slate-50 border-none rounded-2xl py-3 px-4 text-xs font-black text-slate-700 text-right outline-none focus:ring-2 focus:ring-blue-100 transition-all cursor-pointer min-w-[170px] h-full"
                  >
                    <option value="all">كل عمال القص</option>
                    {workers.filter(w => w.role === 'cutting').map(w => (
                      <option key={w.id} value={w.id}>{w.name}</option>
                    ))}
                  </select>
                </div>

                {/* Inline Date Range for Cutting */}
                <div className="flex items-center gap-1 bg-slate-50 px-3 py-2 rounded-2xl self-stretch lg:self-auto">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-slate-400 font-black">من:</span>
                    <input
                      type="date"
                      value={cuttingStartDate}
                      onChange={(e) => setCuttingStartDate(e.target.value)}
                      className="bg-transparent border-none p-0 text-xs font-bold text-slate-700 outline-none w-28 focus:ring-0 text-right font-sans"
                    />
                  </div>
                  <div className="w-px h-4 bg-slate-200 mx-1"></div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-slate-400 font-black">إلى:</span>
                    <input
                      type="date"
                      value={cuttingEndDate}
                      onChange={(e) => setCuttingEndDate(e.target.value)}
                      className="bg-transparent border-none p-0 text-xs font-bold text-slate-700 outline-none w-28 focus:ring-0 text-right font-sans"
                    />
                  </div>
                  {(cuttingStartDate || cuttingEndDate) && (
                    <button 
                      onClick={() => { setCuttingStartDate(''); setCuttingEndDate(''); }}
                      className="text-xs font-black text-red-500 hover:text-red-700 mr-2 bg-red-50 px-2 py-0.5 rounded-lg"
                    >
                      مسح ✕
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <h3 className="text-md font-black text-slate-800 flex items-center gap-2">
                <Scissors size={18} className="text-orange-500" />
                <span>سجلات إنتاج مرحلة القص</span>
              </h3>
            </div>

            <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-400 font-black border-b border-slate-100">
                      <th className="p-4">رقم السجل</th>
                      <th className="p-4">التاريخ</th>
                      <th className="p-4">اسم القاص / العامل</th>
                      <th className="p-4">المنتج والموديل</th>
                      <th className="p-4">اللون / المقاس</th>
                      <th className="p-4 text-center">الكمية</th>
                      <th className="p-4 text-left border-l border-slate-100">التكلفة الإجمالية</th>
                      <th className="p-4 text-center">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 text-slate-700 font-bold">
                    {cuttingIntakes.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="text-center p-12 text-slate-400">لا يوجد سجلات تشغيل قص حتى الآن</td>
                      </tr>
                    ) : (
                      cuttingIntakes.map(intake => (
                        <tr key={intake.id} className="hover:bg-slate-50/50">
                          <td className="p-4 font-mono text-slate-400">{intake.receiptId || "بدون"}</td>
                          <td className="p-4">{new Date(intake.date).toLocaleDateString('ar-EG')}</td>
                          <td className="p-4 font-black text-slate-800">{intake.workerName}</td>
                          <td className="p-4 text-slate-800">{intake.productName}</td>
                          <td className="p-4">{intake.color} / {intake.size}</td>
                          <td className="p-4 text-center font-black text-orange-600">{intake.quantity} قطعة</td>
                          <td className="p-4 text-left font-black text-slate-900 border-l border-slate-50">{(intake.totalCost || 0).toLocaleString()} ج.م</td>
                          <td className="p-4 text-center">
                            <div className="flex justify-center gap-1.5">
                              <button 
                                onClick={() => handleOpenEditIntake(intake)}
                                className="p-1.5 hover:text-blue-600 hover:bg-blue-50 text-slate-400 rounded-lg transition-all"
                                title="تعديل السجل"
                              >
                                <Edit size={14} />
                              </button>
                              <button 
                                onClick={() => handleDeleteIntake(intake.id)}
                                className="p-1.5 hover:text-red-600 hover:bg-red-50 text-slate-400 rounded-lg transition-all"
                                title="حذف السجل"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
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
        {/* ==================== TAB 3: SEWING (التقفيل) ==================== */}
        {activeTab === 'sewing' && (
          <div className="space-y-4">
            {/* Sewing stage tab filters container */}
            <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
              <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center">
                <div className="relative flex-1">
                  <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="text"
                    placeholder="ابحث بالموديل، اسم الورشة، أو رقم السجل..."
                    className="w-full bg-slate-50 border-none rounded-2xl py-3 pr-11 pl-4 text-sm font-bold focus:ring-2 focus:ring-blue-105 transition-all text-right"
                    value={sewingSearchQuery}
                    onChange={(e) => setSewingSearchQuery(e.target.value)}
                  />
                </div>

                {/* Worker select filter for sewing */}
                <div className="text-right shrink-0">
                  <select
                    value={sewingWorkerFilter}
                    onChange={(e) => setSewingWorkerFilter(e.target.value)}
                    className="bg-slate-50 border-none rounded-2xl py-3 px-4 text-xs font-black text-slate-700 text-right outline-none focus:ring-2 focus:ring-blue-100 transition-all cursor-pointer min-w-[170px] h-full"
                  >
                    <option value="all">كل ورش التقفيل</option>
                    {workers.filter(w => w.role === 'sewing').map(w => (
                      <option key={w.id} value={w.id}>{w.name}</option>
                    ))}
                  </select>
                </div>

                {/* Inline Date Range for Sewing */}
                <div className="flex items-center gap-1 bg-slate-50 px-3 py-2 rounded-2xl self-stretch lg:self-auto">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-slate-400 font-black">من:</span>
                    <input
                      type="date"
                      value={sewingStartDate}
                      onChange={(e) => setSewingStartDate(e.target.value)}
                      className="bg-transparent border-none p-0 text-xs font-bold text-slate-700 outline-none w-28 focus:ring-0 text-right font-sans"
                    />
                  </div>
                  <div className="w-px h-4 bg-slate-200 mx-1"></div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-slate-400 font-black">إلى:</span>
                    <input
                      type="date"
                      value={sewingEndDate}
                      onChange={(e) => setSewingEndDate(e.target.value)}
                      className="bg-transparent border-none p-0 text-xs font-bold text-slate-700 outline-none w-28 focus:ring-0 text-right font-sans"
                    />
                  </div>
                  {(sewingStartDate || sewingEndDate) && (
                    <button 
                      onClick={() => { setSewingStartDate(''); setSewingEndDate(''); }}
                      className="text-xs font-black text-red-500 hover:text-red-700 mr-2 bg-red-50 px-2 py-0.5 rounded-lg"
                    >
                      مسح ✕
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <h3 className="text-md font-black text-slate-800 flex items-center gap-2">
                <Package size={18} className="text-blue-500" />
                <span>سجلات إنتاج مرحلة التقفيل والتربيط</span>
              </h3>
            </div>

            <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-400 font-black border-b border-slate-100">
                      <th className="p-4">رقم السجل</th>
                      <th className="p-4">التاريخ</th>
                      <th className="p-4">اسم ورشة التقفيل</th>
                      <th className="p-4">المنتج والموديل</th>
                      <th className="p-4">اللون / المقاس</th>
                      <th className="p-4 text-center">الكمية</th>
                      <th className="p-4 text-left border-l border-slate-100">التكلفة الإجمالية</th>
                      <th className="p-4 text-center">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 text-slate-700 font-bold">
                    {sewingIntakes.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="text-center p-12 text-slate-400">لا يوجد سجلات تشغيل تقفيل حتى الآن</td>
                      </tr>
                    ) : (
                      sewingIntakes.map(intake => (
                        <tr key={intake.id} className="hover:bg-slate-50/50">
                          <td className="p-4 font-mono text-slate-400">{intake.receiptId || "بدون"}</td>
                          <td className="p-4">{new Date(intake.date).toLocaleDateString('ar-EG')}</td>
                          <td className="p-4 font-black text-slate-800">{intake.workerName}</td>
                          <td className="p-4 text-slate-800">{intake.productName}</td>
                          <td className="p-4">{intake.color} / {intake.size}</td>
                          <td className="p-4 text-center font-black text-blue-600">{intake.quantity} قطعة</td>
                          <td className="p-4 text-left font-black text-slate-900 border-l border-slate-50">{(intake.totalCost || 0).toLocaleString()} ج.م</td>
                          <td className="p-4 text-center">
                            <div className="flex justify-center gap-1.5">
                              <button 
                                onClick={() => handleOpenEditIntake(intake)}
                                className="p-1.5 hover:text-blue-600 hover:bg-blue-50 text-slate-400 rounded-lg transition-all"
                                title="تعديل السجل"
                              >
                                <Edit size={14} />
                              </button>
                              <button 
                                onClick={() => handleDeleteIntake(intake.id)}
                                className="p-1.5 hover:text-red-600 hover:bg-red-50 text-slate-400 rounded-lg transition-all"
                                title="حذف السجل"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
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

        {/* ==================== TAB 4: PACKAGING (التغليف باليومية) ==================== */}
        {activeTab === 'packaging' && (
          <div className="space-y-4">
            {/* Packaging stage tab filters container */}
            <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
              <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center">
                <div className="relative flex-1">
                  <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="text"
                    placeholder="ابحث بالموديل، اسم المغلف، أو رقم العملية..."
                    className="w-full bg-slate-50 border-none rounded-2xl py-3 pr-11 pl-4 text-sm font-bold focus:ring-2 focus:ring-blue-105 transition-all text-right"
                    value={packagingSearchQuery}
                    onChange={(e) => setPackagingSearchQuery(e.target.value)}
                  />
                </div>

                {/* Worker select filter for packaging */}
                <div className="text-right shrink-0">
                  <select
                    value={packagingWorkerFilter}
                    onChange={(e) => setPackagingWorkerFilter(e.target.value)}
                    className="bg-slate-50 border-none rounded-2xl py-3 px-4 text-xs font-black text-slate-700 text-right outline-none focus:ring-2 focus:ring-blue-100 transition-all cursor-pointer min-w-[170px] h-full"
                  >
                    <option value="all">كل عمال التغليف</option>
                    {workers.filter(w => w.role === 'packaging').map(w => (
                      <option key={w.id} value={w.id}>{w.name}</option>
                    ))}
                  </select>
                </div>

                {/* Inline Date Range for Packaging */}
                <div className="flex items-center gap-1 bg-slate-50 px-3 py-2 rounded-2xl self-stretch lg:self-auto">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-slate-400 font-black">من:</span>
                    <input
                      type="date"
                      value={packagingStartDate}
                      onChange={(e) => setPackagingStartDate(e.target.value)}
                      className="bg-transparent border-none p-0 text-xs font-bold text-slate-700 outline-none w-28 focus:ring-0 text-right font-sans"
                    />
                  </div>
                  <div className="w-px h-4 bg-slate-200 mx-1"></div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-slate-400 font-black">إلى:</span>
                    <input
                      type="date"
                      value={packagingEndDate}
                      onChange={(e) => setPackagingEndDate(e.target.value)}
                      className="bg-transparent border-none p-0 text-xs font-bold text-slate-700 outline-none w-28 focus:ring-0 text-right font-sans"
                    />
                  </div>
                  {(packagingStartDate || packagingEndDate) && (
                    <button 
                      onClick={() => { setPackagingStartDate(''); setPackagingEndDate(''); }}
                      className="text-xs font-black text-red-500 hover:text-red-700 mr-2 bg-red-50 px-2 py-0.5 rounded-lg"
                    >
                      مسح ✕
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <h3 className="text-md font-black text-slate-800 flex items-center gap-2">
                <Package size={18} className="text-purple-500" />
                <span>التغليف باليومية والتشطيب</span>
              </h3>
            </div>

            <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-400 font-black border-b border-slate-100">
                      <th className="p-4">رقم الكود</th>
                      <th className="p-4">تاريخ اليومية</th>
                      <th className="p-4">اسم العاملة</th>
                      <th className="p-4">الموديل المغلف</th>
                      <th className="p-4">اللون / المقاس</th>
                      <th className="p-4 text-center">القطع المغلفة</th>
                      <th className="p-4 text-left border-l border-slate-100">التكلفة</th>
                      <th className="p-4 text-center">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 text-slate-700 font-bold">
                    {packagingIntakes.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="text-center p-12 text-slate-400">لا يوجد بيانات تغليف مسجلة لهذا الأسبوع</td>
                      </tr>
                    ) : (
                      packagingIntakes.map(intake => (
                        <tr key={intake.id} className="hover:bg-slate-50/50">
                          <td className="p-4 font-mono text-slate-400">{intake.receiptId || "بدون"}</td>
                          <td className="p-4">{new Date(intake.date).toLocaleDateString('ar-EG')}</td>
                          <td className="p-4 font-black text-purple-700">{intake.workerName}</td>
                          <td className="p-4">{intake.productName}</td>
                          <td className="p-4">{intake.color} / {intake.size}</td>
                          <td className="p-4 text-center font-black text-purple-600">{intake.quantity} قطعة</td>
                          <td className="p-4 text-left font-black text-slate-950 border-l border-slate-50">{(intake.totalCost || 0).toLocaleString()} ج.م</td>
                          <td className="p-4 text-center">
                            <div className="flex justify-center gap-1.5">
                              <button 
                                onClick={() => handleOpenEditIntake(intake)}
                                className="p-1.5 hover:text-blue-600 hover:bg-blue-50 text-slate-400 rounded-lg transition-all"
                                title="تعديل السجل"
                              >
                                <Edit size={14} />
                              </button>
                              <button 
                                onClick={() => handleDeleteIntake(intake.id)}
                                className="p-1.5 hover:text-red-600 hover:bg-red-50 text-slate-400 rounded-lg transition-all"
                                title="حذف السجل"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
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

      {/* Unified Modals Container */}
      <Modals 
          isIntakeModalOpen={isIntakeModalOpen} setIsIntakeModalOpen={setIsIntakeModalOpen}
          isPaymentModalOpen={isPaymentModalOpen} setIsPaymentModalOpen={setIsPaymentModalOpen}
          isWorkerModalOpen={isWorkerModalOpen} setIsWorkerModalOpen={setIsWorkerModalOpen}
          isPackagingModalOpen={isPackagingModalOpen} setIsPackagingModalOpen={setIsPackagingModalOpen}
          selectedStage={selectedStage} setSelectedStage={setSelectedStage}
          intakeWorkerId={intakeWorkerId} setIntakeWorkerId={setIntakeWorkerId}
          intakeDate={intakeDate} setIntakeDate={setIntakeDate}
          intakeItems={intakeItems} setIntakeItems={setIntakeItems}
          handleAddIntakeItem={handleAddIntakeItem} handleRemoveIntakeItem={handleRemoveIntakeItem}
          handleRegisterIntake={handleRegisterIntake}
          handlePayWorker={handlePayWorker}
          paymentAmount={paymentAmount} setPaymentAmount={setPaymentAmount}
          paymentNote={paymentNote} setPaymentNote={setPaymentNote}
          payingWorkerId={payingWorkerId} setPayingWorkerId={setPayingWorkerId}
          workers={workers} products={products} productionIntakes={productionIntakes}
          newWorker={newWorker} setNewWorker={setNewWorker}
          handleCreateWorker={handleCreateWorker}
          pkgWorkerId={pkgWorkerId} setPkgWorkerId={setPkgWorkerId}
          pkgDate={pkgDate} setPkgDate={setPkgDate}
          pkgQuantity={pkgQuantity} setPkgQuantity={setPkgQuantity}
          pkgCostPerItem={pkgCostPerItem} setPkgCostPerItem={setPkgCostPerItem}
          handleRegisterPackaging={handleRegisterPackaging}
        />

      {/* Edit Worker Modal */}
      {isEditWorkerModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-[32px] overflow-hidden shadow-2xl text-right">
            <div className="p-6 bg-slate-50 border-b border-slate-100 flex justify-between items-center text-right">
              <h3 className="text-lg font-black text-slate-800">تعديل بيانات ورشة العمل / العامل</h3>
              <button onClick={() => { setIsEditWorkerModalOpen(false); setEditingWorker(null); }} className="text-slate-400 font-bold hover:text-slate-600 p-1">✕</button>
            </div>
            <form onSubmit={handleUpdateWorker} className="p-6 space-y-4 text-right">
              <div className="space-y-1 text-right">
                <label className="text-[10px] font-black text-slate-400 uppercase block text-right">اسم المصنع أو العامل القائم بالعمل</label>
                <input 
                  required
                  className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm font-bold text-right outline-none"
                  value={editWorkerName}
                  onChange={e => setEditWorkerName(e.target.value)}
                />
              </div>
              <div className="space-y-1 text-right">
                <label className="text-[10px] font-black text-slate-400 uppercase block text-right">رقم الهاتف / التواصل</label>
                <input 
                  type="text"
                  className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm font-bold text-right outline-none"
                  value={editWorkerPhone}
                  onChange={e => setEditWorkerPhone(e.target.value)}
                />
              </div>
              <div className="space-y-1 text-right">
                <label className="text-[10px] font-black text-slate-400 uppercase block text-right">الدور / المرحلة الأساسية</label>
                <select
                  required
                  className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm font-bold text-right outline-none"
                  value={editWorkerRole}
                  onChange={e => setEditWorkerRole(e.target.value as 'cutting' | 'sewing' | 'packaging')}
                >
                  <option value="cutting">🧵 قص</option>
                  <option value="sewing">🪡 تقفيل / خياطة</option>
                  <option value="packaging">📦 تغليف</option>
                </select>
              </div>
              <button type="submit" className="w-full bg-blue-600 text-white font-black py-4 rounded-2xl shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all mt-4">
                حفظ التعديلات
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Edit Intake Modal */}
      {isEditIntakeModalOpen && editingIntake && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-[32px] overflow-hidden shadow-2xl text-right">
            <div className="p-6 bg-slate-50 border-b border-slate-100 flex justify-between items-center text-right">
              <h3 className="text-lg font-black text-slate-800">تعديل سجل الإنتاج 🛠️</h3>
              <button onClick={() => { setIsEditIntakeModalOpen(false); setEditingIntake(null); }} className="text-slate-400 font-bold hover:text-slate-600 p-1">✕</button>
            </div>
            <form onSubmit={handleUpdateIntake} className="p-6 space-y-4 text-right">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase block text-right">تاريخ اليومية</label>
                <input 
                  type="date"
                  required
                  className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm font-bold text-right outline-none"
                  value={editIntakeDate}
                  onChange={e => setEditIntakeDate(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase block text-right">الكمية المستلمة (قطع)</label>
                <input 
                  type="number"
                  required
                  className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm font-black font-sans text-right outline-none"
                  value={editIntakeQuantity || ''}
                  onChange={e => setEditIntakeQuantity(parseInt(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase block text-right">سعر القطعة (ج.م)</label>
                <input 
                  type="number"
                  step="any"
                  required
                  className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm font-black font-sans text-right outline-none"
                  value={editIntakeCostPerItem || ''}
                  onChange={e => setEditIntakeCostPerItem(parseFloat(e.target.value) || 0)}
                />
              </div>
              {editIntakeQuantity > 0 && editIntakeCostPerItem > 0 && (
                <p className="text-xs font-black text-blue-600 bg-blue-50 text-center py-2.5 rounded-xl border border-blue-50">
                  التكلفة الإجمالية الجديدة: {(editIntakeQuantity * editIntakeCostPerItem).toLocaleString()} ج.م
                </p>
              )}
              <button type="submit" className="w-full bg-blue-600 text-white font-black py-4 rounded-2xl shadow-xl shadow-blue-105 hover:bg-blue-700 transition-all mt-4">
                تأكيد حفظ التعديلات
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Custom Confirmation Modal */}
      {confirmDeleteState.isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-[32px] overflow-hidden shadow-2xl text-right animate-in zoom-in-95 duration-200">
            <div className="p-6 bg-red-50 border-b border-red-100 flex justify-between items-center flex-row-reverse text-right">
              <h3 className="text-lg font-black text-red-800">{confirmDeleteState.title}</h3>
              <button 
                onClick={() => setConfirmDeleteState(prev => ({ ...prev, isOpen: false }))} 
                className="text-red-400 font-bold hover:text-red-600 p-1"
              >
                ✕
              </button>
            </div>
            <div className="p-6 space-y-4 text-right">
              <p className="text-sm font-bold text-slate-600 leading-relaxed text-right">
                {confirmDeleteState.message}
              </p>
              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    confirmDeleteState.onConfirm();
                    setConfirmDeleteState(prev => ({ ...prev, isOpen: false }));
                  }}
                  className="w-1/2 bg-red-600 text-white font-black py-3 rounded-2xl shadow-xl shadow-red-100 hover:bg-red-700 transition-all text-sm"
                >
                  نعم، تأكيد الحذف
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDeleteState(prev => ({ ...prev, isOpen: false }))}
                  className="w-1/2 bg-slate-100 text-slate-600 font-black py-3 rounded-2xl hover:bg-slate-200 transition-all text-sm"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface ModalsProps {
  isIntakeModalOpen: boolean; setIsIntakeModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isPaymentModalOpen: boolean; setIsPaymentModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isWorkerModalOpen: boolean; setIsWorkerModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isPackagingModalOpen: boolean; setIsPackagingModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  selectedStage: 'cutting' | 'sewing' | 'packaging'; setSelectedStage: React.Dispatch<React.SetStateAction<'cutting' | 'sewing' | 'packaging'>>;
  intakeWorkerId: string; setIntakeWorkerId: React.Dispatch<React.SetStateAction<string>>;
  intakeDate: string; setIntakeDate: React.Dispatch<React.SetStateAction<string>>;
  intakeItems: IntakeItem[]; setIntakeItems: React.Dispatch<React.SetStateAction<IntakeItem[]>>;
  handleAddIntakeItem: (type?: 'cutting' | 'sewing') => void; handleRemoveIntakeItem: (i: number) => void;
  handleRegisterIntake: (e: React.FormEvent) => void;
  handlePayWorker: (e: React.FormEvent) => void;
  paymentAmount: number; setPaymentAmount: React.Dispatch<React.SetStateAction<number>>;
  paymentNote: string; setPaymentNote: React.Dispatch<React.SetStateAction<string>>;
  payingWorkerId: string; setPayingWorkerId: React.Dispatch<React.SetStateAction<string>>;
  workers: Worker[]; products: Product[]; productionIntakes: ProductionIntake[];
  newWorker: Partial<Worker>; setNewWorker: React.Dispatch<React.SetStateAction<Partial<Worker>>>;
  handleCreateWorker: (e: React.FormEvent) => void;
  pkgWorkerId: string; setPkgWorkerId: React.Dispatch<React.SetStateAction<string>>;
  pkgDate: string; setPkgDate: React.Dispatch<React.SetStateAction<string>>;
  pkgQuantity: number; setPkgQuantity: React.Dispatch<React.SetStateAction<number>>;
  pkgCostPerItem: number; setPkgCostPerItem: React.Dispatch<React.SetStateAction<number>>;
  handleRegisterPackaging: (e: React.FormEvent) => void;
}

function Modals(props: ModalsProps) {
  const {
    isIntakeModalOpen, setIsIntakeModalOpen,
    isPaymentModalOpen, setIsPaymentModalOpen,
    isWorkerModalOpen, setIsWorkerModalOpen,
    isPackagingModalOpen, setIsPackagingModalOpen,
    selectedStage, setSelectedStage,
    intakeWorkerId, setIntakeWorkerId,
    intakeDate, setIntakeDate,
    intakeItems, setIntakeItems,
    handleAddIntakeItem, handleRemoveIntakeItem,
    handleRegisterIntake,
    handlePayWorker,
    paymentAmount, setPaymentAmount,
    paymentNote, setPaymentNote,
    payingWorkerId, setPayingWorkerId,
    workers, products, productionIntakes,
    newWorker, setNewWorker,
    handleCreateWorker,
    pkgWorkerId, setPkgWorkerId,
    pkgDate, setPkgDate,
    pkgQuantity, setPkgQuantity,
    pkgCostPerItem, setPkgCostPerItem,
    handleRegisterPackaging
  } = props;
  return (
    <>
      {/* Intake Modal - Unified for stages (Cutting, Sewing, Packaging) */}
      {isIntakeModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-[32px] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-6 bg-slate-50 border-b border-slate-100 flex justify-between items-center text-right">
              <h3 className="text-xl font-black text-slate-800">تسجيل مرحلة إنتاج 🛠️</h3>
              <button 
                onClick={() => setIsIntakeModalOpen(false)} 
                className="text-slate-400 font-bold hover:text-slate-600 p-2"
              >
                ✕
              </button>
            </div>
            
            {/* Stage selector inside the modal */}
            <div className="px-6 pt-4 bg-white">
              <label className="block text-right text-[10px] font-black text-slate-400 uppercase mb-1.5">اختر المرحلة المراد تسجيلها</label>
              <div className="flex bg-slate-100 p-1.5 rounded-2xl gap-1 justify-center">
                {(['cutting', 'sewing', 'packaging'] as const).map((stage) => {
                  const isSelected = selectedStage === stage;
                  return (
                    <button
                      key={stage}
                      type="button"
                      onClick={() => {
                        setSelectedStage(stage);
                        if (stage === 'packaging') {
                          setPkgWorkerId(intakeWorkerId);
                          setPkgDate(intakeDate);
                          setPkgQuantity(0);
                          setPkgCostPerItem(0);
                        } else {
                          setIntakeWorkerId(pkgWorkerId || intakeWorkerId);
                          setIntakeDate(pkgDate || intakeDate);
                          setIntakeItems([{ productId: '', variantId: '', quantity: 0, costPerItem: 0, type: stage }]);
                        }
                      }}
                      className={`flex-1 py-1.5 text-xs font-black rounded-xl transition-all ${
                        isSelected 
                          ? 'bg-blue-600 text-white shadow-md font-black' 
                          : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                      }`}
                    >
                      {stage === 'cutting' ? '🧵 قص' : stage === 'sewing' ? '🪡 تقفيل' : '📦 تغليف'}
                    </button>
                  );
                })}
              </div>
            </div>

            {selectedStage !== 'packaging' ? (
              <form onSubmit={handleRegisterIntake} className="p-6 space-y-4 overflow-y-auto text-right flex-1">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1 text-right">
                    <label className="text-[10px] font-black text-slate-400 uppercase">اسم العامل أو المصنع</label>
                    <select 
                      required
                      className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm font-bold text-right outline-none"
                      value={intakeWorkerId}
                      onChange={e => setIntakeWorkerId(e.target.value)}
                    >
                      <option value="">اختر جهة الإنتاج الموردة...</option>
                      {workers.map((w: Worker) => <option key={w.id} value={w.id}>{w.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1 text-right">
                    <label className="text-[10px] font-black text-slate-400 uppercase">التاريخ واليومية</label>
                    <input 
                      type="date"
                      required
                      className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm font-bold text-right outline-none"
                      value={intakeDate}
                      onChange={e => setIntakeDate(e.target.value)}
                    />
                  </div>
                </div>

                <div className="bg-blue-50/45 p-4 rounded-3xl space-y-4 border border-blue-50">
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 text-right">
                     <span className="text-xs md:text-sm font-black text-blue-600 uppercase">الموديلات الموردة وتفاصيل تشغيلها</span>
                     <div className="flex gap-1 flex-shrink-0">
                       <button 
                          type="button"
                          onClick={() => handleAddIntakeItem(selectedStage)}
                          className={`py-1.5 px-3 rounded-xl text-[10px] md:text-xs font-black transition-all text-white whitespace-nowrap shadow-sm hover:shadow active:scale-95 ${
                            selectedStage === 'cutting' ? 'bg-orange-500 hover:bg-orange-600' : 'bg-blue-600 hover:bg-blue-700'
                          }`}
                       >
                         {selectedStage === 'cutting' ? '+ إضافة قص 🧵' : '+ إضافة تقفيل 🪡'}
                       </button>
                     </div>
                  </div>

                  <div className="space-y-4 max-h-[30vh] overflow-y-auto p-1">
                      {intakeItems.map((item: IntakeItem, idx: number) => {
                        // Force type sync in case it doesn't match selectedStage
                        if (item.type !== selectedStage) {
                          item.type = selectedStage as IntakeItem['type'];
                        }
                       return (
                        <div key={idx} className="bg-white p-4 rounded-2xl space-y-3 shadow-sm relative text-right border border-slate-100">
                           {/* Header line inside the item card to avoid absolute overflows */}
                           <div className="flex justify-between items-center border-b border-slate-100 pb-2 mb-2 flex-row-reverse text-right">
                             <span className="text-xs font-black text-slate-500">البند #{idx + 1}</span>
                             <button 
                               type="button"
                               onClick={() => handleRemoveIntakeItem(idx)}
                               className="bg-red-50 text-red-600 p-1 rounded-full hover:bg-red-100 transition-all border border-red-200 flex items-center justify-center w-7 h-7"
                               title="حذف البند"
                             >
                               <X size={14} />
                             </button>
                           </div>

                           <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-right">
                              <div className="space-y-1 text-right">
                                 <label className="text-[10px] font-black text-slate-400 block text-right">المنتج / موديل الأطفال</label>
                                 <select 
                                   required
                                   className="w-full bg-slate-50 border-none rounded-xl p-2.5 text-xs font-bold text-right outline-none ring-1 ring-slate-100 focus:ring-2 focus:ring-blue-100 transition-all"
                                   value={item.productId}
                                   onChange={e => {
                                     const newItems = [...intakeItems];
                                     newItems[idx].productId = e.target.value;
                                     newItems[idx].variantId = '';
                                     
                                     const prod = products.find((p: Product) => p.id === e.target.value);
                                     if (prod) {
                                       newItems[idx].costPerItem = selectedStage === 'cutting' 
                                         ? (prod.materialsCost || 0) 
                                         : (prod.workshopFee || 0);
                                     }
                                     setIntakeItems(newItems);
                                   }}
                                 >
                                   <option value="">اختر الموديل...</option>
                                   {products.map((p: Product) => <option key={p.id} value={p.id}>{p.name} ({p.code})</option>)}
                                 </select>
                              </div>
                              <div className="space-y-1 text-right">
                                 <label className="text-[10px] font-black text-slate-400 block text-right">اللون / المقاس المتاح بالمخزن</label>
                                 <select 
                                   required
                                   className="w-full bg-slate-50 border-none rounded-xl p-2.5 text-xs font-bold text-right outline-none ring-1 ring-slate-100 focus:ring-2 focus:ring-blue-100 transition-all disabled:opacity-60"
                                   disabled={!item.productId}
                                   value={item.variantId}
                                   onChange={e => {
                                     const newItems = [...intakeItems];
                                     newItems[idx].variantId = e.target.value;
                                     setIntakeItems(newItems);
                                   }}
                                 >
                                   <option value="">اختر متفرع اللون والمقاس...</option>
                                   {products.find((p: Product) => p.id === item.productId)?.variants.map((v: ProductVariant) => (
                                     <option key={v.id} value={v.id}>{v.color} - {v.size}</option>
                                   ))}
                                 </select>
                              </div>
                           </div>

                           <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1 text-right">
                                 <label className="text-[10px] font-black text-slate-400 block text-right">الكمية المسلمة (قطع)</label>
                                 <input 
                                   type="number"
                                   required
                                   className="w-full bg-slate-50 border-none rounded-xl p-2.5 text-xs font-black text-right outline-none ring-1 ring-slate-100 focus:ring-2 focus:ring-emerald-100 transition-all"
                                   value={item.quantity || ''}
                                   placeholder="مثال 50"
                                   onFocus={e => e.target.select()}
                                   onChange={e => {
                                     const newItems = [...intakeItems];
                                     newItems[idx].quantity = parseInt(e.target.value) || 0;
                                     setIntakeItems(newItems);
                                   }}
                                 />
                              </div>
                              <div className="space-y-1 text-right">
                                 <label className="text-[10px] font-black text-slate-400 block text-right">تسعيرة القطعة المستحقة للورشة</label>
                                 <input 
                                   type="number"
                                   required
                                   className="w-full bg-slate-50 border-none rounded-xl p-2.5 text-xs font-black text-right outline-none ring-1 ring-slate-100 focus:ring-2 focus:ring-emerald-100 transition-all"
                                   value={item.costPerItem || ''}
                                   placeholder="ج.م للقطعة"
                                   onFocus={e => e.target.select()}
                                   onChange={e => {
                                     const newItems = [...intakeItems];
                                     newItems[idx].costPerItem = parseFloat(e.target.value) || 0;
                                     setIntakeItems(newItems);
                                   }}
                                 />
                              </div>
                           </div>
                        </div>
                       );
                     })}
                  </div>
                </div>

                <div className="pt-2">
                  <button className="w-full bg-blue-600 text-white font-black py-3 px-6 rounded-2xl text-xs md:text-sm hover:bg-blue-700 active:scale-[0.98] transition-all mt-2 shadow-lg shadow-blue-100 flex items-center justify-center gap-2">
                    <span>تأكيد التشغيل والإنتاج وإضافة لحسابات الورش</span>
                    <span className="flex items-center gap-1">🧵 🪡</span>
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleRegisterPackaging} className="p-6 space-y-4 overflow-y-auto text-right flex-1">
                <div className="space-y-1 text-right">
                  <label className="text-[10px] font-black text-slate-400 uppercase">العاملة القائمة بالتغليف</label>
                  <select 
                    required
                    className="w-full bg-slate-50 border-none rounded-xl p-3 text-xs font-bold text-right outline-none"
                    value={pkgWorkerId}
                    onChange={e => setPkgWorkerId(e.target.value)}
                  >
                    <option value="">اختر العاملة...</option>
                    {workers.map((w: Worker) => <option key={w.id} value={w.id}>{w.name}</option>)}
                  </select>
                </div>

                <div className="space-y-1 text-right">
                  <label className="text-[10px] font-black text-slate-400 uppercase">تاريخ يوم العمل</label>
                  <input 
                    type="date"
                    required
                    className="w-full bg-slate-50 border-none rounded-xl p-3 text-xs font-bold text-right outline-none"
                    value={pkgDate}
                    onChange={e => setPkgDate(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4 col-span-2">
                  <div className="space-y-1 text-right">
                    <label className="text-[10px] font-black text-slate-400">الكمية المغلفة (قطع)</label>
                    <input 
                      type="number"
                      required
                      className="w-full bg-slate-50 border-none rounded-xl p-3 text-xs font-black font-sans text-right outline-none"
                      value={pkgQuantity || ''}
                      placeholder="كم قطعة؟"
                      onFocus={e => e.target.select()}
                      onChange={e => setPkgQuantity(parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <div className="space-y-1 text-right">
                    <label className="text-[10px] font-black text-slate-400">سعر تغليف القطعة</label>
                    <input 
                      type="number"
                      required
                      className="w-full bg-slate-50 border-none rounded-xl p-3 text-xs font-black font-sans text-right outline-none"
                      value={pkgCostPerItem || ''}
                      placeholder="مثال: 5 ج.م"
                      onFocus={e => e.target.select()}
                      onChange={e => setPkgCostPerItem(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                </div>

                {pkgQuantity > 0 && pkgCostPerItem > 0 && (
                  <p className="text-xs font-black text-purple-600 bg-purple-50 text-center py-2.5 rounded-xl border border-purple-100">
                    إجمالي كلفة التغليف للدفعة: { (pkgQuantity * pkgCostPerItem).toLocaleString() } ج.م
                  </p>
                )}

                <div className="pt-2">
                  <button className="w-full bg-purple-600 text-white font-black py-3 px-6 rounded-2xl text-xs md:text-sm hover:bg-purple-700 active:scale-[0.98] transition-all mt-2 shadow-lg shadow-purple-100 flex items-center justify-center gap-2">
                    <span>تأكيد التغليف والتسجيل لحساب العاملة</span>
                    <span>📦</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-[32px] overflow-hidden shadow-2xl text-right">
            <div className="p-6 bg-slate-50 border-b border-slate-100 flex justify-between items-center text-right">
              <h3 className="text-lg font-black text-slate-800">تسجيل سلفة / دفعة تحت الحساب</h3>
              <button onClick={() => setIsPaymentModalOpen(false)} className="text-slate-400 font-bold hover:text-slate-600 p-1">✕</button>
            </div>
            <form onSubmit={handlePayWorker} className="p-6 space-y-4 text-right">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase block text-right">المستفيد المسجل</label>
                <select 
                  required
                  className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm font-bold text-right outline-none"
                  value={payingWorkerId}
                  onChange={e => setPayingWorkerId(e.target.value)}
                >
                  <option value="">اختر العامل...</option>
                  {workers.map((w: Worker) => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase block text-right">مبلغ الدفعة / السلفة (ج.م)</label>
                <input 
                  type="number"
                  required
                  className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm font-black font-sans text-right outline-none"
                  value={paymentAmount || ''}
                  onFocus={e => e.target.select()}
                  onChange={e => setPaymentAmount(parseFloat(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase block text-right">ملاحظات (مثلاً: سلفة، دفعة مقدمة...)</label>
                <textarea 
                  className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm font-bold text-right outline-none"
                  rows={2}
                  placeholder="رقم المعاملة، شيك، دفعة تحت الحساب، إلخ..."
                  value={paymentNote}
                  onChange={e => setPaymentNote(e.target.value)}
                />
              </div>
              <button type="submit" className="w-full bg-emerald-600 text-white font-black py-4 rounded-2xl shadow-xl shadow-emerald-100 hover:bg-emerald-700 transition-all mt-2">
                تأكيد صرف السلفة / الدفعة تحت الحساب
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Worker Modal */}
      {isWorkerModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-[32px] overflow-hidden shadow-2xl text-right">
            <div className="p-6 bg-slate-50 border-b border-slate-100 flex justify-between items-center text-right">
              <h3 className="text-lg font-black text-slate-800">إضافة مصنع أو ورشة جديدة</h3>
              <button onClick={() => setIsWorkerModalOpen(false)} className="text-slate-400 font-bold hover:text-slate-600 p-1">✕</button>
            </div>
            <form onSubmit={handleCreateWorker} className="p-6 space-y-4 text-right">
              <div className="space-y-1 text-right">
                <label className="text-[10px] font-black text-slate-400 uppercase block text-right">اسم المصنع أو العامل القائم بالعمل</label>
                <input 
                  required
                  className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm font-bold text-right outline-none"
                  placeholder="مثال: ورشة الأمل للتطريز"
                  value={newWorker.name || ''}
                  onChange={e => setNewWorker({...newWorker, name: e.target.value})}
                />
              </div>
              <div className="space-y-1 text-right">
                <label className="text-[10px] font-black text-slate-400 uppercase block text-right">رقم الهاتف / التواصل</label>
                <input 
                  type="text"
                  placeholder="مثال: 0100200300"
                  className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm font-bold text-right outline-none"
                  value={newWorker.phone || ''}
                  onChange={e => setNewWorker({...newWorker, phone: e.target.value})}
                />
              </div>
              <div className="space-y-1 text-right">
                <label className="text-[10px] font-black text-slate-400 uppercase block text-right">الدور / المرحلة الأساسية</label>
                <select
                  required
                  className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm font-bold text-right outline-none"
                  value={newWorker.role || 'cutting'}
                  onChange={e => setNewWorker({...newWorker, role: e.target.value})}
                >
                  <option value="cutting">🧵 قص</option>
                  <option value="sewing">🪡 تقفيل / خياطة</option>
                  <option value="packaging">📦 تغليف</option>
                </select>
              </div>
              <button type="submit" className="w-full bg-blue-600 text-white font-black py-4 rounded-2xl shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all mt-4">
                تأكيد تسجيل العامل كجهة إنتاج
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
