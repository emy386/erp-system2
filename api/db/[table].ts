import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

const ALLOWED_TABLES = new Set([
  "products", "orders", "transactions", "users", "workers",
  "production_intakes", "inventory_movements", "general_expenses",
]);

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, x-db-key",
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

  const table = req.query.table as string;

  if (req.method !== "GET") {
    // DELETE: remove a single record by id
    if (req.method === "DELETE") {
      if (!ALLOWED_TABLES.has(table)) {
        return res.status(400).json({ error: `Table '${table}' is not accessible via this proxy.` });
      }
      const dbKey = process.env.DB_PROXY_KEY || process.env.VITE_DB_PROXY_KEY;
      if (dbKey) {
        const provided = req.headers["x-db-key"] as string;
        if (!provided || provided !== dbKey) {
          return res.status(401).json({ error: "Unauthorized delete request. Provide a valid x-db-key header." });
        }
      }
      const id = req.query.id as string;
      if (!id) return res.status(400).json({ error: "Query parameter 'id' is required for DELETE." });
      const supabase = getSupabase();
      if (!supabase) return res.status(503).json({ error: "Supabase not configured" });
      try {
        const { error } = await supabase.from(table).delete().eq("id", id);
        if (error) return res.status(500).json({ error: error.message });
        return res.json({ success: true, deleted: id });
      } catch (err: unknown) {
        return res.status(500).json({ error: err instanceof Error ? err.message : "Internal server error" });
      }
    }
    return res.status(405).json({ error: "Method not allowed" });
  }

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
