export type ProductData = {
  url: string;
  title: string;
  price?: string;
  description?: string;
  highlights: string[];
  brand?: string;
  shopName?: string;
  images: string[];
};

export type GeneratedScript = {
  title: string;
  duration: 15 | 30 | 45;
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
    template: "clean" | "tiktok" | "review" | "sale";
    quality: "low" | "balanced" | "high" | "ultra";
    logoPath?: string;
    backgroundMusicPath?: string;
  };
};
