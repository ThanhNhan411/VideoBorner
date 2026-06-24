import fs from "node:fs/promises";
import path from "node:path";
import { storagePaths } from "../config";

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

  const edge = await import("edge-tts-universal");
  const tts = new edge.EdgeTTS(input.text, input.voice, {
    rate: input.rate ?? "+18%",
    pitch: input.pitch ?? "+0Hz"
  });
  const audio = await tts.synthesize();
  await fs.writeFile(audioPath, Buffer.from(await audio.audio.arrayBuffer()));

  return {
    audioPath,
    duration: estimateDuration(input.text)
  };
}

function estimateDuration(text: string) {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(3, Math.ceil((words / 185) * 60));
}
