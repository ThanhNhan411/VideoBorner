import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

dotenv.config();

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const geminiApiKeys = [
  process.env.GEMINI_API_KEY,
  ...(process.env.GEMINI_API_KEYS?.split(",") ?? [])
]
  .map((key) => key?.trim())
  .filter((key): key is string => Boolean(key));

export const config = {
  rootDir,
  port: Number(process.env.PORT ?? 3000),
  appBaseUrl: process.env.APP_BASE_URL ?? "http://localhost:3000",
  storageDir: path.resolve(rootDir, process.env.STORAGE_DIR ?? "storage"),
  databasePath: path.resolve(rootDir, process.env.DATABASE_PATH ?? "storage/jobs/jobs.sqlite"),
  maxImageDownloads: Number(process.env.MAX_IMAGE_DOWNLOADS ?? 4),
  maxImageBytes: Number(process.env.MAX_IMAGE_BYTES ?? 8_000_000),
  defaultVoice: process.env.DEFAULT_VOICE ?? "vi-VN-HoaiMyNeural",
  geminiApiKey: geminiApiKeys[0],
  geminiApiKeys: [...new Set(geminiApiKeys)],
  geminiModel: process.env.GEMINI_MODEL ?? "gemini-2.5-flash",
  kiraApiKey: process.env.KIRA_API_KEY || process.env.OPENAI_API_KEY,
  kiraBaseUrl: process.env.KIRA_BASE_URL || process.env.LOCAL_LLM_BASE_URL || "https://kiraai.vn/api/v1",
  kiraModel: process.env.KIRA_MODEL ?? "kira-mini-1.0",
  enableKiraScript: process.env.ENABLE_KIRA_SCRIPT === "true",
  edgeTtsProxy: process.env.EDGE_TTS_PROXY?.trim() || undefined
};

export const storagePaths = {
  assets: path.join(config.storageDir, "assets"),
  audio: path.join(config.storageDir, "audio"),
  videos: path.join(config.storageDir, "videos"),
  jobs: path.join(config.storageDir, "jobs")
};
