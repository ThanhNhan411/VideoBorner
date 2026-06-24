import fs from "node:fs/promises";
import path from "node:path";
import { config } from "../config";
import type { JobRecord } from "../types";
import { addJobLog, listJobsWithFiles, updateJob } from "./jobManager";

export async function deleteOldJobFiles(keepJobId: string) {
  const jobs = listJobsWithFiles(keepJobId);

  for (const job of jobs) {
    const paths = collectJobPaths(job);
    await Promise.all(paths.map(removeStoragePath));
    updateJob(job.id, { video_path: null, audio_path: null, assets_json: null });
    addJobLog(job.id, "Deleted generated files after a newer video was created");
  }
}

function collectJobPaths(job: JobRecord) {
  const paths = new Set<string>();
  if (job.video_path) paths.add(job.video_path);
  if (job.audio_path) paths.add(job.audio_path);

  for (const assetPath of parseAssets(job.assets_json)) {
    paths.add(assetPath);
    paths.add(path.dirname(assetPath));
  }

  return [...paths];
}

function parseAssets(value: string | null) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

async function removeStoragePath(filePath: string) {
  const resolvedPath = path.resolve(filePath);
  const storageRoot = path.resolve(config.storageDir);
  if (resolvedPath !== storageRoot && !resolvedPath.startsWith(`${storageRoot}${path.sep}`)) return;

  await fs.rm(resolvedPath, { force: true, recursive: true });
}
