const getBase = () => {
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  if (domain) return `https://${domain}`;
  return "";
};

export const fetchTable = async (tableName: string): Promise<any[]> => {
  const base = getBase();
  const res = await fetch(`${base}/api/db/${tableName}`);
  if (!res.ok) throw new Error(`Failed to load ${tableName}`);
  const data = await res.json();
  return Array.isArray(data) ? data : [];
};

export const syncTable = async (tableName: string, dataList: any[]): Promise<void> => {
  const base = getBase();
  const dbKey = process.env.EXPO_PUBLIC_DB_PROXY_KEY || "";
  const res = await fetch(`${base}/api/db/${tableName}/sync`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(dbKey ? { "x-db-key": dbKey } : {}),
    },
    body: JSON.stringify({ dataList: dataList ?? [] }),
  });
  if (!res.ok) throw new Error(`Failed to sync ${tableName}`);
};
