import type { VercelRequest, VercelResponse } from "@vercel/node";
import { GoogleGenAI, Type } from "@google/genai";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, x-api-key",
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "OPTIONS") {
    res.writeHead(204, CORS_HEADERS);
    res.end();
    return;
  }

  Object.entries(CORS_HEADERS).forEach(([k, v]) => res.setHeader(k, v));

  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: "مفتاح Gemini API غير مفعّل أو مفقود في إعدادات الخادم. يرجى إضافته من قائمة Secrets.",
    });
  }

  const extractApiKey = process.env.EXTRACT_API_KEY;
  if (extractApiKey) {
    const provided = req.headers["x-api-key"] as string;
    if (!provided || provided !== extractApiKey) {
      return res.status(401).json({ error: "Unauthorized" });
    }
  }

  const { source } = req.body;
  if (!source) {
    return res.status(400).json({ error: "لم يتم تزويد النظام بمدخلات الاستخراج." });
  }

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: { headers: { "User-Agent": "aistudio-build" } },
    });

    const parts: ({ text: string } | { inlineData: { mimeType: string; data: string } })[] = [];
    if (typeof source === "string") {
      parts.push({
        text: `الرجاء مراجعة المحادثة المكتوبة التالية لمحل/براند ملابس أطفال يدعى 'Kidzy'، واستخلاص تفاصيل طلب الأوردر الجديد المذكور بالكامل:\n${source}`,
      });
    } else if (source && typeof source === "object" && source.data && source.mimeType) {
      parts.push({ inlineData: { mimeType: source.mimeType, data: source.data } });
      parts.push({
        text: "الرجاء مراجعة هذه لقطة الشاشة بدقة واستخراج تفاصيل الأوردر الجديد لبراند ملابس أطفال كيدزي.",
      });
    } else {
      return res.status(400).json({ error: "تنسيق بيانات الاستخراج غير مدعوم." });
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
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
                  size: { type: Type.STRING },
                },
              },
            },
          },
        },
      },
    });

    let textResult = response.text;
    if (!textResult && response.candidates?.[0]?.content?.parts?.[0]?.text) {
      textResult = response.candidates[0].content.parts[0].text;
    }
    if (!textResult) textResult = "{}";
    const data = JSON.parse(textResult);
    return res.json(data);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("does not support image") || msg.includes("not supported")) {
      return res.status(400).json({ error: "النموذج لا يدعم معالجة الصور. يرجى استخدام النص بدلاً من الصورة." });
    }
    return res.status(500).json({ error: `فشل الاستخراج: ${msg || "خطأ غير معروف"}` });
  }
}
