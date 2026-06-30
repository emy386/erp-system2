import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

const ALLOWED_TABLES = new Set([
  "products", "orders", "transactions", "users", "workers",
  "production_intakes", "inventory_movements", "general_expenses",
]);

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function getSupabase() {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url.replace(/\/rest\/v1\/?$/, "").trim(), key.trim());
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "OPTIONS") {
    res.writeHead(204, CORS_HEADERS);
    res.end();
    return;
  }

  Object.entries(CORS_HEADERS).forEach(([k, v]) => res.setHeader(k, v));

  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const table = req.query.table as string;
  if (!ALLOWED_TABLES.has(table)) {
    return res.status(400).json({ error: `Table '${table}' is not accessible via this proxy.` });
  }

  const supabase = getSupabase();
  if (!supabase) return res.json([]);

  try {
    const { data, error } = await supabase.from(table).select("*");
    if (error) return res.status(500).json({ error: error.message });

    if (data && data.length > 0 && "data" in data[0]) {
      const mapped = data.map((row: Record<string, unknown>) => {
        const payload = typeof row.data === "string" ? JSON.parse(row.data) : row.data;
        return { ...(payload as object), id: row.id };
      });
      return res.json(mapped);
    }
    return res.json(data || []);
  } catch (err: unknown) {
    return res.status(500).json({ error: err instanceof Error ? err.message : "Internal server error" });
  }
}
