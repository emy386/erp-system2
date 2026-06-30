/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { 
  User, Product, Order, Worker, ProductionIntake, Transaction,
  InventoryMovement, GeneralExpense, AppContextType 
} from '../types';
import { supabase } from '../lib/supabase';

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Current logged-in user
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const data = localStorage.getItem("kidzy_user");
    if (data) {
      try {
        return JSON.parse(data);
      } catch (e) {
        console.error("Error parsing user from storage", e);
      }
    }
    return null;
  });

  // Products state (models/items)
  const [products, setProducts] = useState<Product[]>(() => {
    const local = localStorage.getItem("kidzy_products_v2");
    if (!local) return [];
    try {
      return JSON.parse(local);
    } catch {
      return [];
    }
  });

  // Orders state
  const [orders, setOrders] = useState<Order[]>(() => {
    const local = localStorage.getItem("kidzy_orders");
    if (!local) return [];
    try {
      return JSON.parse(local);
    } catch {
      return [];
    }
  });

  // Transactions state
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const local = localStorage.getItem("kidzy_transactions");
    if (!local) return [];
    try { return JSON.parse(local); } catch { return []; }
  });

  // Users (Staff) state
  const [users, setUsers] = useState<User[]>(() => {
    const local = localStorage.getItem("kidzy_users");
    if (!local) return [];
    try {
      return JSON.parse(local);
    } catch {
      return [];
    }
  });

  // Workshop Workers / Tailors state
  const [workers, setWorkers] = useState<Worker[]>(() => {
    const local = localStorage.getItem("kidzy_workers");
    if (!local) return [];
    try {
      const parsed = JSON.parse(local);
      return parsed.map((item: Record<string, unknown>) => ({
        ...item,
        payments: item.payments || []
      }));
    } catch (e) {
      console.error("Error parsing workers", e);
      return [];
    }
  });

  // Production Intakes state
  const [productionIntakes, setProductionIntakes] = useState<ProductionIntake[]>(() => {
    const local = localStorage.getItem("kidzy_intakes");
    return local ? JSON.parse(local) : [];
  });

  // Inventory Movements state
  const [inventoryMovements, setInventoryMovements] = useState<InventoryMovement[]>(() => {
    const local = localStorage.getItem("kidzy_movements");
    return local ? JSON.parse(local) : [];
  });

  // General Expenses state
  const [generalExpenses, setGeneralExpenses] = useState<GeneralExpense[]>(() => {
    const local = localStorage.getItem("kidzy_expenses");
    return local ? JSON.parse(local) : [];
  });

  // Handle urgent deadline date expirations automatically on start
  useEffect(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    setOrders(prevOrders => {
      let changed = false;
      const updated = prevOrders.map(o => {
        if ((o.isUrgent || o.deliveryDuration === "urgent") && o.status !== "delivered") {
          const deadline = new Date(o.deadlineDate);
          deadline.setHours(0, 0, 0, 0);
          if (deadline.getTime() < today.getTime()) {
            changed = true;
            return {
              ...o,
              isUrgent: false,
              deliveryDuration: "normal" as const,
              lastUpdateDate: new Date().toISOString()
            };
          }
        }
        return o;
      });
      return changed ? updated : prevOrders;
    });
  }, []);

  const syncInProgress = useRef(true);
  const syncErrors = useRef<Record<string, string>>({});
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'error'>('idle');
  const [syncMessage, setSyncMessage] = useState<string>('');

  // 1. Initial Load from Database via Proxy on mount
  useEffect(() => {
    const loadDataFromDatabase = async () => {
      console.log("⚡ Initiating database sync via server proxy...");
      syncInProgress.current = true;
      setSyncStatus('syncing');
      setSyncMessage('جاري الاتصال بـ Supabase وشحن الجداول...');

      // Capture current local state BEFORE any overwrites, so we can push it
      // to Supabase when the remote table is empty (first-time setup or empty DB).
      const localSnapshot = {
        products:            JSON.parse(localStorage.getItem("kidzy_products_v2") || "[]"),
        orders:              JSON.parse(localStorage.getItem("kidzy_orders")       || "[]"),
        transactions:        JSON.parse(localStorage.getItem("kidzy_transactions") || "[]"),
        users:               JSON.parse(localStorage.getItem("kidzy_users")        || "[]"),
        workers:             JSON.parse(localStorage.getItem("kidzy_workers")      || "[]"),
        production_intakes:  JSON.parse(localStorage.getItem("kidzy_intakes")     || "[]"),
        inventory_movements: JSON.parse(localStorage.getItem("kidzy_movements")   || "[]"),
        general_expenses:    JSON.parse(localStorage.getItem("kidzy_expenses")     || "[]"),
      } as Record<string, unknown[]>;

      try {
        const tables = [
          "products", "orders", "transactions", "users", 
          "workers", "production_intakes", "inventory_movements", "general_expenses"
        ];

        const fetchTable = async (tableName: string) => {
          const res = await fetch(`/api/db/${tableName}`);
          if (!res.ok) {
            const errText = await res.text();
            throw new Error(errText || `Failed to load table ${tableName}`);
          }
          return res.json();
        };

        const results = await Promise.allSettled(tables.map(t => fetchTable(t)));

        // Tables where Supabase was empty but local had data — we need to push up
        const tablesNeedingUpload: string[] = [];

        const errors: string[] = [];
        results.forEach((result, idx) => {
          const tableName = tables[idx];

          if (result.status === "fulfilled" && result.value !== undefined) {
            const data = (result.value || []) as unknown[];
            console.log(`✅ Loaded ${data.length} records for table [${tableName}] via proxy.`);

            if (data.length > 0) {
              // Supabase has data — use it as the authoritative source
              if (tableName === "products") {
                setProducts(data as Product[]);
              } else if (tableName === "orders") {
                setOrders(data as Order[]);
              } else if (tableName === "transactions") {
                setTransactions(data as Transaction[]);
              } else if (tableName === "users") {
                const normalizedUsers = (data as User[]).map(u => ({
                  ...u,
                  staffRoles: u.staffRoles || [],
                  variableTasks: u.variableTasks || [],
                  permissions: u.permissions || []
                }));
                setUsers(normalizedUsers);
              } else if (tableName === "workers") {
                const normalizedWorkers = (data as Worker[]).map(w => ({
                  ...w,
                  payments: w.payments || []
                }));
                setWorkers(normalizedWorkers);
              } else if (tableName === "production_intakes") {
                setProductionIntakes(data as ProductionIntake[]);
              } else if (tableName === "inventory_movements") {
                setInventoryMovements(data as InventoryMovement[]);
              } else if (tableName === "general_expenses") {
                setGeneralExpenses(data as GeneralExpense[]);
              }
            } else {
              // Supabase returned empty — keep local state as-is (already initialised
              // from localStorage in useState) and schedule an upload only if this
              // is the very first time the app has ever been used (no sync flag).
              const localData = localSnapshot[tableName] || [];
              const hasSyncedBefore = localStorage.getItem("kidzy_sync_done");
              if (localData.length > 0 && !hasSyncedBefore) {
                console.log(`📤 Table [${tableName}] is empty on Supabase — will push ${localData.length} local records up.`);
                tablesNeedingUpload.push(tableName);
              }
            }
          } else {
            const errMsg = result.status === "rejected" ? (result.reason?.message || result.reason || "") : "";
            console.warn(`⚠️ Table [${tableName}] could not load from proxy. Fallback is active.`, errMsg);
            errors.push(`${tableName} (${errMsg})`);
          }
        });

        // Push local data up to Supabase for any tables that were empty remotely
        if (tablesNeedingUpload.length > 0) {
          const dbKey = import.meta.env.VITE_DB_PROXY_KEY || "";
          await Promise.allSettled(
            tablesNeedingUpload.map(async (tableName) => {
              try {
                const res = await fetch(`/api/db/${tableName}/sync`, {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    ...(dbKey ? { "x-db-key": dbKey } : {})
                  },
                  body: JSON.stringify({ dataList: localSnapshot[tableName] || [] })
                });
                if (res.ok) {
                  console.log(`☁️ Uploaded ${(localSnapshot[tableName] || []).length} local records to [${tableName}] in Supabase.`);
                }
              } catch (e) {
                console.warn(`Failed to upload local data for [${tableName}]:`, e);
              }
            })
          );
        }

        // Mark first sync as done so we never re-upload from localStorage
        // when Supabase is intentionally cleared.
        localStorage.setItem("kidzy_sync_done", "true");

        if (errors.length > 0) {
          setSyncStatus('error');
          setSyncMessage(`فشل شحن بعض الجداول: ${errors.join(', ')}`);
        } else {
          setSyncStatus('synced');
          setSyncMessage('متصل بـ Supabase وجميع الجداول متزامنة بنجاح!');
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error("Error loading database sync via proxy:", err);
        setSyncStatus('error');
        setSyncMessage(`فشل الاتصال بـ Supabase: ${msg}`);
      } finally {
        syncInProgress.current = false;
      }
    };

    loadDataFromDatabase();
  }, []);

  // 2. Sync to LocalStorage on state actions (resilient backup)
  useEffect(() => {
    localStorage.setItem("kidzy_products_v2", JSON.stringify(products));
    localStorage.setItem("kidzy_orders", JSON.stringify(orders));
    localStorage.setItem("kidzy_transactions", JSON.stringify(transactions));
    localStorage.setItem("kidzy_users", JSON.stringify(users));
    localStorage.setItem("kidzy_workers", JSON.stringify(workers));
    localStorage.setItem("kidzy_intakes", JSON.stringify(productionIntakes));
    localStorage.setItem("kidzy_movements", JSON.stringify(inventoryMovements));
    localStorage.setItem("kidzy_expenses", JSON.stringify(generalExpenses));
    if (currentUser) {
      localStorage.setItem("kidzy_user", JSON.stringify(currentUser));
    } else {
      localStorage.removeItem("kidzy_user");
    }
  }, [
    products, orders, transactions, users, workers, 
    productionIntakes, inventoryMovements, generalExpenses, currentUser
  ]);

  // 3. Debounced synchronization of state changes back to Supabase via proxy.
  // No syncInProgress guard here — the initial load never overwrites non-empty
  // state, so there is no risk of accidentally wiping Supabase data.
  useEffect(() => {
    const syncTable = async (tableName: string, dataList: unknown[]): Promise<string | null> => {
      try {
        const dbKey = import.meta.env.VITE_DB_PROXY_KEY || "";
        const res = await fetch(`/api/db/${tableName}/sync`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(dbKey ? { "x-db-key": dbKey } : {})
          },
          body: JSON.stringify({ dataList: dataList || [] })
        });

        if (!res.ok) {
          let errMsg = `Failed to sync table ${tableName}`;
          try {
            const rawText = await res.text();
            console.log(`🔍 SYNC DEBUG [${tableName}] status=${res.status} url=${res.url} response=`, rawText);
            if (rawText) {
              try { errMsg = JSON.parse(rawText).error || rawText; }
              catch { errMsg = rawText; }
            }
          } catch { /* body unreadable */ }
          throw new Error(errMsg);
        }

        localStorage.setItem("kidzy_sync_done", "true");
        const body = await res.json();
        console.log(`☁️ Synced ${dataList.length} items to [${tableName}].`, body._debug || "");
        return null; // success
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : "Network Error";
        console.warn(`Sync failed for [${tableName}]:`, errMsg);
        return `[${tableName}]: ${errMsg}`; // error string
      }
    };

    // Debounce: wait 800ms after the last change before syncing, to batch rapid edits
    const debounceTimer = setTimeout(async () => {
      // Skip sync if initial load is still in progress (data not ready yet)
      if (syncInProgress.current) return;

      setSyncStatus('syncing');
      setSyncMessage('جاري حفظ البيانات في Supabase...');

      const results = await Promise.allSettled([
        syncTable("products", products),
        syncTable("orders", orders),
        syncTable("transactions", transactions),
        syncTable("users", users),
        syncTable("workers", workers),
        syncTable("production_intakes", productionIntakes),
        syncTable("inventory_movements", inventoryMovements),
        syncTable("general_expenses", generalExpenses),
      ]);

      const errors: string[] = [];
      for (const r of results) {
        if (r.status === "rejected") {
          errors.push(`Network error`);
        } else if (r.value) {
          errors.push(r.value);
        }
      }

      if (errors.length > 0) {
        setSyncStatus('error');
        setSyncMessage(`فشل حفظ البيانات في Supabase — ${errors.join(' | ')}`);
      } else {
        setSyncStatus('synced');
        setSyncMessage('تم حفظ البيانات في Supabase ✨');
      }
    }, 800);

    return () => clearTimeout(debounceTimer);
  }, [
    products, orders, transactions, users, workers, 
    productionIntakes, inventoryMovements, generalExpenses
  ]);

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem("kidzy_user");
  };

  return (
    <AppContext.Provider value={{
      currentUser, setCurrentUser,
      products, setProducts,
      orders, setOrders,
      transactions, setTransactions,
      users, setUsers,
      workers, setWorkers,
      productionIntakes, setProductionIntakes,
      inventoryMovements, setInventoryMovements,
      generalExpenses, setGeneralExpenses,
      logout,
      syncStatus,
      syncMessage
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
};
