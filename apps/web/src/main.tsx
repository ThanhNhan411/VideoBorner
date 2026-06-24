import React from "react";
import ReactDOM from "react-dom/client";
import { Download, Link, Play, RefreshCw, Video } from "lucide-react";
import "@fontsource/be-vietnam-pro/vietnamese-400.css";
import "@fontsource/be-vietnam-pro/vietnamese-600.css";
import "@fontsource/be-vietnam-pro/vietnamese-700.css";
import "@fontsource/be-vietnam-pro/vietnamese-800.css";
import "./styles.css";

type Job = {
  jobId: string;
  status: string;
  progress: number;
  product: null | { title: string; price?: string; description?: string; images?: string[] };
  script: null | { voiceover: string; caption: string; hashtags: string[] };
  videoUrl: string | null;
  error: string | null;
  logs: { message: string; created_at: string }[];
  createdAt: string;
};

const statusLabels: Record<string, string> = {
  pending: "Đang chờ",
  crawling: "Đang lấy thông tin sản phẩm",
  downloading_assets: "Đang tải ảnh",
  generating_script: "Đang viết kịch bản",
  generating_voice: "Đang tạo giọng đọc",
  rendering_video: "Đang render video",
  completed: "Hoàn thành",
  failed: "Lỗi"
};

function App() {
  const [jobs, setJobs] = React.useState<Job[]>([]);
  const [currentJob, setCurrentJob] = React.useState<Job | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [form, setForm] = React.useState({
    productUrl: "",
    campaignTitle: "",
    duration: 30,
    tone: "review",
    template: "tiktok",
    voice: "vi-VN-HoaiMyNeural",
    showPrice: true,
    showSubtitle: true
  });

  React.useEffect(() => {
    void loadJobs();
  }, []);

  React.useEffect(() => {
    if (!currentJob || ["completed", "failed"].includes(currentJob.status)) return;
    const timer = window.setInterval(async () => {
      const next = await fetchJob(currentJob.jobId);
      setCurrentJob(next);
      void loadJobs();
    }, 2000);
    return () => window.clearInterval(timer);
  }, [currentJob]);

  async function loadJobs() {
    const response = await fetch("/api/jobs");
    const data = await response.json();
    setJobs(data.jobs ?? []);
  }

  async function fetchJob(jobId: string): Promise<Job> {
    const response = await fetch(`/api/jobs/${jobId}`);
    return response.json();
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      const response = await fetch("/api/jobs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Không tạo được job");
      setCurrentJob(await fetchJob(data.jobId));
      void loadJobs();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Có lỗi xảy ra");
    } finally {
      setLoading(false);
    }
  }

  const job = currentJob ?? jobs[0] ?? null;

  return (
    <main className="shell">
      <section className="panel formPanel">
        <div className="brand">
          <Video size={28} />
          <div>
            <h1>Product Video Generator</h1>
            <p>Tạo video TikTok/Reels từ link sản phẩm</p>
          </div>
        </div>

        <form onSubmit={submit} className="form">
          <label>
            Link sản phẩm
            <div className="inputIcon">
              <Link size={18} />
              <input
                required
                type="url"
                placeholder="https://example.com/product"
                value={form.productUrl}
                onChange={(event) => setForm({ ...form, productUrl: event.target.value })}
              />
            </div>
          </label>

          <label>
            Tên chiến dịch
            <input
              placeholder="Ví dụ: Review deal hôm nay"
              value={form.campaignTitle}
              onChange={(event) => setForm({ ...form, campaignTitle: event.target.value })}
            />
          </label>

          <div className="grid2">
            <label>
              Thời lượng
              <select
                value={form.duration}
                onChange={(event) => setForm({ ...form, duration: Number(event.target.value) })}
              >
                <option value={15}>15s</option>
                <option value={30}>30s</option>
                <option value={45}>45s</option>
              </select>
            </label>
            <label>
              Giọng đọc
              <select value={form.voice} onChange={(event) => setForm({ ...form, voice: event.target.value })}>
                <option value="vi-VN-HoaiMyNeural">Hoài My</option>
                <option value="vi-VN-NamMinhNeural">Nam Minh</option>
              </select>
            </label>
          </div>

          <div className="grid2">
            <label>
              Tone
              <select value={form.tone} onChange={(event) => setForm({ ...form, tone: event.target.value })}>
                <option value="review">Review</option>
                <option value="sales">Bán hàng</option>
                <option value="quick_intro">Giới thiệu nhanh</option>
                <option value="trend">Bắt trend</option>
                <option value="funny">Hài hước</option>
                <option value="premium">Sang trọng</option>
              </select>
            </label>
            <label>
              Template
              <select value={form.template} onChange={(event) => setForm({ ...form, template: event.target.value })}>
                <option value="tiktok">TikTok</option>
                <option value="clean">Clean</option>
                <option value="review">Review</option>
                <option value="sale">Sale</option>
              </select>
            </label>
          </div>

          <div className="toggles">
            <label>
              <input
                type="checkbox"
                checked={form.showPrice}
                onChange={(event) => setForm({ ...form, showPrice: event.target.checked })}
              />
              Hiện giá
            </label>
            <label>
              <input
                type="checkbox"
                checked={form.showSubtitle}
                onChange={(event) => setForm({ ...form, showSubtitle: event.target.checked })}
              />
              Hiện subtitle
            </label>
          </div>

          <button disabled={loading} className="primary">
            {loading ? <RefreshCw size={18} className="spin" /> : <Play size={18} />}
            Tạo video
          </button>
        </form>
      </section>

      <section className="workspace">
        <div className="panel statusPanel">
          <div className="sectionTitle">
            <h2>Tiến trình</h2>
            <span>{job ? statusLabels[job.status] ?? job.status : "Chưa có job"}</span>
          </div>
          <div className="bar">
            <div style={{ width: `${job?.progress ?? 0}%` }} />
          </div>
          {job?.error ? <p className="error">{job.error}</p> : null}
          <div className="logs">
            {(job?.logs ?? []).map((log) => (
              <p key={`${log.created_at}-${log.message}`}>{log.message}</p>
            ))}
          </div>
        </div>

        <div className="resultGrid">
          <div className="panel previewPanel">
            {job?.videoUrl ? (
              <video src={job.videoUrl} controls />
            ) : (
              <div className="emptyPreview">
                <Video size={48} />
                <span>Preview MP4 sẽ xuất hiện ở đây</span>
              </div>
            )}
            {job?.videoUrl ? (
              <a className="download" href={job.videoUrl}>
                <Download size={18} />
                Tải MP4
              </a>
            ) : null}
          </div>

          <div className="panel copyPanel">
            <h2>Kết quả nội dung</h2>
            <h3>{job?.product?.title ?? "Chưa có dữ liệu sản phẩm"}</h3>
            <p>{job?.product?.description}</p>
            <h3>Script</h3>
            <p>{job?.script?.voiceover ?? "Kịch bản sẽ được tạo sau khi crawler hoàn tất."}</p>
            <h3>Caption</h3>
            <p>{job?.script?.caption}</p>
            <h3>Hashtag</h3>
            <p>{job?.script?.hashtags?.join(" ")}</p>
          </div>
        </div>

        <div className="panel history">
          <h2>Lịch sử job gần đây</h2>
          <div className="historyList">
            {jobs.map((item) => (
              <button key={item.jobId} onClick={() => setCurrentJob(item)}>
                <span>{item.product?.title ?? item.jobId}</span>
                <small>{statusLabels[item.status] ?? item.status}</small>
              </button>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(<App />);
