type Props = {
  text: string;
};

export function CTA({ text }: Props) {
  return <div className="cta">{text}</div>;
}
