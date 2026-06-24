import { chromium } from "playwright";
import type { ProductData } from "../types";
import { assertSafePublicUrl } from "./urlSafety";

type JsonLdProduct = Record<string, unknown>;
type BrowserProductSnapshot = {
  title: string;
  description: string;
  ogImage: string;
  price: string;
  shopName: string;
  jsonLd: unknown[];
  domImages: string[];
  highlights: string[];
};

export async function crawlProduct(productUrl: string): Promise<ProductData> {
  await assertSafePublicUrl(productUrl);
  productUrl = await resolvePublicRedirect(productUrl);
  const sharedMeta = parseSharedOgInfo(productUrl);
  const isTikTok = new URL(productUrl).hostname.includes("tiktok.com");

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: isTikTok ? { width: 390, height: 1600 } : { width: 1280, height: 1600 },
    userAgent: isTikTok
      ? "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
      : undefined
  });
  const networkImages = new Set<string>();
  page.on("response", (response) => {
    const url = response.url();
    const contentType = response.headers()["content-type"] ?? "";
    if ((contentType.startsWith("image/") && isLikelyImageUrl(url)) || /ibyteimg\.com|p16-oec|tos-alisg/i.test(url)) {
      networkImages.add(url);
    }
  });

  try {
    await page.goto(productUrl, { waitUntil: "domcontentloaded", timeout: 45_000 });
    await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => undefined);
    for (let index = 0; index < (isTikTok ? 6 : 2); index += 1) {
      await page.mouse.wheel(0, 900).catch(() => undefined);
      await page.waitForTimeout(600);
    }

    const data = (await page.evaluate(`(() => {
      const text = (selector) => document.querySelector(selector)?.textContent?.trim() || "";
      const attr = (selector, name) =>
        document.querySelector(selector)?.getAttribute(name)?.trim() || "";
      const meta = (name) =>
        attr('meta[property="' + name + '"]', "content") || attr('meta[name="' + name + '"]', "content");

      const jsonLd = Array.from(document.querySelectorAll('script[type="application/ld+json"]'))
        .map((node) => {
          try {
            return JSON.parse(node.textContent || "null");
          } catch {
            return null;
          }
        })
        .filter(Boolean);

      const srcsetUrls = (value) => String(value || "")
        .split(",")
        .map((item) => item.trim().split(/\s+/)[0])
        .filter(Boolean);

      const domImages = Array.from(document.images)
        .flatMap((img) => ({
          srcs: [img.currentSrc, img.src, ...srcsetUrls(img.getAttribute("srcset"))].filter(Boolean),
          width: img.naturalWidth || img.width,
          height: img.naturalHeight || img.height
        }))
        .filter((img) => img.srcs.length && (img.width >= 180 || img.height >= 180 || img.srcs.some((src) => /origin|ibyteimg|p16-oec/.test(src))))
        .sort((a, b) => b.width * b.height - a.width * a.height)
        .slice(0, 12)
        .flatMap((img) => img.srcs);

      return {
        title: meta("og:title") || text("h1"),
        description: meta("og:description") || attr('meta[name="description"]', "content"),
        ogImage: meta("og:image"),
        price:
          meta("product:price:amount") ||
          text('[class*="price" i]') ||
          text('[data-testid*="price" i]') ||
          text('[itemprop="price"]'),
        shopName: meta("og:site_name"),
        jsonLd,
        domImages,
        highlights: Array.from(document.querySelectorAll("li"))
          .map((node) => node.textContent?.trim() || "")
          .filter((value) => value.length >= 12 && value.length <= 130)
          .slice(0, 5)
      };
    })()`)) as BrowserProductSnapshot;

    const productSchema = findProductSchema(data.jsonLd);
    const schemaImages = normalizeImages(productSchema?.image);
    const offers = firstObject(productSchema?.offers);
    const brand = firstObject(productSchema?.brand);

    const title = stringValue(productSchema?.name) || cleanTitle(data.title) || sharedMeta.title;
    if (!title) throw new Error("Không lấy được tên sản phẩm từ URL");

    const primaryImages = uniqueUrls(
      [...schemaImages, ...data.domImages, ...networkImages].filter(isNonEmptyString),
      productUrl
    ).filter(isLikelyImageUrl);
    const fallbackImages = uniqueUrls([data.ogImage, sharedMeta.image].filter(isNonEmptyString), productUrl).filter(
      isLikelyImageUrl
    );
    const images = [...primaryImages, ...fallbackImages.filter((url) => !primaryImages.includes(url))].slice(0, 12);
    if (!images.length) throw new Error("Không tìm thấy ảnh sản phẩm phù hợp");

    return {
      url: productUrl,
      title,
      price: stringValue(offers?.price) || data.price || undefined,
      originalPrice: undefined,
      discount: undefined,
      description: stringValue(productSchema?.description) || data.description || undefined,
      highlights: data.highlights,
      brand: stringValue(brand?.name) || stringValue(productSchema?.brand) || undefined,
      shopName: data.shopName || undefined,
      images
    };
  } finally {
    await browser.close();
  }
}

async function resolvePublicRedirect(productUrl: string) {
  let currentUrl = productUrl;
  for (let index = 0; index < 5; index += 1) {
    const response = await fetch(currentUrl, {
      method: "HEAD",
      redirect: "manual",
      headers: { "user-agent": "Mozilla/5.0 ProductVideoGenerator/0.1" }
    }).catch(() => null);
    const location = response?.headers.get("location");
    if (!response || !location || ![301, 302, 303, 307, 308].includes(response.status)) {
      return currentUrl;
    }
    currentUrl = new URL(location, currentUrl).href;
    await assertSafePublicUrl(currentUrl);
  }
  return currentUrl;
}

function parseSharedOgInfo(productUrl: string): { title?: string; image?: string } {
  try {
    const ogInfo = new URL(productUrl).searchParams.get("og_info");
    if (!ogInfo) return {};
    const parsed = JSON.parse(ogInfo) as { title?: unknown; image?: unknown };
    return {
      title: typeof parsed.title === "string" ? parsed.title.trim() : undefined,
      image: typeof parsed.image === "string" ? parsed.image.trim() : undefined
    };
  } catch {
    return {};
  }
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function findProductSchema(items: unknown[]): JsonLdProduct | null {
  const queue = [...items];
  while (queue.length) {
    const item = queue.shift();
    if (!item || typeof item !== "object") continue;
    if (Array.isArray(item)) {
      queue.push(...item);
      continue;
    }
    const object = item as JsonLdProduct;
    const type = object["@type"];
    const types = Array.isArray(type) ? type : [type];
    if (types.some((value) => String(value).toLowerCase() === "product")) return object;
    for (const value of Object.values(object)) {
      if (value && typeof value === "object") queue.push(value);
    }
  }
  return null;
}

function normalizeImages(value: unknown): string[] {
  if (!value) return [];
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(normalizeImages);
  if (typeof value === "object" && "url" in value) return normalizeImages((value as { url: unknown }).url);
  return [];
}

function firstObject(value: unknown): Record<string, unknown> | undefined {
  if (Array.isArray(value)) return firstObject(value[0]);
  return value && typeof value === "object" ? (value as Record<string, unknown>) : undefined;
}

function stringValue(value: unknown): string {
  return typeof value === "string" || typeof value === "number" ? String(value).trim() : "";
}

function cleanTitle(value: string) {
  return value.replace(/\s+/g, " ").split("|")[0].trim();
}

function uniqueUrls(values: string[], baseUrl: string) {
  const urls = new Set<string>();
  for (const value of values) {
    try {
      urls.add(new URL(value, baseUrl).href);
    } catch {
      // Ignore malformed image URLs from noisy pages.
    }
  }
  return [...urls];
}

function isLikelyImageUrl(value: string) {
  try {
    const url = new URL(value);
    return /\.(jpe?g|png|webp)(?:$|[?:])/i.test(url.href) || /ibyteimg\.com|p16-oec|tos-alisg/i.test(url.hostname);
  } catch {
    return false;
  }
}
