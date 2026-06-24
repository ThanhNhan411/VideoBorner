import fs from "node:fs/promises";
import path from "node:path";
import { config, storagePaths } from "../config";

type TtsInput = {
  text: string;
  voice: string;
  rate?: string;
  pitch?: string;
  jobId: string;
};

export async function createVoiceAudio(input: TtsInput): Promise<{ audioPath: string; duration: number }> {
  await fs.mkdir(storagePaths.audio, { recursive: true });
  const audioPath = path.join(storagePaths.audio, `${input.jobId}.mp3`);
  const text = input.text.trim();
  if (!text) throw new Error("Không có nội dung voiceover để tạo audio");

  const audioBuffer = await synthesizeWithRetry({
    text,
    voice: input.voice,
    rate: input.rate ?? "+18%",
    pitch: input.pitch ?? "+0Hz"
  });
  await fs.writeFile(audioPath, audioBuffer);

  return {
    audioPath,
    duration: estimateDuration(text)
  };
}

async function synthesizeWithRetry(input: Required<Pick<TtsInput, "text" | "voice" | "rate" | "pitch">>) {
  let lastError: unknown;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const audio = await synthesize(input);
      if (audio.length > 0) return audio;
      lastError = new Error("TTS trả về file audio rỗng");
    } catch (error) {
      lastError = error;
    }
    await delay(attempt * 800);
  }

  const detail = lastError instanceof Error ? lastError.message : String(lastError);
  throw new Error(
    `Không tạo được audio từ Edge TTS sau 3 lần thử: ${detail}. ` +
      "Nếu lỗi chỉ xảy ra trên Render, hãy cấu hình EDGE_TTS_PROXY vì Microsoft TTS có thể chặn outbound IP của Render."
  );
}

async function synthesize(input: Required<Pick<TtsInput, "text" | "voice" | "rate" | "pitch">>) {
  const edge = await import("edge-tts-universal");
  const communicate = new edge.Communicate(input.text, {
    voice: input.voice,
    rate: input.rate,
    pitch: input.pitch,
    proxy: config.edgeTtsProxy,
    connectionTimeout: 15000
  });
  const chunks: Buffer[] = [];

  for await (const chunk of communicate.stream()) {
    if (chunk.type === "audio" && chunk.data) chunks.push(Buffer.from(chunk.data));
  }

  return Buffer.concat(chunks);
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function estimateDuration(text: string) {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(3, Math.ceil((words / 185) * 60));
}
