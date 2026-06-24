import {
  AbsoluteFill,
  Audio,
  Easing,
  interpolate,
  useCurrentFrame,
  useVideoConfig
} from "remotion";
import type { RenderInput } from "./types";
import { ProductImage } from "./components/ProductImage";
import { PriceTag } from "./components/PriceTag";
import { Subtitle } from "./components/Subtitle";
import { CTA } from "./components/CTA";

import "@fontsource/be-vietnam-pro/vietnamese-400.css";
import "@fontsource/be-vietnam-pro/vietnamese-600.css";
import "@fontsource/be-vietnam-pro/vietnamese-700.css";
import "@fontsource/be-vietnam-pro/vietnamese-800.css";
import "@fontsource/be-vietnam-pro/vietnamese-900.css";

export function ProductVideo({
  product,
  script,
  images,
  audioPath,
  options
}: RenderInput) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const duration = Math.max(script.duration || 8, 1);
  const titleText = script.title || product.title;
  const supportingText = getSupportingText(script.caption || script.voiceover, titleText);

  const scenes =
    script.scenes.length > 0
      ? script.scenes
      : [
          {
            index: 1,
            start: 0,
            end: duration,
            visualHint: "Product shot",
            overlayText: product.title
          }
        ];

  const activeScene =
    scenes.find(
      (scene) => frame >= scene.start * fps && frame < scene.end * fps
    ) ?? scenes[scenes.length - 1];

  const image = images.length
    ? images[(activeScene.index - 1) % images.length]
    : "";

  const currentSecond = frame / fps;
  const subtitleText = getSubtitleAtSecond(
    script.voiceover || "",
    currentSecond,
    duration
  );

  const progress = interpolate(frame, [0, duration * fps], [0, 100], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp"
  });

  const sceneFrame = Math.max(0, frame - activeScene.start * fps);
  const sceneDurationFrames = Math.max(
    1,
    (activeScene.end - activeScene.start) * fps
  );

  const sceneReveal = interpolate(sceneFrame, [0, 18], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1)
  });

  const imageScale = interpolate(
    sceneFrame,
    [0, sceneDurationFrames],
    [1.015, 1.075],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.bezier(0.16, 1, 0.3, 1)
    }
  );

  const imageY = interpolate(sceneFrame, [0, sceneDurationFrames], [10, -12], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp"
  });

  const cardY = interpolate(sceneFrame, [0, 18], [34, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1)
  });

  const cardOpacity = interpolate(sceneFrame, [0, 14], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp"
  });

  const titleY = interpolate(frame, [0, 24], [22, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1)
  });

  const titleOpacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp"
  });

  const ctaStartFrame = Math.max(0, Math.floor((duration - 4) * fps));
  const showCTA = frame >= ctaStartFrame;
  const showSubtitle = options.showSubtitle && subtitleText && !showCTA;

  const templateLabel = getTemplateLabel(options.template);
  const brandLabel =
    product.shopName || product.brand || "Gợi ý sản phẩm hôm nay";

  return (
    <AbsoluteFill className={`video video-${options.template}`}>
      <style>{css}</style>

      {audioPath ? <Audio src={audioPath} /> : null}

      <AbsoluteFill className="backdropMedia">
        <ProductImage src={image} title={product.title} />
      </AbsoluteFill>

      <AbsoluteFill className="softOverlay" />
      <div className="ambient ambientOne" />
      <div className="ambient ambientTwo" />

      <div className="progressTrack">
        <div className="progress" style={{ width: `${progress}%` }} />
      </div>

      <div
        className="topBar"
        style={{
          opacity: titleOpacity,
          transform: `translateY(${titleY}px)`
        }}
      >
        <div className="brandPill">
          <span className="brandDot" />
          <span>{brandLabel}</span>
        </div>

        {options.showPrice && product.price ? (
          <PriceTag price={product.price} />
        ) : null}
      </div>

      <div
        className="headline"
        style={{
          opacity: titleOpacity,
          transform: `translateY(${titleY}px)`
        }}
      >
        <span className="storyLabel">{templateLabel}</span>
        <h1>{titleText}</h1>

        {supportingText ? (
          <div className="infoChips">
            <span>{supportingText}</span>
          </div>
        ) : null}
      </div>

      <div className="sceneRail">
        {scenes.map((scene) => (
          <span
            key={scene.index}
            className={
              scene.index === activeScene.index
                ? "railDot railDotActive"
                : "railDot"
            }
          />
        ))}
      </div>

      <div
        className="productStage"
        style={{
          transform: `translate(-50%, -50%) translateY(${imageY}px) scale(${imageScale})`
        }}
      >
        <div
          className="productGlow"
          style={{
            opacity: sceneReveal
          }}
        />
        <ProductImage src={image} title={product.title} />
      </div>

      <div
        className="overlay"
        style={{
          opacity: cardOpacity,
          transform: `translateY(${cardY}px)`
        }}
      >
        <div className="overlayHeader">
          <span className="sceneIndex">
            {String(activeScene.index).padStart(2, "0")}
          </span>
          <span className="sceneCount">/ {String(scenes.length).padStart(2, "0")}</span>
        </div>

        <p>{activeScene.overlayText}</p>
      </div>

      {showSubtitle ? <Subtitle text={subtitleText} /> : null}

      {showCTA ? <CTA text={script.cta || "Xem chi tiết sản phẩm"} /> : null}
    </AbsoluteFill>
  );
}

const css = `
.video {
  font-family: "Be Vietnam Pro", Arial, Helvetica, sans-serif;
  color: white;
  overflow: hidden;
  background:
    radial-gradient(circle at 20% 12%, rgba(45, 212, 191, .22), transparent 34%),
    radial-gradient(circle at 82% 18%, rgba(250, 204, 21, .16), transparent 32%),
    linear-gradient(180deg, #071316 0%, #0b1720 52%, #071316 100%);
}

.video-clean {
  background:
    radial-gradient(circle at 22% 12%, rgba(125, 211, 252, .2), transparent 34%),
    radial-gradient(circle at 82% 18%, rgba(45, 212, 191, .16), transparent 32%),
    linear-gradient(180deg, #06131a 0%, #0b1720 52%, #071316 100%);
}

.video-sale {
  background:
    radial-gradient(circle at 22% 12%, rgba(251, 146, 60, .24), transparent 34%),
    radial-gradient(circle at 82% 18%, rgba(250, 204, 21, .2), transparent 32%),
    linear-gradient(180deg, #160b0d 0%, #1b1115 52%, #09090b 100%);
}

.video-review {
  background:
    radial-gradient(circle at 22% 12%, rgba(34, 197, 94, .2), transparent 34%),
    radial-gradient(circle at 82% 18%, rgba(45, 212, 191, .16), transparent 32%),
    linear-gradient(180deg, #06150f 0%, #071a12 52%, #06100d 100%);
}

.backdropMedia {
  opacity: .34;
  transform: scale(1.18);
  filter: saturate(1.08);
}

.backdropMedia .blurImage {
  position: absolute;
  inset: -100px;
  width: calc(100% + 200px);
  height: calc(100% + 200px);
  object-fit: cover;
  filter: blur(48px) saturate(1.2);
  opacity: .74;
}

.backdropMedia .mainImage {
  position: absolute;
  inset: -80px;
  width: calc(100% + 160px);
  height: calc(100% + 160px);
  object-fit: cover;
  opacity: .42;
  filter: blur(22px) saturate(1.12);
}

.backdropMedia .fallbackImage {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  padding: 90px;
  font-size: 58px;
  font-weight: 900;
  text-align: center;
  opacity: .35;
}

.softOverlay {
  background:
    linear-gradient(180deg, rgba(2, 6, 23, .88) 0%, rgba(2, 6, 23, .2) 26%, rgba(2, 6, 23, .42) 58%, rgba(2, 6, 23, .92) 100%),
    linear-gradient(90deg, rgba(0, 0, 0, .18), transparent 44%, rgba(0, 0, 0, .28));
}

.ambient {
  position: absolute;
  border-radius: 999px;
  filter: blur(26px);
  opacity: .32;
  pointer-events: none;
}

.ambientOne {
  width: 360px;
  height: 360px;
  left: -120px;
  top: 360px;
  background: rgba(45, 212, 191, .38);
}

.ambientTwo {
  width: 320px;
  height: 320px;
  right: -120px;
  top: 700px;
  background: rgba(250, 204, 21, .28);
}

.progressTrack {
  position: absolute;
  left: 52px;
  right: 52px;
  bottom: 42px;
  height: 8px;
  border-radius: 999px;
  background: rgba(255, 255, 255, .16);
  overflow: hidden;
}

.progress {
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, #2dd4bf, #facc15);
}

.topBar {
  position: absolute;
  top: 48px;
  left: 54px;
  right: 54px;
  z-index: 5;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 22px;
}

.brandPill {
  min-width: 0;
  max-width: 620px;
  display: inline-flex;
  align-items: center;
  gap: 12px;
  padding: 15px 21px;
  border-radius: 999px;
  background: rgba(255, 255, 255, .12);
  border: 1px solid rgba(255, 255, 255, .18);
  backdrop-filter: blur(18px);
  box-shadow: 0 18px 50px rgba(0, 0, 0, .18);
  font-size: 25px;
  line-height: 1.1;
  font-weight: 800;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.brandDot {
  flex: 0 0 auto;
  width: 13px;
  height: 13px;
  border-radius: 999px;
  background: #2dd4bf;
  box-shadow: 0 0 22px rgba(45, 212, 191, .8);
}

.priceTag {
  flex: 0 0 auto;
  padding: 15px 22px;
  border-radius: 999px;
  background: rgba(255, 255, 255, .92);
  color: #071316;
  font-size: 31px;
  font-weight: 900;
  box-shadow: 0 20px 50px rgba(0, 0, 0, .22);
}

.headline {
  position: absolute;
  left: 54px;
  right: 54px;
  top: 122px;
  z-index: 5;
}

.storyLabel {
  display: inline-flex;
  margin-bottom: 15px;
  padding: 10px 15px;
  border-radius: 999px;
  background: rgba(250, 204, 21, .16);
  border: 1px solid rgba(250, 204, 21, .26);
  color: #fde68a;
  font-size: 22px;
  font-weight: 900;
  letter-spacing: .3px;
  text-transform: uppercase;
}

.headline h1 {
  margin: 0;
  max-width: 900px;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  font-size: 50px;
  line-height: 1.06;
  font-weight: 900;
  letter-spacing: -1.2px;
  text-shadow: 0 12px 34px rgba(0, 0, 0, .36);
}

.infoChips {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 18px;
}

.infoChips span {
  padding: 10px 14px;
  border-radius: 999px;
  background: rgba(255, 255, 255, .1);
  border: 1px solid rgba(255, 255, 255, .14);
  backdrop-filter: blur(14px);
  font-size: 20px;
  line-height: 1;
  font-weight: 800;
  color: rgba(255, 255, 255, .88);
}

.sceneRail {
  position: absolute;
  top: 390px;
  right: 42px;
  display: grid;
  gap: 14px;
  z-index: 5;
}

.railDot {
  width: 9px;
  height: 9px;
  border-radius: 999px;
  background: rgba(255, 255, 255, .36);
  transition: .2s;
}

.railDotActive {
  height: 40px;
  background: #facc15;
  box-shadow: 0 0 26px rgba(250, 204, 21, .5);
}

.productStage {
  position: absolute;
  left: 50%;
  top: 50%;
  z-index: 2;
  width: 620px;
  height: 620px;
  display: grid;
  place-items: center;
  will-change: transform;
}

.productGlow {
  position: absolute;
  left: 50%;
  top: 56%;
  width: 540px;
  height: 240px;
  transform: translate(-50%, -50%);
  border-radius: 999px;
  background:
    radial-gradient(circle, rgba(255, 255, 255, .2), transparent 66%),
    radial-gradient(circle, rgba(45, 212, 191, .22), transparent 72%);
  filter: blur(18px);
}

.productStage .blurImage {
  display: none;
}

.productStage .mainImage {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 600px;
  height: 620px;
  transform: translate(-50%, -50%);
  object-fit: contain;
  border-radius: 42px;
  filter:
    drop-shadow(0 48px 74px rgba(0, 0, 0, .46))
    drop-shadow(0 8px 20px rgba(0, 0, 0, .18));
}

.productStage .fallbackImage {
  position: absolute;
  inset: 80px 20px;
  display: grid;
  place-items: center;
  padding: 52px;
  border-radius: 44px;
  background: rgba(255, 255, 255, .12);
  border: 1px solid rgba(255, 255, 255, .18);
  backdrop-filter: blur(18px);
  font-size: 52px;
  line-height: 1.1;
  font-weight: 900;
  text-align: center;
}

.overlay {
  position: absolute;
  left: 54px;
  right: 54px;
  bottom: 230px;
  z-index: 6;
  padding: 28px 30px 32px;
  border-radius: 34px;
  background: rgba(9, 18, 24, .78);
  color: #ffffff;
  border: 1px solid rgba(255, 255, 255, .16);
  backdrop-filter: blur(22px);
  box-shadow:
    0 30px 90px rgba(0, 0, 0, .36),
    inset 0 1px 0 rgba(255, 255, 255, .12);
}

.overlayHeader {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 15px;
}

.sceneIndex {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 54px;
  height: 42px;
  padding: 0 13px;
  border-radius: 999px;
  background: #facc15;
  color: #071316;
  font-size: 22px;
  font-weight: 900;
}

.sceneCount {
  color: rgba(255, 255, 255, .6);
  font-size: 21px;
  font-weight: 800;
}

.overlay p {
  margin: 0;
  font-size: 45px;
  line-height: 1.16;
  font-weight: 900;
  letter-spacing: -1px;
}

.subtitle {
  position: absolute;
  left: 54px;
  right: 54px;
  bottom: 116px;
  z-index: 7;
  max-height: 112px;
  overflow: hidden;
  padding: 18px 24px;
  border-radius: 26px;
  background: rgba(255, 255, 255, .92);
  color: #071316;
  border: 1px solid rgba(255, 255, 255, .32);
  backdrop-filter: blur(18px);
  box-shadow: 0 20px 60px rgba(0, 0, 0, .24);
  font-size: 31px;
  line-height: 1.2;
  font-weight: 800;
}

.cta {
  position: absolute;
  left: 54px;
  right: 54px;
  bottom: 104px;
  z-index: 7;
  padding: 28px 34px;
  border-radius: 34px;
  background: rgba(255, 255, 255, .94);
  color: #071316;
  text-align: center;
  font-size: 43px;
  line-height: 1.08;
  font-weight: 900;
  box-shadow:
    0 26px 70px rgba(0, 0, 0, .28),
    inset 0 1px 0 rgba(255, 255, 255, .9);
}
`;

function getTemplateLabel(template: string) {
  switch (template) {
    case "sale":
      return "Deal đáng chú ý";
    case "review":
      return "Góc trải nghiệm";
    case "clean":
      return "Gợi ý tinh gọn";
    default:
      return "Review nhanh";
  }
}

function getSupportingText(text: string, title: string) {
  const cleaned = text
    .replaceAll(title, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) return "";
  const firstSentence = cleaned.split(/(?<=[.!?])\s+/)[0] ?? cleaned;
  return firstSentence.length > 96 ? `${firstSentence.slice(0, 93).trim()}...` : firstSentence;
}

function getSubtitleAtSecond(text: string, second: number, duration: number) {
  const cues = buildSubtitleCues(text, duration);
  return cues.find((cue) => second >= cue.start && second < cue.end)?.text ?? "";
}

function buildSubtitleCues(text: string, duration: number) {
  const chunks = splitVoiceoverInOrder(text, 9);
  const totalWords = chunks.reduce((sum, chunk) => sum + wordCount(chunk), 0) || 1;
  let cursor = 0;

  return chunks.map((chunk, index) => {
    const cueDuration = Math.max(0.9, (wordCount(chunk) / totalWords) * duration);
    const start = cursor;
    const end =
      index === chunks.length - 1
        ? duration
        : Math.min(duration, start + cueDuration);

    cursor = end;

    return { start, end, text: chunk };
  });
}

function splitVoiceoverInOrder(text: string, maxWords: number) {
  const chunks: string[] = [];

  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

  for (const sentence of sentences.length ? sentences : [text]) {
    const words = sentence.split(/\s+/).filter(Boolean);

    for (let index = 0; index < words.length; index += maxWords) {
      chunks.push(words.slice(index, index + maxWords).join(" "));
    }
  }

  return chunks;
}

function wordCount(text: string) {
  return text.split(/\s+/).filter(Boolean).length;
}
