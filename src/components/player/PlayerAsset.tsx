type Props = {
  name: string;
  className?: string;
  alt?: string;
};

export function playerAssetUrl(name: string) {
  return `/images/player/${name}`;
}

export function PlayerAsset({ name, className, alt = '' }: Props) {
  return <img src={playerAssetUrl(name)} alt={alt} className={className} draggable={false} />;
}
