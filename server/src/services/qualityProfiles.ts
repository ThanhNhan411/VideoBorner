import type { RenderQuality } from "../types";

export type QualityProfile = {
  width: number;
  height: number;
  fps: number;
  imageSize: number;
  imageQuality: number;
  maxImages: number;
  crf: number;
};

export const qualityProfiles: Record<RenderQuality, QualityProfile> = {
  low: {
    width: 540,
    height: 720,
    fps: 24,
    imageSize: 540,
    imageQuality: 72,
    maxImages: 2,
    crf: 30
  },
  balanced: {
    width: 720,
    height: 960,
    fps: 24,
    imageSize: 720,
    imageQuality: 78,
    maxImages: 4,
    crf: 26
  },
  high: {
    width: 810,
    height: 1080,
    fps: 30,
    imageSize: 1080,
    imageQuality: 84,
    maxImages: 6,
    crf: 22
  },
  ultra: {
    width: 1080,
    height: 1440,
    fps: 30,
    imageSize: 1440,
    imageQuality: 90,
    maxImages: 6,
    crf: 18
  }
};

export function getQualityProfile(quality: RenderQuality | undefined) {
  return qualityProfiles[quality ?? "low"];
}
