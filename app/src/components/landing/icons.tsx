// Inline stroke icons used by the landing page (24×24, currentColor, decorative).
type IconProps = { className?: string };

function Svg({ className = "w-6 h-6", children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

export const ArrowRightIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M13 7l5 5-5 5M18 12H6" />
  </Svg>
);

export const ExternalIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6v6M20 4L10 14" />
  </Svg>
);

export const CheckIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M5 13l4 4L19 7" />
  </Svg>
);

export const CheckCircleIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M9 12l2 2 4-4" />
    <circle cx="12" cy="12" r="9" />
  </Svg>
);

export const CodeIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M10 20l4-16M18 8l4 4-4 4M6 16l-4-4 4-4" />
  </Svg>
);

export const DownloadIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1M8 12l4 4 4-4M12 16V4" />
  </Svg>
);

export const SparklesIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M5 3v4M3 5h4M6 17v4M4 19h4M13 3l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
  </Svg>
);

/** AsyncAPI / events: two arrows (send ↗ / receive ↙). */
export const EventsIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M7 17L17 7M9 7h8v8" />
    <path d="M4 20h6" />
  </Svg>
);

/** dependsOn: fan-out then join. */
export const JoinIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="4" r="2" />
    <circle cx="5" cy="12" r="2" />
    <circle cx="19" cy="12" r="2" />
    <circle cx="12" cy="20" r="2" />
    <path d="M10.5 5.5L6.5 10.5M13.5 5.5l4 5M6.5 13.5l4 5M17.5 13.5l-4 5" strokeDasharray="0.5 3" />
  </Svg>
);

/** Selector Object: a target inside brackets. */
export const SelectorIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M8 4H5v16h3M16 4h3v16h-3" />
    <circle cx="12" cy="12" r="2.5" />
  </Svg>
);

export const ShieldCheckIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M9 12l2 2 4-4M20.618 5.984A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </Svg>
);

export const LayersIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 3l9 5-9 5-9-5 9-5z" />
    <path d="M3 13l9 5 9-5" />
  </Svg>
);

export const RepeatIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M17 2l4 4-4 4" />
    <path d="M3 11V9a3 3 0 013-3h15M7 22l-4-4 4-4" />
    <path d="M21 13v2a3 3 0 01-3 3H3" />
  </Svg>
);

export const BotIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="4" y="8" width="16" height="12" rx="3" />
    <path d="M12 4v4M9 13h.01M15 13h.01M9 17h6" />
  </Svg>
);

export const TestIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M9 3h6M10 3v6L4.5 18.5A1.5 1.5 0 005.8 21h12.4a1.5 1.5 0 001.3-2.5L14 9V3" />
    <path d="M7.5 15h9" />
  </Svg>
);

export const HandshakeIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 6h5l3 3M20 6h-5l-5 5a1.5 1.5 0 002 2l3-3 4 4" />
    <path d="M2 6v8h3l5 5a1.5 1.5 0 002-2M22 6v8h-3" />
  </Svg>
);

export const BookIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 19.5A2.5 2.5 0 016.5 17H20V3H6.5A2.5 2.5 0 004 5.5v14zM4 19.5A2.5 2.5 0 006.5 22H20v-5" />
  </Svg>
);

export function GitHubIcon({ className = "w-6 h-6" }: IconProps) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
      />
    </svg>
  );
}
