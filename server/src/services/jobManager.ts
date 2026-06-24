import { nanoid } from "nanoid";
import { db } from "../db/sqlite";
import type { CreateJobInput, JobRecord, JobStatus } from "../types";

const progressByStatus: Record<JobStatus, number> = {
  pending: 5,
  crawling: 15,
  downloading_assets: 35,
  generating_script: 50,
  generating_voice: 65,
  rendering_video: 82,
  completed: 100,
  failed: 100
};

export function createJob(input: CreateJobInput): JobRecord {
  const now = new Date().toISOString();
  const id = nanoid(10);
  db.prepare(
    `INSERT INTO jobs
      (id, product_url, status, options_json, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(id, input.productUrl, "pending", JSON.stringify(input), now, now);
  addJobLog(id, "Job created");
  return getJobOrThrow(id);
}

export function getJob(id: string): JobRecord | null {
  return (db.prepare("SELECT * FROM jobs WHERE id = ?").get(id) as JobRecord | undefined) ?? null;
}

export function getJobOrThrow(id: string): JobRecord {
  const job = getJob(id);
  if (!job) throw new Error(`Job ${id} not found`);
  return job;
}

export function listJobs(limit = 10): JobRecord[] {
  return db
    .prepare("SELECT * FROM jobs ORDER BY created_at DESC LIMIT ?")
    .all(limit) as JobRecord[];
}

export function updateJob(id: string, patch: Partial<Omit<JobRecord, "id" | "created_at">>) {
  const entries = Object.entries({ ...patch, updated_at: new Date().toISOString() }).filter(
    ([, value]) => value !== undefined
  );
  const sql = `UPDATE jobs SET ${entries.map(([key]) => `${key} = ?`).join(", ")} WHERE id = ?`;
  db.prepare(sql).run(...entries.map(([, value]) => value), id);
}

export function setJobStatus(id: string, status: JobStatus, message?: string) {
  updateJob(id, { status });
  addJobLog(id, message ?? `Status changed to ${status}`);
}

export function failJob(id: string, error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  updateJob(id, { status: "failed", error_message: message });
  addJobLog(id, `Failed: ${message}`);
}

export function addJobLog(jobId: string, message: string) {
  db.prepare("INSERT INTO job_logs (job_id, message, created_at) VALUES (?, ?, ?)").run(
    jobId,
    message,
    new Date().toISOString()
  );
}

export function getJobLogs(jobId: string): { message: string; created_at: string }[] {
  return db
    .prepare("SELECT message, created_at FROM job_logs WHERE job_id = ? ORDER BY id ASC")
    .all(jobId) as { message: string; created_at: string }[];
}

export function jobProgress(status: JobStatus) {
  return progressByStatus[status] ?? 0;
}
