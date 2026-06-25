import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { config, storagePaths } from "../config";
import { assertSafePublicUrl } from "./urlSafety";

const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
type DownloadedImage = {
  buffer: Buffer;
  width: number;
  height: number;
  sourceUrl: string;
};

export async function downloadAssets(jobId: string, imageUrls: string[]): Promise<string[]> {
  const outputDir = path.join(storagePaths.assets, jobId);
  await fs.mkdir(outputDir, { recursive: true });

  const downloaded: DownloadedImage[] = [];
  const candidateUrls = uniqueValues(imageUrls.flatMap(expandImageCandidates));
  for (const imageUrl of candidateUrls.slice(0, config.maxImageDownloads * 3)) {
    const image = await downloadImage(imageUrl);
    if (image) downloaded.push(image);
  }

  const usable = downloaded
    .sort((a, b) => b.width * b.height - a.width * a.height)
    .filter((image, index) => index === 0 || Math.min(image.width, image.height) >= 480)
    .slice(0, config.maxImageDownloads);

  const saved: string[] = [];
  for (const image of usable) {
    const filePath = path.join(outputDir, `image-${saved.length + 1}.jpg`);
    await sharp(image.buffer)
      .rotate()
      .resize(720, 720, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 78 })
      .toFile(filePath);
    saved.push(filePath);
  }

  if (!saved.length) throw new Error("Không tải được ảnh sản phẩm hợp lệ");
  return saved;
}

async function downloadImage(imageUrl: string): Promise<DownloadedImage | null> {
  try {
    await assertSafePublicUrl(imageUrl);
    const response = await fetch(imageUrl, {
      headers: { "user-agent": "Mozilla/5.0 ProductVideoGenerator/0.1" },
      redirect: "follow"
    });
    if (!response.ok) return null;

    const type = response.headers.get("content-type")?.split(";")[0].toLowerCase() ?? "";
    if (!allowedTypes.has(type)) return null;

    const contentLength = Number(response.headers.get("content-length") ?? 0);
    if (contentLength > config.maxImageBytes) return null;

    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.byteLength > config.maxImageBytes) return null;

    const metadata = await sharp(buffer).metadata();
    if (!metadata.width || !metadata.height) return null;

    return {
      buffer,
      width: metadata.width,
      height: metadata.height,
      sourceUrl: imageUrl
    };
  } catch {
    return null;
  }
}

function expandImageCandidates(imageUrl: string) {
  const values = [imageUrl];
  try {
    const url = new URL(imageUrl);
    url.search = "";
    values.push(url.href);

    if (url.hostname.includes("ibyteimg.com") && url.pathname.includes("~tplv-")) {
      const basePath = url.pathname.split("~tplv-")[0];
      values.push(`${url.origin}${basePath}~tplv-aphluv4xwc-origin-jpeg.jpeg`);
      values.push(`${url.origin}${basePath}~tplv-aphluv4xwc-origin-webp.webp`);
    }
  } catch {
    // Ignore malformed variants.
  }
  return values;
}

function uniqueValues(values: string[]) {
  return [...new Set(values)];
}
