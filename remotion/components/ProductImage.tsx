import { Img, useCurrentFrame, interpolate } from "remotion";

type Props = {
  src?: string;
  title: string;
};

export function ProductImage({ src, title }: Props) {
  const frame = useCurrentFrame();
  const scale = interpolate(frame % 180, [0, 180], [1, 1.08]);

  if (!src) {
    return (
      <div className="fallbackImage">
        <span>{title}</span>
      </div>
    );
  }

  return (
    <>
      <Img className="blurImage" src={src} />
      <Img className="mainImage" src={src} style={{ transform: `translate(-50%, -50%) scale(${scale})` }} />
    </>
  );
}
