import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

dotenv.config();

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
export const config = {
  rootDir,
  port: Number(process.env.PORT ?? 3000),
  appBaseUrl: process.env.APP_BASE_URL ?? "http://localhost:3000",
  storageDir: path.resolve(rootDir, process.env.STORAGE_DIR ?? "storage"),
  databasePath: path.resolve(rootDir, process.env.DATABASE_PATH ?? "storage/jobs/jobs.sqlite"),
  maxImageDownloads: Number(process.env.MAX_IMAGE_DOWNLOADS ?? 2),
  maxImageBytes: Number(process.env.MAX_IMAGE_BYTES ?? 4_000_000),
  defaultVoice: process.env.DEFAULT_VOICE ?? "vi-VN-HoaiMyNeural",
  kiraApiKey: process.env.KIRA_API_KEY || process.env.OPENAI_API_KEY,
  kiraBaseUrl: process.env.KIRA_BASE_URL || process.env.LOCAL_LLM_BASE_URL || "https://kiraai.vn/api/v1",
  kiraModel: process.env.KIRA_MODEL ?? "kira-mini-1.0",
  edgeTtsProxy: process.env.EDGE_TTS_PROXY?.trim() || undefined
};

export const storagePaths = {
  assets: path.join(config.storageDir, "assets"),
  audio: path.join(config.storageDir, "audio"),
  videos: path.join(config.storageDir, "videos"),
  jobs: path.join(config.storageDir, "jobs")
};
