import { Composition } from "remotion";
import { ProductVideo } from "./ProductVideo";
import type { RenderInput } from "./types";

const qualityProfiles = {
  low: { width: 540, height: 720, fps: 24 },
  balanced: { width: 720, height: 960, fps: 24 },
  high: { width: 810, height: 1080, fps: 30 },
  ultra: { width: 1080, height: 1440, fps: 30 }
} as const;

function getQualityProfile(quality: RenderInput["options"]["quality"] | undefined) {
  return qualityProfiles[quality ?? "low"];
}

const defaultInput: RenderInput = {
  jobId: "preview",
  product: {
    url: "https://example.com",
    title: "Sản phẩm mẫu",
    price: "199.000đ",
    description: "Mô tả ngắn sản phẩm",
    highlights: ["Thiết kế gọn", "Dễ dùng mỗi ngày"],
    images: []
  },
  script: {
    title: "Sản phẩm mẫu",
    duration: 15,
    voiceover: "Đây là sản phẩm mẫu để xem trước template video.",
    scenes: [
      { index: 1, start: 0, end: 4, visualHint: "Ảnh chính", overlayText: "Sản phẩm mẫu" },
      { index: 2, start: 4, end: 8, visualHint: "Chi tiết", overlayText: "Thiết kế gọn" },
      { index: 3, start: 8, end: 12, visualHint: "Giá", overlayText: "Giá tham khảo 199.000đ" },
      { index: 4, start: 12, end: 15, visualHint: "CTA", overlayText: "Lưu lại để tham khảo" }
    ],
    caption: "Caption mẫu",
    hashtags: ["#reviewsanpham"],
    cta: "Lưu lại để tham khảo"
  },
  images: [],
  audioPath: "",
  options: { showPrice: true, showSubtitle: true, template: "tiktok", quality: "low" }
};
const defaultProfile = getQualityProfile(defaultInput.options.quality);

export default function Root() {
  return (
    <Composition
      id="ProductVideo"
      component={ProductVideo}
      durationInFrames={defaultInput.script.duration * defaultProfile.fps}
      fps={defaultProfile.fps}
      width={defaultProfile.width}
      height={defaultProfile.height}
      defaultProps={defaultInput}
      calculateMetadata={({ props }) => {
        const profile = getQualityProfile(props.options.quality);
        return {
          durationInFrames: props.script.duration * profile.fps,
          fps: profile.fps,
          width: profile.width,
          height: profile.height
        };
      }}
    />
  );
}
