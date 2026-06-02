interface PlayerAvatarProps {
  image?: string | null;
  name: string;
  size?: number;
  color?: string;
}

/** Avatar da Twitch com fallback para a inicial do nome. */
export default function PlayerAvatar({ image, name, size = 32, color = "#9146ff" }: PlayerAvatarProps) {
  if (image) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={image}
        alt={name}
        className="rounded-full object-cover flex-shrink-0"
        style={{ width: size, height: size, border: `2px solid ${color}55` }}
      />
    );
  }
  return (
    <div
      className="rounded-full flex items-center justify-center flex-shrink-0 font-black"
      style={{
        width: size, height: size, fontSize: size * 0.4,
        background: `${color}22`, border: `2px solid ${color}40`, color,
      }}
    >
      {name?.[0]?.toUpperCase() ?? "?"}
    </div>
  );
}
