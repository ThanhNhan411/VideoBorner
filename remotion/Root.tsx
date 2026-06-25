import { Composition } from "remotion";
import { ProductVideo } from "./ProductVideo";
import type { RenderInput } from "./types";

const VIDEO_WIDTH = 720;
const VIDEO_HEIGHT = 960;
const FPS = 24;

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
  options: { showPrice: true, showSubtitle: true, template: "tiktok" }
};

export default function Root() {
  return (
    <Composition
      id="ProductVideo"
      component={ProductVideo}
      durationInFrames={defaultInput.script.duration * FPS}
      fps={FPS}
      width={VIDEO_WIDTH}
      height={VIDEO_HEIGHT}
      defaultProps={defaultInput}
      calculateMetadata={({ props }) => ({
        durationInFrames: props.script.duration * FPS
      })}
    />
  );
}
