import { Router, type IRouter } from "express";
import { GoogleGenAI, Type } from "@google/genai";

const router: IRouter = Router();

// ─── Strict table allowlist ───────────────────────────────────────────────────
const ALLOWED_TABLES = new Set([
  "products",
  "orders",
  "transactions",
  "users",
  "workers",
  "production_intakes",
  "inventory_movements",
  "general_expenses",
]);

// ─── Middleware: initialise Supabase on first request ────────────────────────
router.use(async (_req, _res, next) => {
  if (hasSupabase && !supabase) {
    await initSupabase();
  }
  next();
});

// ─── Auth guard for AI extraction endpoint ───────────────────────────────────
const requireApiKey = (req: any, res: any, next: any) => {
  const apiKey = process.env.EXTRACT_API_KEY;
  if (!apiKey) return next();
  const provided = req.headers["x-api-key"] as string;
  if (!provided || provided !== apiKey) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
};

// ─── Auth guard for DB write/sync endpoints ──────────────────────────────────
// When Supabase IS configured (production-like), DB_PROXY_KEY is REQUIRED.
// Set DB_PROXY_KEY in Replit Secrets; the frontend reads it from VITE_DB_PROXY_KEY.
// When Supabase is NOT configured, writes go to localStorage (dev fallback) so
// no key is needed and the guard is skipped.
const requireDbKey = (req: any, res: any, next: any) => {
  // If Supabase is not configured, writes are local no-ops — guard not needed
  if (!hasSupabase) return next();
  const dbKey = process.env.DB_PROXY_KEY;
  // Fail-closed: when Supabase IS configured, DB_PROXY_KEY MUST be set.
  // Without it, write/sync endpoints are locked to prevent unauthorised DB access.
  if (!dbKey) {
    console.error("[DB Proxy] BLOCKED: Supabase is configured but DB_PROXY_KEY is not set. Set the DB_PROXY_KEY secret to enable write operations.");
    return res.status(503).json({ error: "DB proxy write endpoints are locked. Set the DB_PROXY_KEY secret on the server to enable writes." });
  }
  const provided = req.headers["x-db-key"] as string;
  if (!provided || provided !== dbKey) {
    return res.status(401).json({ error: "DB proxy: unauthorized write request. Provide a valid x-db-key header." });
  }
  next();
};

// ─── AI order extraction ─────────────────────────────────────────────────────
router.post("/extract-order", requireApiKey, async (req, res) => {
  const { source } = req.body;
  if (!source) {
    return res.status(400).json({ error: "لم يتم تزويد النظام بمدخلات الاستخراج." });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: "مفتاح Gemini API غير مفعّل أو مفقود في إعدادات الخادم. يرجى إضافته من قائمة Secrets."
    });
  }

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: { headers: { "User-Agent": "aistudio-build" } }
    });

    const parts: any[] = [];
    if (typeof source === "string") {
      parts.push({
        text: `الرجاء مراجعة المحادثة المكتوبة التالية لمحل/براند ملابس أطفال يدعى 'Kidzy'، واستخلاص تفاصيل طلب الأوردر الجديد المذكور بالكامل:\n${source}`
      });
    } else if (source && typeof source === "object" && source.data && source.mimeType) {
      parts.push({ inlineData: { mimeType: source.mimeType, data: source.data } });
      parts.push({
        text: "الرجاء مراجعة هذه لقطة الشاشة بدقة واستخراج تفاصيل الأوردر الجديد لبراند ملابس أطفال كيدزي."
      });
    } else {
      return res.status(400).json({ error: "تنسيق بيانات الاستخراج غير مدعوم." });
    }

    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: parts,
      config: {
        systemInstruction:
          "You are an expert system that extracts order details from Arabic chats or screenshots of chats for an Egyptian children wear brand called Kidzy. Under items list, extract the item names, color, size, quantity of garments needed. Under governorate, try to match it directly to Egyptian governorates (e.g. القاهرة, الجيزة, الإسكندرية, الدقهلية, الغربية, المنوفية, الشرقية, القليوبية, البحيرة, كفر الشيخ, دمياط, بورسعيد, الإسماعيلية, السويس, الفيوم, بني سويف, المنيا, أسيوط, سوهاج, قنا, الأقصر, أسوان). Provide the response strictly matching the schema structure.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            customerName: { type: Type.STRING },
            childName: { type: Type.STRING },
            customerPhone: { type: Type.STRING },
            customerPhone2: { type: Type.STRING },
            governorate: { type: Type.STRING },
            address: { type: Type.STRING },
            discount: { type: Type.NUMBER },
            deliveryDuration: { type: Type.STRING, description: "either 'normal' or 'urgent'" },
            notes: { type: Type.STRING },
            items: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  quantity: { type: Type.NUMBER },
                  price: { type: Type.NUMBER },
                  color: { type: Type.STRING },
                  size: { type: Type.STRING }
                }
              }
            }
          }
        }
      }
    });

    let textResult = response.text;
    if (!textResult && response.candidates?.[0]?.content?.parts?.[0]?.text) {
      textResult = response.candidates[0].content.parts[0].text;
    }
    if (!textResult) textResult = "{}";
    const data = JSON.parse(textResult);
    return res.json(data);
  } catch (err: any) {
    const msg = err.message || "";
    if (msg.includes("does not support image") || msg.includes("not supported")) {
      return res.status(400).json({ error: "النموذج لا يدعم معالجة الصور. يرجى استخدام النص بدلاً من الصورة." });
    }
    return res.status(500).json({ error: `فشل الاستخراج: ${msg || "خطأ غير معروف"}` });
  }
});

// ─── Supabase client (lazy-initialised) ──────────────────────────────────────
const hasSupabase = !!(process.env.VITE_SUPABASE_URL && process.env.VITE_SUPABASE_ANON_KEY);
let supabase: any = null;
const tableHasDataColumn: Record<string, boolean> = {};

async function initSupabase() {
  if (!hasSupabase) return;
  try {
    const { createClient } = await import("@supabase/supabase-js");
    const rawUrl = process.env.VITE_SUPABASE_URL!;
    const supabaseUrl = rawUrl.replace(/\/rest\/v1\/?$/, "").trim();
    const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY!.trim();
    supabase = createClient(supabaseUrl, supabaseAnonKey);

    const tables = Array.from(ALLOWED_TABLES);
    for (const t of tables) {
      try {
        const { error } = await supabase.from(t).select("data").limit(1);
        tableHasDataColumn[t] = !(error && (error.message.includes("Could not find the 'data' column") || error.code === "PGRST204" || error.code === "42703"));
      } catch {
        tableHasDataColumn[t] = false;
      }
    }
  } catch (e) {
    console.warn("[DB Proxy] Supabase init failed:", e);
  }
}

// ─── GET /db/:table — read data ───────────────────────────────────────────────
router.get("/db/:table", async (req, res) => {
  const { table } = req.params;

  if (!ALLOWED_TABLES.has(table)) {
    return res.status(400).json({ error: `Table '${table}' is not accessible via this proxy.` });
  }

  if (!supabase) return res.json([]);

  try {
    const { data, error } = await supabase.from(table).select("*");
    if (error) return res.status(500).json({ error: error.message });
    const usesDoc = tableHasDataColumn[table];
    if (usesDoc && data) {
      const mapped = data.map((row: any) => {
        const payload = typeof row.data === "string" ? JSON.parse(row.data) : row.data;
        return { ...payload, id: row.id };
      });
      return res.json(mapped);
    }
    return res.json(data || []);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
});

// ─── POST /db/:table/sync — upsert + delete orphans ─────────────────────────
router.post("/db/:table/sync", requireDbKey, async (req, res) => {
  const { table } = req.params;

  if (!ALLOWED_TABLES.has(table)) {
    return res.status(400).json({ error: `Table '${table}' is not accessible via this proxy.` });
  }

  if (!supabase) return res.json({ success: true, count: 0 });

  const { dataList } = req.body;
  if (!Array.isArray(dataList)) return res.status(400).json({ error: "Data list must be an array" });

  try {
    const usesDoc = tableHasDataColumn[table];
    let uploadPayload = dataList;
    if (usesDoc) {
      uploadPayload = dataList.map((item: any) => ({
        id: String(item.id),
        data: item,
        updated_at: new Date().toISOString()
      }));
    }
    let { error } = await supabase.from(table).upsert(uploadPayload, { onConflict: "id" });
    if (error && !usesDoc && table === "orders" && (error.message.includes("screenshot") || error.message.includes("sentConfirmationMessage") || error.code === "42703")) {
      const stripped = uploadPayload.map(({ screenshot, sentConfirmationMessage, ...rest }: any) => rest);
      error = (await supabase.from(table).upsert(stripped, { onConflict: "id" })).error;
    }
    if (error) return res.status(500).json({ error: error.message });

    const { data: dbIds, error: selectError } = await supabase.from(table).select("id");
    if (!selectError && dbIds) {
      const localIdSet = new Set(dataList.map((item: any) => String(item.id)));
      const extraIds = dbIds.map((item: any) => String(item.id)).filter((id: string) => !localIdSet.has(id));
      if (extraIds.length > 0) {
        const { error: delError } = await supabase.from(table).delete().in("id", extraIds);
        if (delError) {
          console.error(`Failed to delete stale rows from [${table}]:`, delError.message);
          return res.status(500).json({ error: `خطأ في مسح البيانات القديمة من ${table}: ${delError.message}` });
        }
      }
    } else if (selectError) {
      console.error(`Failed to select IDs from [${table}]:`, selectError.message);
    }
    return res.json({ success: true, count: dataList.length });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
});

export default router;
