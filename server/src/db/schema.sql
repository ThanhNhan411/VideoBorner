CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,
  product_url TEXT NOT NULL,
  status TEXT NOT NULL,
  title TEXT,
  product_json TEXT,
  script_json TEXT,
  video_path TEXT,
  audio_path TEXT,
  assets_json TEXT,
  options_json TEXT,
  error_message TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS job_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY(job_id) REFERENCES jobs(id)
);
