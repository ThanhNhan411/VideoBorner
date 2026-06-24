import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import fs from "node:fs/promises";
import path from "node:path";
import { config, storagePaths } from "../config";
import type { RenderInput } from "../types";

export async function renderProductVideo(input: RenderInput): Promise<string> {
  await fs.mkdir(storagePaths.videos, { recursive: true });

  const entryPoint = path.resolve(config.rootDir, "remotion/index.ts");
  const serveUrl = await bundle({ entryPoint });
  const outputPath = path.join(storagePaths.videos, `${input.jobId}.mp4`);
  const renderInput = {
    ...input,
    images: await Promise.all(input.images.map(fileToDataUrl)),
    audioPath: await fileToDataUrl(input.audioPath),
    options: {
      ...input.options,
      logoPath: input.options.logoPath ? await fileToDataUrl(input.options.logoPath) : undefined,
      backgroundMusicPath: input.options.backgroundMusicPath
        ? await fileToDataUrl(input.options.backgroundMusicPath)
        : undefined
    }
  };

  const composition = await selectComposition({
    serveUrl,
    id: "ProductVideo",
    inputProps: renderInput
  });

  await renderMedia({
    composition,
    serveUrl,
    codec: "h264",
    outputLocation: outputPath,
    inputProps: renderInput
  });

  return outputPath;
}

async function fileToDataUrl(filePath: string) {
  const absolutePath = path.resolve(filePath);
  const buffer = await fs.readFile(absolutePath);
  return `data:${mimeType(absolutePath)};base64,${buffer.toString("base64")}`;
}

function mimeType(filePath: string) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  if (ext === ".mp3") return "audio/mpeg";
  if (ext === ".wav") return "audio/wav";
  return "image/jpeg";
}
