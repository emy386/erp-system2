import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

const ALLOWED_TABLES = new Set([
  "products", "orders", "transactions", "users", "workers",
  "production_intakes", "inventory_movements", "general_expenses",
]);

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
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

  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const dbKey = process.env.DB_PROXY_KEY || process.env.VITE_DB_PROXY_KEY;
  const supabaseConfigured = !!((process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL) && (process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY));
  if (supabaseConfigured && !dbKey) {
    return res.status(503).json({ error: "DB proxy write endpoints are locked. Set the DB_PROXY_KEY environment variable to enable writes." });
  }
  if (supabaseConfigured && dbKey) {
    const provided = req.headers["x-db-key"] as string;
    if (!provided || provided !== dbKey) {
      return res.status(401).json({ error: "DB proxy: unauthorized write request. Provide a valid x-db-key header." });
    }
  }

  const table = req.query.table as string;
  if (!ALLOWED_TABLES.has(table)) {
    return res.status(400).json({ error: `Table '${table}' is not accessible via this proxy.` });
  }

  const supabase = getSupabase();
  if (!supabase) return res.json({ success: true, count: 0, note: "Supabase not configured" });

  const { dataList } = req.body;
  if (!Array.isArray(dataList)) return res.status(400).json({ error: "Data list must be an array" });
  if (dataList.length === 0) return res.json({ success: true, count: 0 });

  try {
    const { error: colCheckErr } = await supabase.from(table).select("data").limit(1);
    const noDataCol = !!(colCheckErr && (
      colCheckErr.message.includes("Could not find the 'data' column") ||
      colCheckErr.code === "PGRST204" ||
      colCheckErr.code === "42703"
    ));
    const usesDoc = !noDataCol;

    let uploadPayload = dataList;
    if (usesDoc) {
      uploadPayload = dataList.map((item: Record<string, unknown>) => ({
        id: String(item.id),
        data: item,
        updated_at: new Date().toISOString(),
      }));
    }

    let { error } = await supabase.from(table).upsert(uploadPayload, { onConflict: "id" });

    if (error && !usesDoc && table === "orders") {
      const stripped = uploadPayload.map((item: Record<string, unknown>) => {
        const { screenshot, sentConfirmationMessage, ...rest } = item;
        return rest;
      });
      error = (await supabase.from(table).upsert(stripped, { onConflict: "id" })).error;
    }

    if (error && !usesDoc) {
      const asDocPayload = dataList.map((item: Record<string, unknown>) => ({
        id: String(item.id),
        data: item,
        updated_at: new Date().toISOString(),
      }));
      const retryResult = await supabase.from(table).upsert(asDocPayload, { onConflict: "id" });
      if (!retryResult.error) {
        error = null;
      }
    }

    if (error) return res.status(500).json({ error: error.message });

    const { data: dbIds, error: selectError } = await supabase.from(table).select("id");
    let extraIds: string[] = [];
    if (!selectError && dbIds) {
      const localIds = dataList.map((item: Record<string, unknown>) => String(item.id));
      const localIdSet = new Set(localIds);
      extraIds = dbIds
        .map((item: Record<string, unknown>) => String(item.id))
        .filter((id: string) => !localIdSet.has(id));
      if (extraIds.length > 0) {
        console.log(`🔍 Deleting ${extraIds.length} stale rows from [${table}]: ${JSON.stringify(extraIds)}`);
        const { error: delError } = await supabase.from(table).delete().in("id", extraIds);
        if (delError) {
          console.error(`Failed to delete stale rows from [${table}]:`, delError.message);
          return res.status(500).json({ error: `فشل مسح البيانات القديمة من Supabase: ${delError.message}` });
        }
        console.log(`✅ Successfully deleted ${extraIds.length} stale rows from [${table}].`);
      } else {
        console.log(`🔍 No stale rows to delete from [${table}]`);
      }
    } else if (selectError) {
      console.error(`Failed to select IDs from [${table}]:`, selectError.message);
    }

    return res.json({
      success: true,
      count: dataList.length,
      _debug: {
        localIdCount: dataList.length,
        dbIdCount: dbIds?.length || 0,
        extraIdsCount: extraIds.length,
        selectError: selectError?.message || null,
      }
    });
  } catch (err: unknown) {
    return res.status(500).json({ error: err instanceof Error ? err.message : "Internal server error" });
  }
}
