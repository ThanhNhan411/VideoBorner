import { config } from "../config";
import { createJob, getJobOrThrow } from "../services/jobManager";
import { runJobSync } from "../services/jobRunner";
import type { CreateJobInput, VideoDuration } from "../types";

const args = parseArgs(process.argv.slice(2));

if (!args.url) {
  console.error('Usage: npm run create-video -- --url "https://example.com/product" --duration 30 --tone review');
  process.exit(1);
}

const input: CreateJobInput = {
  productUrl: args.url,
  campaignTitle: args.title,
  duration: parseDuration(args.duration),
  tone: (args.tone as CreateJobInput["tone"]) || "review",
  voice: args.voice || config.defaultVoice,
  template: (args.template as CreateJobInput["template"]) || "tiktok",
  quality: (args.quality as CreateJobInput["quality"]) || "low",
  showPrice: args.showPrice !== "false",
  showSubtitle: args.showSubtitle !== "false"
};

const job = createJob(input);
console.log(`Created job ${job.id}`);
await runJobSync(job.id);
const done = getJobOrThrow(job.id);

if (done.status === "completed") {
  console.log(`Video: ${done.video_path}`);
  process.exit(0);
}

console.error(`Failed: ${done.error_message}`);
process.exit(1);

function parseArgs(values: string[]) {
  const result: Record<string, string> = {};
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (!value.startsWith("--")) continue;
    result[value.slice(2)] = values[index + 1] ?? "true";
    index += 1;
  }
  return result;
}

function parseDuration(value?: string): VideoDuration {
  const number = Number(value ?? 30);
  return number === 15 || number === 45 ? number : 30;
}
