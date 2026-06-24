# Product Video Generator

MVP local để tạo video TikTok/Reels 9:16 từ link sản phẩm.

## Chức năng

- Crawler bằng Playwright: ưu tiên JSON-LD Product, Open Graph, sau đó DOM fallback.
- Tải tối đa 6 ảnh sản phẩm về `storage/assets/{jobId}`.
- Tạo script tiếng Việt bằng Gemini nếu có `GEMINI_API_KEY`, tự fallback về template an toàn nếu chưa cấu hình key hoặc Gemini lỗi.
- Tạo audio bằng `edge-tts`.
- Render MP4 1080x1920 bằng Remotion vào `storage/videos/{jobId}.mp4`.
- API JSON cho frontend và n8n.
- SQLite lưu job, trạng thái, log.

## Cài đặt local

```bash
npm install
npx playwright install chromium
cp .env.example .env
```

Trên Windows PowerShell, nếu không có `cp`:

```powershell
Copy-Item .env.example .env
```

## Chạy dev

```bash
npm run dev
```

- Frontend: http://localhost:5173
- API: http://localhost:3000

Chỉ chạy server:

```bash
npm run server
```

## Bật Gemini để viết script hay hơn

Thêm vào `.env`:

```env
GEMINI_API_KEY=your_gemini_key
GEMINI_MODEL=gemini-2.5-flash
```

Khi có `GEMINI_API_KEY`, bước tạo script sẽ gọi Gemini và có thể tốn quota/token theo tài khoản Google AI Studio. Các bước crawler, tải ảnh, TTS và render video vẫn chạy local/không dùng Gemini.

Nếu Gemini lỗi, backend tự dùng template local để job không bị dừng ở bước tạo script.

Remotion preview:

```bash
npm run remotion:preview
```

Render nhanh bằng CLI:

```bash
npm run create-video -- --url "https://example.com/product" --duration 30 --tone review
```

## API cho n8n

Tạo job:

```http
POST http://localhost:3000/api/jobs
Content-Type: application/json

{
  "productUrl": "https://example.com/product",
  "duration": 30,
  "tone": "review",
  "voice": "vi-VN-HoaiMyNeural",
  "template": "tiktok",
  "showPrice": true,
  "showSubtitle": true
}
```

Poll trạng thái:

```http
GET http://localhost:3000/api/jobs/{jobId}
```

Tải video:

```http
GET http://localhost:3000/api/jobs/{jobId}/video
```

Tạo lại script:

```http
POST http://localhost:3000/api/jobs/{jobId}/regenerate-script
```

Render lại video:

```http
POST http://localhost:3000/api/jobs/{jobId}/render
```

## Docker

```bash
cp .env.example .env
docker compose up --build
```

Volume `./storage` giữ assets, audio, video và SQLite database.

## Lưu ý bảo mật MVP

- Chỉ nhận URL `http/https`.
- Chặn localhost, loopback, private IP để giảm rủi ro SSRF.
- Không đăng nhập, không dùng cookie người dùng, không bypass captcha.
- Giới hạn số ảnh và dung lượng ảnh tải về.
- Không hardcode API key; cấu hình nằm trong `.env`.
