import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

import { fetchTable, syncTable } from "@/lib/api";
import type {
  GeneralExpense,
  InventoryMovement,
  Order,
  Product,
  ProductionIntake,
  User,
  Worker,
} from "@/types";

interface AppContextType {
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  products: Product[];
  setProducts: (p: Product[]) => void;
  orders: Order[];
  setOrders: (o: Order[]) => void;
  transactions: any[];
  setTransactions: (t: any[]) => void;
  users: User[];
  setUsers: (u: User[]) => void;
  workers: Worker[];
  setWorkers: (w: Worker[]) => void;
  productionIntakes: ProductionIntake[];
  setProductionIntakes: (i: ProductionIntake[]) => void;
  inventoryMovements: InventoryMovement[];
  setInventoryMovements: (m: InventoryMovement[]) => void;
  generalExpenses: GeneralExpense[];
  setGeneralExpenses: (e: GeneralExpense[]) => void;
  logout: () => void;
  syncStatus: "idle" | "syncing" | "synced" | "error";
  isLoading: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [currentUser, _setCurrentUser] = useState<User | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [productionIntakes, setProductionIntakes] = useState<ProductionIntake[]>([]);
  const [inventoryMovements, setInventoryMovements] = useState<InventoryMovement[]>([]);
  const [generalExpenses, setGeneralExpenses] = useState<GeneralExpense[]>([]);
  const [syncStatus, setSyncStatus] = useState<"idle" | "syncing" | "synced" | "error">("idle");
  const [isLoading, setIsLoading] = useState(true);

  const syncInProgress = useRef(true);

  const setCurrentUser = useCallback(async (user: User | null) => {
    _setCurrentUser(user);
    if (user) {
      await AsyncStorage.setItem("kidzy_user", JSON.stringify(user));
    } else {
      await AsyncStorage.removeItem("kidzy_user");
    }
  }, []);

  const logout = useCallback(() => {
    setCurrentUser(null);
  }, [setCurrentUser]);

  useEffect(() => {
    const restore = async () => {
      try {
        const stored = await AsyncStorage.getItem("kidzy_user");
        if (stored) {
          const u = JSON.parse(stored);
          _setCurrentUser(u);
        }
      } catch (_) {}
    };
    restore();
  }, []);

  useEffect(() => {
    const loadAll = async () => {
      syncInProgress.current = true;
      setSyncStatus("syncing");
      try {
        const tables = [
          "products",
          "orders",
          "transactions",
          "users",
          "workers",
          "production_intakes",
          "inventory_movements",
          "general_expenses",
        ];
        const results = await Promise.allSettled(tables.map(fetchTable));
        results.forEach((r, i) => {
          if (r.status !== "fulfilled") return;
          const data = r.value;
          switch (tables[i]) {
            case "products": setProducts(data); break;
            case "orders": setOrders(data); break;
            case "transactions": setTransactions(data); break;
            case "users":
              setUsers(
                data.map((u: any) => ({
                  ...u,
                  staffRoles: u.staffRoles || [],
                  variableTasks: u.variableTasks || [],
                  permissions: u.permissions || [],
                }))
              );
              break;
            case "workers":
              setWorkers(data.map((w: any) => ({ ...w, payments: w.payments || [] })));
              break;
            case "production_intakes": setProductionIntakes(data); break;
            case "inventory_movements": setInventoryMovements(data); break;
            case "general_expenses": setGeneralExpenses(data); break;
          }
        });
        setSyncStatus("synced");
      } catch {
        setSyncStatus("error");
      } finally {
        syncInProgress.current = false;
        setIsLoading(false);
      }
    };
    loadAll();
  }, []);

  useEffect(() => {
    if (syncInProgress.current) return;
    const timer = setTimeout(() => {
      setSyncStatus("syncing");
      Promise.allSettled([
        syncTable("products", products),
        syncTable("orders", orders),
        syncTable("transactions", transactions),
        syncTable("users", users),
        syncTable("workers", workers),
        syncTable("production_intakes", productionIntakes),
        syncTable("inventory_movements", inventoryMovements),
        syncTable("general_expenses", generalExpenses),
      ]).then((results) => {
        const anyError = results.some((r) => r.status === "rejected");
        setSyncStatus(anyError ? "error" : "synced");
      });
    }, 2000);
    return () => clearTimeout(timer);
  }, [
    products, orders, transactions, users, workers,
    productionIntakes, inventoryMovements, generalExpenses,
  ]);

  return (
    <AppContext.Provider
      value={{
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
        isLoading,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
};
