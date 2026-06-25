import express from "express";
import fs from "node:fs";
import { z } from "zod";
import { config } from "../config";
import type { CreateJobInput, JobRecord } from "../types";
import { createJob, getJob, getJobLogs, jobProgress, listJobs, updateJob } from "../services/jobManager";
import { runJob, rerenderJob } from "../services/jobRunner";
import { generateScript } from "../services/scriptGenerator";
import { assertSafePublicUrl } from "../services/urlSafety";

export const jobsRouter = express.Router();

const createJobSchema = z.object({
  productUrl: z.string().url(),
  campaignTitle: z.string().optional(),
  duration: z.union([z.literal(15), z.literal(30), z.literal(45)]).default(30),
  tone: z.enum(["review", "sales", "quick_intro", "trend", "funny", "premium"]).default("review"),
  voice: z.string().default(config.defaultVoice),
  template: z.enum(["clean", "tiktok", "review", "sale"]).default("tiktok"),
  quality: z.enum(["low", "balanced", "high", "ultra"]).default("low"),
  showPrice: z.boolean().default(true),
  showSubtitle: z.boolean().default(true)
});

jobsRouter.post("/", async (req, res, next) => {
  try {
    const input = createJobSchema.parse(req.body) satisfies CreateJobInput;
    await assertSafePublicUrl(input.productUrl);
    const job = createJob(input);
    runJob(job.id);
    res.status(202).json({ jobId: job.id, status: job.status });
  } catch (error) {
    next(error);
  }
});

jobsRouter.get("/", (_req, res) => {
  res.json({ jobs: listJobs().map(toResponse) });
});

jobsRouter.get("/:id", (req, res) => {
  const job = getJob(req.params.id);
  if (!job) return res.status(404).json({ error: "Job không tồn tại" });
  res.json(toResponse(job));
});

jobsRouter.get("/:id/video", (req, res) => {
  const job = getJob(req.params.id);
  if (!job || !job.video_path || !fs.existsSync(job.video_path)) {
    return res.status(404).json({ error: "Video chưa sẵn sàng" });
  }
  res.download(job.video_path);
});

jobsRouter.post("/:id/regenerate-script", async (req, res, next) => {
  try {
    const job = getJob(req.params.id);
    if (!job?.product_json) return res.status(400).json({ error: "Job chưa có dữ liệu sản phẩm" });
    const currentOptions = createJobSchema.parse(JSON.parse(job.options_json || "{}"));
    const options = createJobSchema.parse({ ...currentOptions, ...req.body });
    const script = await generateScript(JSON.parse(job.product_json), options);
    updateJob(job.id, { script_json: JSON.stringify(script), options_json: JSON.stringify(options) });
    res.json({ jobId: job.id, script });
  } catch (error) {
    next(error);
  }
});

jobsRouter.post("/:id/render", async (req, res, next) => {
  try {
    await rerenderJob(req.params.id, req.body);
    const job = getJob(req.params.id);
    res.json(toResponse(job!));
  } catch (error) {
    next(error);
  }
});

function toResponse(job: JobRecord) {
  return {
    jobId: job.id,
    status: job.status,
    progress: jobProgress(job.status),
    product: safeJson(job.product_json),
    script: safeJson(job.script_json),
    assets: safeJson(job.assets_json) ?? [],
    audioPath: job.audio_path,
    videoUrl: job.video_path ? `/api/jobs/${job.id}/video` : null,
    error: job.error_message,
    logs: getJobLogs(job.id),
    createdAt: job.created_at,
    updatedAt: job.updated_at
  };
}

function safeJson(value: string | null) {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}
