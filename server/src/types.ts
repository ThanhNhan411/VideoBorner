export type VideoDuration = 15 | 30 | 45;

export type Tone = "review" | "sales" | "quick_intro" | "trend" | "funny" | "premium";

export type VideoTemplate = "clean" | "tiktok" | "review" | "sale";

export type RenderQuality = "low" | "balanced" | "high" | "ultra";

export type ProductData = {
  url: string;
  title: string;
  price?: string;
  originalPrice?: string;
  discount?: string;
  description?: string;
  highlights: string[];
  brand?: string;
  shopName?: string;
  images: string[];
};

export type GeneratedScript = {
  title: string;
  duration: VideoDuration;
  voiceover: string;
  scenes: {
    index: number;
    start: number;
    end: number;
    visualHint: string;
    overlayText: string;
  }[];
  caption: string;
  hashtags: string[];
  cta: string;
};

export type RenderInput = {
  jobId: string;
  product: ProductData;
  script: GeneratedScript;
  images: string[];
  audioPath: string;
  options: {
    showPrice: boolean;
    showSubtitle: boolean;
    template: VideoTemplate;
    quality: RenderQuality;
    logoPath?: string;
    backgroundMusicPath?: string;
  };
};

export type CreateJobInput = {
  productUrl: string;
  campaignTitle?: string;
  duration: VideoDuration;
  tone: Tone;
  voice: string;
  template: VideoTemplate;
  quality: RenderQuality;
  showPrice: boolean;
  showSubtitle: boolean;
};

export type JobStatus =
  | "pending"
  | "crawling"
  | "downloading_assets"
  | "generating_script"
  | "generating_voice"
  | "rendering_video"
  | "completed"
  | "failed";

export type JobRecord = {
  id: string;
  product_url: string;
  status: JobStatus;
  title: string | null;
  product_json: string | null;
  script_json: string | null;
  video_path: string | null;
  audio_path: string | null;
  assets_json: string | null;
  options_json: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
};
