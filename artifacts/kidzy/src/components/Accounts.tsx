import React from 'react';
import { useApp } from '../context/AppContext';

export function Accounts() {
  const { users, workers, orders, generalExpenses, products } = useApp();

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-24 text-right" dir="rtl">
      <div className="bg-green-50 p-8 rounded-2xl border border-green-200">
        <h2 className="text-xl font-black text-green-700">Accounts Mounted Successfully</h2>
        <p className="text-green-600 font-bold mt-2">
          users={users?.length} workers={workers?.length} orders={orders?.length} expenses={generalExpenses?.length} products={products?.length}
        </p>
      </div>
    </div>
  );
}