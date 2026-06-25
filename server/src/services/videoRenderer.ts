import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import fs from "node:fs/promises";
import path from "node:path";
import { config, storagePaths } from "../config";
import type { RenderInput } from "../types";
import { getQualityProfile } from "./qualityProfiles";

export async function renderProductVideo(input: RenderInput): Promise<string> {
  await fs.mkdir(storagePaths.videos, { recursive: true });

  const entryPoint = path.resolve(config.rootDir, "remotion/index.ts");
  const serveUrl = await bundle({ entryPoint });
  const outputPath = path.join(storagePaths.videos, `${input.jobId}.mp4`);
  const profile = getQualityProfile(input.options.quality);
  const renderInput = {
    ...input,
    images: input.images.map(fileToStorageUrl),
    audioPath: fileToStorageUrl(input.audioPath),
    options: {
      ...input.options,
      logoPath: input.options.logoPath ? fileToStorageUrl(input.options.logoPath) : undefined,
      backgroundMusicPath: input.options.backgroundMusicPath
        ? fileToStorageUrl(input.options.backgroundMusicPath)
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
    crf: profile.crf,
    outputLocation: outputPath,
    inputProps: renderInput,
    concurrency: 1
  });

  return outputPath;
}

function fileToStorageUrl(filePath: string) {
  const absolutePath = path.resolve(filePath);
  const relativePath = path.relative(config.storageDir, absolutePath);
  if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    throw new Error(`File render nằm ngoài STORAGE_DIR: ${absolutePath}`);
  }

  const encodedPath = relativePath
    .split(path.sep)
    .map((part) => encodeURIComponent(part))
    .join("/");
  return `http://127.0.0.1:${config.port}/storage/${encodedPath}`;
}
