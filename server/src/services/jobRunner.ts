import { config } from "../config";
import type { CreateJobInput, GeneratedScript, ProductData } from "../types";
import { downloadAssets } from "./assetDownloader";
import { crawlProduct } from "./productCrawler";
import { generateScript } from "./scriptGenerator";
import { createVoiceAudio } from "./tts";
import { renderProductVideo } from "./videoRenderer";
import { addJobLog, failJob, getJobOrThrow, setJobStatus, updateJob } from "./jobManager";
import { deleteOldJobFiles } from "./storageCleanup";

const activeJobs = new Set<string>();

export function runJob(jobId: string) {
  if (activeJobs.has(jobId)) return;
  activeJobs.add(jobId);
  void run(jobId).finally(() => activeJobs.delete(jobId));
}

export async function runJobSync(jobId: string) {
  if (activeJobs.has(jobId)) throw new Error("Job đang chạy");
  activeJobs.add(jobId);
  try {
    await run(jobId);
  } finally {
    activeJobs.delete(jobId);
  }
}

async function run(jobId: string) {
  try {
    const options = JSON.parse(getJobOrThrow(jobId).options_json || "{}") as CreateJobInput;

    setJobStatus(jobId, "crawling", "Đang lấy thông tin sản phẩm");
    const product = await crawlProduct(options.productUrl);
    updateJob(jobId, { title: product.title, product_json: JSON.stringify(product) });

    setJobStatus(jobId, "downloading_assets", "Đang tải ảnh sản phẩm");
    const assets = await downloadAssets(jobId, product.images);
    updateJob(jobId, { assets_json: JSON.stringify(assets) });

    setJobStatus(jobId, "generating_script", "Đang tạo kịch bản");
    const script = await generateScript(product, options);
    updateJob(jobId, { script_json: JSON.stringify(script) });

    setJobStatus(jobId, "generating_voice", "Đang tạo giọng đọc");
    const audio = await createVoiceAudio({
      jobId,
      text: script.voiceover,
      voice: options.voice || config.defaultVoice
    });
    updateJob(jobId, { audio_path: audio.audioPath });

    setJobStatus(jobId, "rendering_video", "Đang render video MP4");
    const videoPath = await renderProductVideo({
      jobId,
      product,
      script,
      images: assets,
      audioPath: audio.audioPath,
      options: {
        showPrice: options.showPrice,
        showSubtitle: options.showSubtitle,
        template: options.template
      }
    });
    updateJob(jobId, { video_path: videoPath, status: "completed" });
    await deleteOldJobFiles(jobId);
    addJobLog(jobId, "Hoàn thành video");
  } catch (error) {
    failJob(jobId, error);
  }
}

export async function rerenderJob(jobId: string, patch: Partial<CreateJobInput>) {
  const job = getJobOrThrow(jobId);
  if (!job.product_json || !job.script_json || !job.assets_json || !job.audio_path) {
    throw new Error("Job chưa có đủ dữ liệu để render lại");
  }
  const options = { ...(JSON.parse(job.options_json || "{}") as CreateJobInput), ...patch };
  updateJob(jobId, { options_json: JSON.stringify(options) });
  setJobStatus(jobId, "rendering_video", "Đang render lại video");
  const videoPath = await renderProductVideo({
    jobId,
    product: JSON.parse(job.product_json) as ProductData,
    script: JSON.parse(job.script_json) as GeneratedScript,
    images: JSON.parse(job.assets_json) as string[],
    audioPath: job.audio_path,
    options: {
      showPrice: options.showPrice,
      showSubtitle: options.showSubtitle,
      template: options.template
    }
  });
  updateJob(jobId, { video_path: videoPath, status: "completed" });
  await deleteOldJobFiles(jobId);
  addJobLog(jobId, "Render lại video hoàn tất");
}
