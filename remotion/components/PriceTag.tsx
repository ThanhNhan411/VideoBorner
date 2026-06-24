type Props = {
  price: string;
};

export function PriceTag({ price }: Props) {
  return <div className="priceTag">{price}</div>;
}
