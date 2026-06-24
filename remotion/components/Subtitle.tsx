type Props = {
  text: string;
};

export function Subtitle({ text }: Props) {
  return <div className="subtitle">{text}</div>;
}
