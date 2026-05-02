"use client";

interface CreatorChip {
  slug: string;
  name: string;
  avatar: string;
}

interface CreatorChipsProps {
  creators: CreatorChip[];
  activeSlug: string | null;
  onSelect: (slug: string | null) => void;
}

// Same rotation as the home page hero so a creator's color identity
// stays consistent between / and /shows.
const ACCENT_RINGS = [
  { from: "#58CC02", to: "#89E219" },
  { from: "#1CB0F6", to: "#00CD9C" },
  { from: "#CE82FF", to: "#FF4B4B" },
  { from: "#FF9600", to: "#FFC800" },
  { from: "#FF4B4B", to: "#FF9600" },
  { from: "#FFC800", to: "#58CC02" },
  { from: "#00CD9C", to: "#1CB0F6" },
];

export function CreatorChips({
  creators,
  activeSlug,
  onSelect,
}: CreatorChipsProps) {
  if (creators.length === 0) return null;

  return (
    <div className="creator-chips-rail flex gap-5 overflow-x-auto px-1.5 py-2">
      <button
        onClick={() => onSelect(null)}
        className="creator-chip flex shrink-0 cursor-pointer snap-start flex-col items-center gap-2 group"
        aria-pressed={activeSlug === null}
      >
        <div
          className={`creator-chip-ring creator-chip-ring-rainbow ${
            activeSlug === null ? "creator-chip-ring-active" : ""
          }`}
        >
          <div className="creator-chip-inner flex items-center justify-center bg-background">
            <span className="font-heading text-xl font-bold text-foreground">
              All
            </span>
          </div>
        </div>
        <span
          className={`max-w-20 truncate font-body text-xs leading-tight ${
            activeSlug === null
              ? "font-bold text-foreground"
              : "font-semibold text-muted-foreground group-hover:text-foreground"
          }`}
        >
          All
        </span>
      </button>

      {creators.map((creator, index) => {
        const isActive = activeSlug === creator.slug;
        const accent = ACCENT_RINGS[index % ACCENT_RINGS.length];
        return (
          <button
            key={creator.slug}
            onClick={() => onSelect(isActive ? null : creator.slug)}
            className="creator-chip flex shrink-0 cursor-pointer snap-start flex-col items-center gap-2 group"
            aria-pressed={isActive}
            style={
              {
                "--accent-from": accent.from,
                "--accent-to": accent.to,
              } as React.CSSProperties
            }
          >
            <div
              className={`creator-chip-ring ${
                isActive ? "creator-chip-ring-active" : ""
              }`}
            >
              <div className="creator-chip-inner">
                {creator.avatar ? (
                  <img
                    src={creator.avatar}
                    alt={creator.name}
                    loading="lazy"
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                ) : (
                  <div
                    className="absolute inset-0 flex items-center justify-center"
                    style={{
                      backgroundImage: `linear-gradient(135deg, ${accent.from}, ${accent.to})`,
                    }}
                  >
                    <span className="font-heading text-xl font-bold text-white">
                      {creator.name.charAt(0)}
                    </span>
                  </div>
                )}
              </div>
            </div>
            <span
              className={`max-w-20 truncate font-body text-xs leading-tight ${
                isActive
                  ? "font-bold text-foreground"
                  : "font-semibold text-muted-foreground group-hover:text-foreground"
              }`}
            >
              {creator.name}
            </span>
          </button>
        );
      })}
    </div>
  );
}
