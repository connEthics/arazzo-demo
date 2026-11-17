// Arazzo mark (brand/arazzo-mark.svg, B1) and the "Arazzo Studio · by ConnEthics" lockup.
// The mark keeps its own slate-900 tile, so it reads on light and dark backgrounds.
// Orange is never used for lockup text (contrast rule, BRAND.md §4.3).

const WARP = [12, 28, 44];
const WEFT = [12, 28, 44];

export function ArazzoMark({ size = 32, title }: { size?: number; title?: string }) {
  // 1/1 weave: on each crossing, the warp (blue) is over the weft (orange) when (i + j) is odd.
  const over: { x: number; y: number }[] = [];
  WARP.forEach((x, i) =>
    WEFT.forEach((y, j) => {
      if ((i + j) % 2 === 1) over.push({ x, y });
    }),
  );
  const under = WARP.flatMap((x, i) => WEFT.filter((_, j) => (i + j) % 2 === 0).map((y) => ({ x, y })));

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      className="shrink-0"
    >
      <rect width="64" height="64" rx="14" fill="#0f172a" />
      {WARP.map((x) => (
        <rect key={`w${x}`} x={x} y="8" width="8" height="48" rx="4" fill="#2563eb" />
      ))}
      {WEFT.map((y) => (
        <rect key={`f${y}`} x="8" y={y} width="48" height="8" rx="4" fill="#f97316" />
      ))}
      {/* warp over weft: redraw the warp segment with a dark gap on each side */}
      {over.map(({ x, y }) => (
        <g key={`o${x}-${y}`}>
          <rect x={x - 1.6} y={y} width="1.6" height="8" fill="#0f172a" />
          <rect x={x + 8} y={y} width="1.6" height="8" fill="#0f172a" />
          <rect x={x} y={y} width="8" height="8" fill="#2563eb" />
        </g>
      ))}
      {/* weft over warp: dark gap above and below the crossing */}
      {under.map(({ x, y }) => (
        <g key={`u${x}-${y}`}>
          <rect x={x} y={y - 1.6} width="8" height="1.6" fill="#0f172a" />
          <rect x={x} y={y + 8} width="8" height="1.6" fill="#0f172a" />
        </g>
      ))}
    </svg>
  );
}

/** "ConnEthics" with "Ethics" in the primary blue (echo of the CONN / ETHICS logo). */
export function ConnEthics() {
  return (
    <span>
      Conn<span className="text-ce-primary">Ethics</span>
    </span>
  );
}

type LockupProps = {
  /** "inline": mark · Arazzo Studio | by ConnEthics (stacks under sm). "stacked": two lines. */
  variant?: "inline" | "stacked";
  size?: number;
};

export function BrandLockup({ variant = "inline", size = 36 }: LockupProps) {
  const name = (
    <span className="text-lg leading-tight tracking-tight text-ce-text">
      <span className="font-bold">Arazzo</span> <span className="font-normal">Studio</span>
    </span>
  );
  const by = (
    <span className="text-xs sm:text-sm font-medium leading-tight text-ce-muted">
      by <ConnEthics />
    </span>
  );

  if (variant === "stacked") {
    return (
      <span className="flex items-center gap-3">
        <ArazzoMark size={size} />
        <span className="flex flex-col">
          {name}
          {by}
        </span>
      </span>
    );
  }

  return (
    <span className="flex items-center gap-3">
      <ArazzoMark size={size} />
      <span className="flex flex-col sm:flex-row sm:items-center sm:gap-3">
        {name}
        <span className="hidden sm:block h-5 w-px bg-ce-border" aria-hidden="true" />
        {by}
      </span>
    </span>
  );
}
