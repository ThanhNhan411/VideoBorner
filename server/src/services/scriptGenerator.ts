import { GoogleGenAI } from "@google/genai";
import OpenAI from "openai";
import { config } from "../config";
import type { CreateJobInput, GeneratedScript, ProductData, VideoDuration } from "../types";

const toneLabels: Record<string, string> = {
  review: "review chân thật",
  sales: "bán hàng",
  quick_intro: "giới thiệu nhanh",
  trend: "bắt trend",
  funny: "hài hước",
  premium: "sang trọng"
};

const maxAiResponseChars = 12_000;

export async function generateScript(product: ProductData, input: CreateJobInput): Promise<GeneratedScript> {
  if (config.geminiApiKeys.length) {
    try {
      return await generateScriptWithGemini(product, input);
    } catch (error) {
      console.warn(`Gemini script generation failed, trying Kira AI: ${error instanceof Error ? error.message : error}`);
    }
  }

  if (config.kiraApiKey) {
    try {
      return await generateScriptWithKira(product, input);
    } catch (error) {
      console.warn(`Kira script generation failed, falling back to template: ${error instanceof Error ? error.message : error}`);
    }
  }

  return generateTemplateScript(product, input);
}

function generateTemplateScript(product: ProductData, input: CreateJobInput): GeneratedScript {
  const name = product.title;
  const spokenName = compactProductName(name);
  const benefit = product.highlights[0] ?? product.description ?? "dễ dùng trong nhu cầu hằng ngày";
  const priceLine = product.price ? `Giá tham khảo đang hiển thị là ${product.price}.` : "";
  const tone = toneLabels[input.tone] ?? "review chân thật";

  const blocks = [
    `${spokenName} này đáng chú ý vì nhìn khá gọn mà vẫn thực dụng.`,
    `Nếu bạn đang tìm một lựa chọn ${tone}, điểm nên xem trước là: ${benefit}.`,
    priceLine,
    product.description ? `Mô tả sản phẩm nhấn mạnh: ${product.description.slice(0, 160)}.` : "",
    `Thông tin mình dùng đều lấy từ trang sản phẩm, nên bạn vẫn nên mở link để kiểm tra chi tiết trước khi mua.`,
    `Ai thấy hợp nhu cầu thì lưu lại để so sánh thêm nha.`
  ].filter(Boolean);

  const voiceover = trimForDuration(blocks.join(" "), input.duration);
  const scenes = buildScenes(input.duration, product, voiceover, spokenName);
  const hashtags = ["#reviewsanpham", "#muasamthongminh", "#tiktokshop", "#dealhot"];

  return {
    title: input.campaignTitle || spokenName,
    duration: input.duration,
    voiceover,
    scenes,
    caption: `${spokenName} - xem nhanh điểm nổi bật trước khi mua. ${product.price ? `Giá tham khảo: ${product.price}.` : ""}`.trim(),
    hashtags,
    cta: "Lưu lại để xem khi cần"
  };
}

async function generateScriptWithGemini(product: ProductData, input: CreateJobInput): Promise<GeneratedScript> {
  const spokenName = compactProductName(product.title);
  const prompt = buildGeminiPrompt(product, input, spokenName);
  const models = uniqueValues([config.geminiModel, "gemini-2.5-flash", "gemini-2.0-flash"]);
  let lastError: unknown;

  for (const [keyIndex, apiKey] of config.geminiApiKeys.entries()) {
    const ai = new GoogleGenAI({ apiKey });

    for (const model of models) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            maxOutputTokens: 700,
            temperature: 0.75
          }
        });

        const parsed = parseJsonResponse(response.text ?? "");
        return normalizeGeneratedScript(parsed, product, input, spokenName);
      } catch (error) {
        lastError = error;
        console.warn(`Gemini key ${keyIndex + 1} failed with model ${model}: ${error instanceof Error ? error.message : error}`);
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

async function generateScriptWithKira(product: ProductData, input: CreateJobInput): Promise<GeneratedScript> {
  const spokenName = compactProductName(product.title);
  const prompt = buildGeminiPrompt(product, input, spokenName);
  const client = new OpenAI({
    baseURL: config.kiraBaseUrl,
    apiKey: config.kiraApiKey,
    timeout: 25_000,
    maxRetries: 1
  });

  const response = await client.chat.completions.create({
    model: config.kiraModel,
    messages: [
      {
        role: "system",
        content: "You are a Vietnamese TikTok Shop copywriter. Return only valid JSON."
      },
      { role: "user", content: prompt }
    ],
    max_tokens: 700,
    temperature: 0.75
  });

  const text = response.choices[0]?.message.content ?? "";
  const parsed = parseJsonResponse(text);
  return normalizeGeneratedScript(parsed, product, input, spokenName);
}

function buildGeminiPrompt(product: ProductData, input: CreateJobInput, spokenName: string) {
  return [
    "Bạn là copywriter TikTok Shop tiếng Việt.",
    "Hãy tạo kịch bản video ngắn dạng TikTok/Reels cho sản phẩm dựa CHỈ trên dữ liệu được cung cấp.",
    "Không bịa công dụng, không cam kết chữa bệnh/giảm cân/trị bệnh, không dùng lời quá đà.",
    "Nếu thiếu dữ liệu thì dùng câu trung tính. Giọng văn tự nhiên, nói được bằng TTS.",
    "Mỗi câu voiceover nên ngắn, khoảng 8-12 từ. Tránh một câu dài nối nhiều ý.",
    "Dùng tên đọc ngắn trong title, voiceover, caption và overlayText để tránh câu quá dài.",
    "",
    `Tone: ${toneLabels[input.tone] ?? "review chân thật"}`,
    `Thời lượng: ${input.duration}s`,
    `Tên đầy đủ: ${limitText(product.title, 180)}`,
    `Tên đọc ngắn: ${spokenName}`,
    `Giá: ${limitText(product.price ?? "không có", 80)}`,
    `Mô tả: ${limitText(product.description ?? "không có", 700)}`,
    `Điểm nổi bật: ${product.highlights.length ? product.highlights.map((item) => limitText(item, 140)).join("; ") : "không có"}`,
    `Shop/brand: ${limitText(product.shopName ?? product.brand ?? "không có", 100)}`,
    "",
    "Trả về JSON thuần, không markdown, đúng schema:",
    JSON.stringify({
      title: "string",
      duration: input.duration,
      voiceover: "string",
      scenes: [
        {
          index: 1,
          start: 0,
          end: 3.75,
          visualHint: "string",
          overlayText: "string"
        }
      ],
      caption: "string",
      hashtags: ["#hashtag"],
      cta: "string"
    })
  ].join("\n");
}

function parseJsonResponse(text: string): unknown {
  if (text.length > maxAiResponseChars) {
    throw new Error(`AI trả về nội dung quá lớn (${text.length} ký tự)`);
  }
  const trimmed = text.trim();
  const json = trimmed.startsWith("```") ? trimmed.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "") : trimmed;
  return JSON.parse(json);
}

function limitText(value: string, maxLength: number) {
  return value.replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function normalizeGeneratedScript(
  value: unknown,
  product: ProductData,
  input: CreateJobInput,
  spokenName: string
): GeneratedScript {
  if (!value || typeof value !== "object") {
    throw new Error("Gemini không trả về JSON object");
  }

  const object = value as Partial<GeneratedScript>;
  const fallback = generateTemplateScript(product, input);
  const sceneCount = input.duration === 15 ? 4 : input.duration === 30 ? 5 : 6;
  const sceneLength = input.duration / sceneCount;
  const scenes = Array.isArray(object.scenes)
    ? object.scenes.slice(0, sceneCount).map((scene, index) => ({
        index: index + 1,
        start: Number.isFinite(scene.start) ? Number(scene.start) : Number((index * sceneLength).toFixed(2)),
        end: Number.isFinite(scene.end) ? Number(scene.end) : Number(((index + 1) * sceneLength).toFixed(2)),
        visualHint: cleanText(scene.visualHint, fallback.scenes[index]?.visualHint ?? `Góc sản phẩm ${index + 1}`, 90),
        overlayText: cleanText(scene.overlayText, fallback.scenes[index]?.overlayText ?? spokenName, 80)
      }))
    : fallback.scenes;

  while (scenes.length < sceneCount) {
    const index = scenes.length;
    scenes.push({
      index: index + 1,
      start: Number((index * sceneLength).toFixed(2)),
      end: Number(((index + 1) * sceneLength).toFixed(2)),
      visualHint: fallback.scenes[index]?.visualHint ?? `Góc sản phẩm ${index + 1}`,
      overlayText: fallback.scenes[index]?.overlayText ?? spokenName
    });
  }

  return {
    title: cleanScriptText(object.title, input.campaignTitle || spokenName, 80, product.title, spokenName),
    duration: input.duration,
    voiceover: trimForDuration(cleanScriptText(object.voiceover, fallback.voiceover, 900, product.title, spokenName), input.duration),
    scenes: scenes.map((scene) => ({
      ...scene,
      overlayText: cleanScriptText(scene.overlayText, spokenName, 80, product.title, spokenName)
    })),
    caption: cleanScriptText(object.caption, fallback.caption, 220, product.title, spokenName),
    hashtags: normalizeHashtags(object.hashtags, fallback.hashtags),
    cta: cleanText(object.cta, fallback.cta, 80)
  };
}

function cleanText(value: unknown, fallback: string, maxLength: number) {
  const text = typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
  return (text || fallback).slice(0, maxLength).trim();
}

function cleanScriptText(
  value: unknown,
  fallback: string,
  maxLength: number,
  fullName: string,
  shortName: string
) {
  const text = cleanText(value, fallback, maxLength * 2)
    .replaceAll(fullName, shortName)
    .replace(/\s+/g, " ")
    .trim();
  return text.slice(0, maxLength).trim();
}

function normalizeHashtags(value: unknown, fallback: string[]) {
  if (!Array.isArray(value)) return fallback;
  const hashtags = value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean)
    .map((item) => (item.startsWith("#") ? item : `#${item.replace(/^#+/, "")}`))
    .slice(0, 8);
  return hashtags.length ? hashtags : fallback;
}

function uniqueValues(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

function trimForDuration(text: string, duration: VideoDuration) {
  const maxWords = duration === 15 ? 55 : duration === 30 ? 95 : 140;
  const words = text.split(/\s+/);
  if (words.length <= maxWords) return text;
  const truncated = words.slice(0, maxWords).join(" ");
  const lastSentenceEnd = Math.max(truncated.lastIndexOf("."), truncated.lastIndexOf("!"), truncated.lastIndexOf("?"));
  return lastSentenceEnd > 40 ? truncated.slice(0, lastSentenceEnd + 1) : `${truncated}.`;
}

function buildScenes(
  duration: VideoDuration,
  product: ProductData,
  voiceover: string,
  spokenName: string
): GeneratedScript["scenes"] {
  const sceneCount = duration === 15 ? 4 : duration === 30 ? 5 : 6;
  const sceneLength = duration / sceneCount;
  const overlays = [
    spokenName,
    product.price ? `Giá tham khảo: ${product.price}` : "Xem nhanh điểm nổi bật",
    product.highlights[0] ?? "Thiết kế dễ dùng",
    product.highlights[1] ?? "Phù hợp nhu cầu hằng ngày",
    "Kiểm tra link trước khi mua",
    "Lưu lại để tham khảo"
  ];

  return Array.from({ length: sceneCount }, (_, index) => ({
    index: index + 1,
    start: Number((index * sceneLength).toFixed(2)),
    end: Number(((index + 1) * sceneLength).toFixed(2)),
    visualHint: index === 0 ? "Ảnh chính sản phẩm" : `Góc sản phẩm ${index + 1}`,
    overlayText: overlays[index] ?? voiceover.split(".")[index]?.trim() ?? "Xem thêm trong link"
  }));
}

function compactProductName(title: string) {
  const firstPart = title
    .split(/\s+[–-]\s+|,|\||\//)[0]
    .replace(/\s+/g, " ")
    .trim();
  const words = (firstPart || title).split(/\s+/).slice(0, 8);
  return words.join(" ");
}
