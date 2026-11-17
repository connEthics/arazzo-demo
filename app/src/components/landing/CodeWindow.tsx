// Editor-style code window (always dark, like an editor in a dark theme), used for YAML and Markdown samples.
// Token colors come from the ConnEthics primitives and stay ≥ 4.5:1 on slate-950.

export type Tok = { t: string; k?: "key" | "str" | "com" | "kw" | "head" | "num" };
export type Line = { tokens: Tok[]; highlight?: boolean; indent?: number };

const COLOR: Record<NonNullable<Tok["k"]>, string> = {
  key: "text-[#93c5fd]", // blue-300
  str: "text-[#fdba74]", // orange-300
  com: "text-[#94a3b8]", // slate-400
  kw: "text-[#5eead4]", // teal-300
  head: "text-[#93c5fd] font-semibold",
  num: "text-[#c4b5fd]", // violet-300
};

export default function CodeWindow({
  filename,
  lines,
  badge,
  className = "",
}: {
  filename: string;
  lines: Line[];
  badge?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`relative min-w-0 max-w-full rounded-xl border border-[#1e293b] bg-[#020617] shadow-[var(--ce-shadow-xl)] ${className}`}>
      <div className="flex items-center gap-2 border-b border-[#1e293b] px-4 py-2.5">
        <span className="h-3 w-3 rounded-full bg-[#334155]" aria-hidden="true" />
        <span className="h-3 w-3 rounded-full bg-[#334155]" aria-hidden="true" />
        <span className="h-3 w-3 rounded-full bg-[#334155]" aria-hidden="true" />
        <span className="ml-3 truncate font-mono text-xs text-[#cbd5e1]">{filename}</span>
      </div>
      <pre className="overflow-x-auto px-0 py-3 font-mono [font-variant-ligatures:none] text-[12.5px] leading-6 sm:text-[13px]">
        <code className="block w-max min-w-full">
          {lines.map((line, i) => (
            <div
              key={i}
              className={`flex gap-4 pr-4 ${
                line.highlight ? "border-l-2 border-[#3b82f6] bg-[#172554] pl-[14px]" : "border-l-2 border-transparent pl-[14px]"
              }`}
            >
              <span className="w-5 shrink-0 select-none text-right text-[#94a3b8]" aria-hidden="true">
                {i + 1}
              </span>
              <span className="whitespace-pre text-[#e2e8f0]">
                {" ".repeat(line.indent ?? 0)}
                {line.tokens.map((tok, j) => (
                  <span key={j} className={tok.k ? COLOR[tok.k] : undefined}>
                    {tok.t}
                  </span>
                ))}
              </span>
            </div>
          ))}
        </code>
      </pre>
      {badge}
    </div>
  );
}

/** Tiny YAML helper: `key: value` with optional comment. */
export function kv(key: string, value?: string, opts: Partial<Line> & { kind?: Tok["k"]; dash?: boolean } = {}): Line {
  const tokens: Tok[] = [];
  if (opts.dash) tokens.push({ t: "- " });
  tokens.push({ t: key, k: "key" }, { t: ":" });
  if (value !== undefined) tokens.push({ t: " " }, { t: value, k: opts.kind ?? "str" });
  return { tokens, indent: opts.indent, highlight: opts.highlight };
}
