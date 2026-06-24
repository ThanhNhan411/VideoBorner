import cors from "cors";
import express from "express";
import fs from "node:fs";
import path from "node:path";
import { config, storagePaths } from "./config";
import { jobsRouter } from "./routes/jobs";

const app = express();
const webDistPath = path.resolve(config.rootDir, "dist/web");

app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use("/storage", express.static(config.storageDir));
app.use("/api/jobs", jobsRouter);

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

if (fs.existsSync(webDistPath)) {
  app.use(express.static(webDistPath));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(webDistPath, "index.html"));
  });
}

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const message = error instanceof Error ? error.message : "Có lỗi không xác định";
  res.status(400).json({ error: message });
});

app.listen(config.port, () => {
  console.log(`API running at http://localhost:${config.port}`);
  console.log(`Storage at ${path.resolve(storagePaths.assets, "..")}`);
});
