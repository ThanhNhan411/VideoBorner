import dns from "node:dns/promises";
import net from "node:net";

const blockedHosts = new Set(["localhost", "127.0.0.1", "0.0.0.0", "::1"]);

export async function assertSafePublicUrl(rawUrl: string) {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error("URL không hợp lệ");
  }

  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("Chỉ hỗ trợ URL http hoặc https");
  }

  if (blockedHosts.has(url.hostname.toLowerCase())) {
    throw new Error("Không cho phép truy cập localhost hoặc host nội bộ");
  }

  const ipVersion = net.isIP(url.hostname);
  if (ipVersion && isPrivateIp(url.hostname)) {
    throw new Error("Không cho phép truy cập IP nội bộ");
  }

  if (!ipVersion) {
    const addresses = await dns.lookup(url.hostname, { all: true });
    if (addresses.some((entry) => isPrivateIp(entry.address))) {
      throw new Error("Tên miền trỏ tới IP nội bộ nên đã bị chặn");
    }
  }
}

function isPrivateIp(address: string) {
  if (address.includes(":")) {
    return address === "::1" || address.startsWith("fc") || address.startsWith("fd") || address.startsWith("fe80:");
  }

  const parts = address.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part))) return true;
  const [a, b] = parts;
  return (
    a === 10 ||
    a === 127 ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 169 && b === 254) ||
    a === 0
  );
}
