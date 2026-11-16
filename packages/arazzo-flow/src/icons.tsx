/**
 * Icônes SVG inline (style trait 1,9 px, 24×24), sans dépendance à lucide-react.
 * Dessins originaux simples ; décoratives (aria-hidden) car le texte voisin porte le sens.
 */
import type { ReactNode, SVGProps } from 'react';

type P = SVGProps<SVGSVGElement> & { size?: number };

function Svg({ size = 14, children, ...rest }: P & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  );
}

export const IconInput = (p: P) => (
  <Svg {...p}>
    <path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4" />
    <path d="M3 12h11" />
    <path d="m10 8 4 4-4 4" />
  </Svg>
);
export const IconOutput = (p: P) => (
  <Svg {...p}>
    <path d="M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4" />
    <path d="M10 12h11" />
    <path d="m17 8 4 4-4 4" />
  </Svg>
);
export const IconGlobe = (p: P) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18" />
    <path d="M12 3a14 14 0 0 1 0 18a14 14 0 0 1 0-18z" />
  </Svg>
);
/** Enveloppe pleine : message émis (BPMN « throw »). */
export const IconSend = (p: P) => (
  <Svg {...p}>
    <rect x="3" y="5" width="18" height="14" rx="2" fill="currentColor" />
    <path d="m3.5 6.5 8.5 6.5 8.5-6.5" stroke="var(--af-node-bg, #fff)" />
  </Svg>
);
/** Enveloppe contour : message attendu (BPMN « catch »). */
export const IconReceive = (p: P) => (
  <Svg {...p}>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="m3.5 6.5 8.5 6.5 8.5-6.5" />
  </Svg>
);
export const IconWorkflow = (p: P) => (
  <Svg {...p}>
    <rect x="3" y="3" width="7" height="7" rx="1.5" />
    <rect x="14" y="14" width="7" height="7" rx="1.5" />
    <path d="M6.5 10v3a2 2 0 0 0 2 2H14" />
  </Svg>
);
export const IconExternal = (p: P) => (
  <Svg {...p}>
    <path d="M14 4h6v6" />
    <path d="M20 4 11 13" />
    <path d="M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4" />
  </Svg>
);
export const IconClock = (p: P) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </Svg>
);
export const IconLink = (p: P) => (
  <Svg {...p}>
    <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" />
    <path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />
  </Svg>
);
export const IconCheck = (p: P) => (
  <Svg {...p}>
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </Svg>
);
export const IconX = (p: P) => (
  <Svg {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </Svg>
);
export const IconRetry = (p: P) => (
  <Svg {...p}>
    <path d="M20 11a8 8 0 1 0-2.3 5.7" />
    <path d="M20 4v7h-7" />
  </Svg>
);
export const IconOutputs = (p: P) => (
  <Svg {...p}>
    <path d="M7 7h10M7 12h10M7 17h6" />
  </Svg>
);
export const IconBraces = (p: P) => (
  <Svg {...p}>
    <path d="M8 4c-2 0-3 1-3 3v2c0 1.5-1 3-2 3 1 0 2 1.5 2 3v2c0 2 1 3 3 3" />
    <path d="M16 4c2 0 3 1 3 3v2c0 1.5 1 3 2 3-1 0-2 1.5-2 3v2c0 2-1 3-3 3" />
  </Svg>
);
export const IconWarning = (p: P) => (
  <Svg {...p}>
    <path d="M12 3 2.5 20h19z" />
    <path d="M12 10v4M12 17.5v.01" />
  </Svg>
);
export const IconError = (p: P) => (
  <Svg {...p}>
    <path d="M8 3h8l5 5v8l-5 5H8l-5-5V8z" />
    <path d="M12 8v5M12 16.5v.01" />
  </Svg>
);
export const IconInfo = (p: P) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5M12 8v.01" />
  </Svg>
);
export const IconSearch = (p: P) => (
  <Svg {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-4-4" />
  </Svg>
);
export const IconPlus = (p: P) => (
  <Svg {...p}>
    <path d="M12 5v14M5 12h14" />
  </Svg>
);
export const IconMinus = (p: P) => (
  <Svg {...p}>
    <path d="M5 12h14" />
  </Svg>
);
export const IconFit = (p: P) => (
  <Svg {...p}>
    <path d="M4 9V5a1 1 0 0 1 1-1h4M15 4h4a1 1 0 0 1 1 1v4M20 15v4a1 1 0 0 1-1 1h-4M9 20H5a1 1 0 0 1-1-1v-4" />
  </Svg>
);
export const IconOneToOne = (p: P) => (
  <Svg {...p}>
    <path d="M6 9l2-1.5V16M16 9l2-1.5V16" />
    <path d="M12 10.5v.01M12 14.5v.01" />
  </Svg>
);
export const IconArrowDown = (p: P) => (
  <Svg {...p}>
    <rect x="8" y="2.5" width="8" height="5" rx="1" />
    <rect x="8" y="16.5" width="8" height="5" rx="1" />
    <path d="M12 7.5v8M9.5 13l2.5 2.5 2.5-2.5" />
  </Svg>
);
export const IconArrowRight = (p: P) => (
  <Svg {...p}>
    <rect x="2.5" y="8" width="5" height="8" rx="1" />
    <rect x="16.5" y="8" width="5" height="8" rx="1" />
    <path d="M7.5 12h8M13 9.5l2.5 2.5-2.5 2.5" />
  </Svg>
);
export const IconLanes = (p: P) => (
  <Svg {...p}>
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <path d="M9 3v18M15 3v18" />
  </Svg>
);
export const IconMap = (p: P) => (
  <Svg {...p}>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <rect x="12" y="11" width="6" height="5" rx="1" />
  </Svg>
);
export const IconFailureEdges = (p: P) => (
  <Svg {...p}>
    <path d="M4 20 20 4" strokeDasharray="3 3" />
    <path d="M14 4h6v6" />
  </Svg>
);
export const IconKeyboard = (p: P) => (
  <Svg {...p}>
    <rect x="2.5" y="6" width="19" height="12" rx="2" />
    <path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10" />
  </Svg>
);
export const IconDensity = (p: P) => (
  <Svg {...p}>
    <rect x="4" y="4" width="16" height="5" rx="1" />
    <rect x="4" y="12" width="16" height="8" rx="1" />
  </Svg>
);
export const IconLegend = (p: P) => (
  <Svg {...p}>
    <path d="M4 7h3M4 12h3M4 17h3" />
    <path d="M10 7h10M10 12h10M10 17h10" />
  </Svg>
);
export const IconChevron = ({ open, ...p }: P & { open?: boolean }) => (
  <Svg {...p}>
    <path d={open ? 'm6 9 6 6 6-6' : 'm9 6 6 6-6 6'} />
  </Svg>
);
export const IconFocus = (p: P) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
  </Svg>
);
export const IconCode = (p: P) => (
  <Svg {...p}>
    <path d="m8 7-5 5 5 5M16 7l5 5-5 5" />
  </Svg>
);

export function SourceTypeIcon({ type, size }: { type?: string; size?: number }) {
  if (type === 'asyncapi') return <IconReceive size={size} />;
  if (type === 'arazzo') return <IconWorkflow size={size} />;
  return <IconGlobe size={size} />;
}
export const IconDownload = (p: P) => (
  <Svg {...p}>
    <path d="M12 4v11" />
    <path d="m7 10 5 5 5-5" />
    <path d="M5 20h14" />
  </Svg>
);
export const IconList = (p: P) => (
  <Svg {...p}>
    <path d="M9 6h11M9 12h11M9 18h11" />
    <circle cx="4.5" cy="6" r="1" />
    <circle cx="4.5" cy="12" r="1" />
    <circle cx="4.5" cy="18" r="1" />
  </Svg>
);
