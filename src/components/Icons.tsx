// Small inline SVG icons. All drawn in currentColor so the theme decides the colour.
// Crop icons must stay distinguishable without colour at about 22 px:
// durum = tall upright ear with awns, chickpea = round puffy pod, faba = long diagonal pod, vetch-oat = tied sheaf,
// lentil = three flat lenses, pea = open pod with a row of peas and a tendril, barley = nodding ear with hanging awns,
// rapeseed = four-petal flower on a stem, coriander = umbrella of stalks with seeds at the tips.
import type { ReactNode, SVGProps } from "react";
import type { CropId, Risk } from "../data/types";

type IconProps = SVGProps<SVGSVGElement> & { title?: string };

function Svg({ title, children, className, ...rest }: IconProps & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className ?? "tc-icon"}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      focusable="false"
      {...rest}
    >
      {title ? <title>{title}</title> : null}
      {children}
    </svg>
  );
}

export function DurumIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 23V7" />
      <g fill="currentColor" stroke="none">
        <ellipse cx="9.9" cy="16.6" rx="1.5" ry="2.4" transform="rotate(-32 9.9 16.6)" />
        <ellipse cx="14.1" cy="16.6" rx="1.5" ry="2.4" transform="rotate(32 14.1 16.6)" />
        <ellipse cx="9.9" cy="12.6" rx="1.5" ry="2.4" transform="rotate(-32 9.9 12.6)" />
        <ellipse cx="14.1" cy="12.6" rx="1.5" ry="2.4" transform="rotate(32 14.1 12.6)" />
        <ellipse cx="12" cy="7.4" rx="1.5" ry="2.4" />
      </g>
      <path d="M9.2 10.4 6.4 3.2M14.8 10.4l2.8-7.2M12 5V1" strokeWidth={1.3} />
    </Svg>
  );
}

export function ChickpeaIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M4.5 14.2c0-4.6 3.4-7.8 7.6-7.8 4.3 0 7.4 3.2 7.4 7.4 0 4-3.3 6.8-7.5 6.8-4.3 0-7.5-2.4-7.5-6.4z" />
      <path d="M16.6 7.6 20 3.6" />
      <circle cx="12" cy="13.6" r="3" fill="currentColor" stroke="none" />
    </Svg>
  );
}

export function FabaIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M3.6 20.4c-1.6-1.6-.4-4.4 1.8-6.6l8-8c2.2-2.2 5.2-3.6 6.8-2s.2 4.6-2 6.8l-8 8c-2.2 2.2-5 3.4-6.6 1.8z" />
      <g fill="currentColor" stroke="none">
        <circle cx="7.4" cy="16.6" r="1.7" />
        <circle cx="11.8" cy="12.2" r="1.7" />
        <circle cx="16.2" cy="7.8" r="1.7" />
      </g>
    </Svg>
  );
}

export function SheafIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M6 2.5 11 13l-3 9M9.2 2 11.6 13M12 1.6V22.4M14.8 2 12.4 13M18 2.5 13 13l3 9" strokeWidth={1.5} />
      <path d="M8.2 13h7.6" strokeWidth={3.2} />
    </Svg>
  );
}

export function LentilIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <ellipse cx="7.6" cy="8.6" rx="4.6" ry="2.9" transform="rotate(-18 7.6 8.6)" />
      <ellipse cx="16.6" cy="9.4" rx="4.6" ry="2.9" transform="rotate(14 16.6 9.4)" />
      <ellipse cx="11.6" cy="17" rx="4.6" ry="2.9" transform="rotate(-4 11.6 17)" />
    </Svg>
  );
}

export function PeaIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M2.5 11c3.2 7.4 15.8 7.4 19 0M2.5 11c5.2 1.6 13.8 1.6 19 0" />
      <g fill="currentColor" stroke="none">
        <circle cx="6.8" cy="13.4" r="1.7" />
        <circle cx="10.4" cy="14" r="1.7" />
        <circle cx="14" cy="14" r="1.7" />
        <circle cx="17.5" cy="13.3" r="1.7" />
      </g>
      <path d="M21.5 11c.8-2.4-.4-4.8-2.6-4.6-1.8.2-2 2.4-.4 2.6" strokeWidth={1.5} />
    </Svg>
  );
}

export function BarleyIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M5 23c0-8 2.5-13.5 8-16.5" />
      <g fill="currentColor" stroke="none">
        <ellipse cx="13.8" cy="6.4" rx="1.4" ry="2.3" transform="rotate(60 13.8 6.4)" />
        <ellipse cx="16.4" cy="7.8" rx="1.4" ry="2.3" transform="rotate(40 16.4 7.8)" />
        <ellipse cx="18.2" cy="10.2" rx="1.4" ry="2.3" transform="rotate(20 18.2 10.2)" />
      </g>
      <path d="M13 8.4 12 20M15.6 10 16 21.5M18 12.6l3 8.4M19 8.2l3.5 8" strokeWidth={1.2} />
    </Svg>
  );
}

export function RapeseedIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="4.4" r="2.6" />
      <circle cx="15.6" cy="8" r="2.6" />
      <circle cx="12" cy="11.6" r="2.6" />
      <circle cx="8.4" cy="8" r="2.6" />
      <path d="M12 14.2V23" />
      <path d="M12 20c-3.2-.4-5.4-2.4-6-5.2 2.8 0 5.2 1.8 6 5.2z" strokeWidth={1.5} />
    </Svg>
  );
}

export function CorianderIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 23V12.5M12 12.5 4.6 7M12 12.5 8.4 4.2M12 12.5l3.6-8.3M12 12.5 19.4 7" strokeWidth={1.6} />
      <g fill="currentColor" stroke="none">
        <circle cx="4.2" cy="6.6" r="1.9" />
        <circle cx="8.2" cy="3.6" r="1.9" />
        <circle cx="15.8" cy="3.6" r="1.9" />
        <circle cx="19.8" cy="6.6" r="1.9" />
      </g>
    </Svg>
  );
}

export function CropIcon({ crop, ...p }: IconProps & { crop: CropId }) {
  switch (crop) {
    case "durum":
      return <DurumIcon {...p} />;
    case "chickpea":
      return <ChickpeaIcon {...p} />;
    case "faba":
      return <FabaIcon {...p} />;
    case "vetch-oat":
      return <SheafIcon {...p} />;
    case "lentil":
      return <LentilIcon {...p} />;
    case "pea":
      return <PeaIcon {...p} />;
    case "barley":
      return <BarleyIcon {...p} />;
    case "rapeseed":
      return <RapeseedIcon {...p} />;
    case "coriander":
      return <CorianderIcon {...p} />;
  }
}

export function DryIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 3.5c3 3.8 5.5 7 5.5 10a5.5 5.5 0 0 1-11 0c0-3 2.5-6.2 5.5-10z" />
      <path d="M4 4l16 16" />
    </Svg>
  );
}

export function FrostIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 2v20M3.3 7l17.4 10M3.3 17 20.7 7" />
      <path d="M9.5 3.5 12 6l2.5-2.5M9.5 20.5 12 18l2.5 2.5" strokeWidth={1.5} />
    </Svg>
  );
}

export function HeatIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M10 14.5V4.5a2 2 0 0 1 4 0v10a4 4 0 1 1-4 0z" />
      <circle cx="12" cy="17.8" r="1.6" fill="currentColor" stroke="none" />
      <path d="M12 16V9" />
      <path d="M17.5 6h2.5M17.5 9.5h2.5" strokeWidth={1.5} />
    </Svg>
  );
}

export function RainIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M7 14.5a4.5 4.5 0 0 1-.6-9 5.5 5.5 0 0 1 10.6 1.2 3.9 3.9 0 0 1 0 7.8z" />
      <path d="M8 17.5 6.5 21M12 17.5 10.5 21M16 17.5 14.5 21" />
    </Svg>
  );
}

export function RiskIcon({ risk, ...p }: IconProps & { risk: Risk }) {
  switch (risk) {
    case "dry":
      return <DryIcon {...p} />;
    case "frost":
      return <FrostIcon {...p} />;
    case "heat":
      return <HeatIcon {...p} />;
    case "rain":
      return <RainIcon {...p} />;
  }
}

export function BareSoilIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M2 14c2.5-1.5 4.5-1.5 7 0s4.5 1.5 7 0 4.5-1.5 6 0M2 18.5c2.5-1.5 4.5-1.5 7 0s4.5 1.5 7 0 4.5-1.5 6 0" />
      <circle cx="17" cy="6" r="2.6" />
    </Svg>
  );
}

/** Icon for a finding, from its title key `finding.<id>.title`. */
export function FindingIcon({ titleKey, ...p }: IconProps & { titleKey: string }) {
  const id = titleKey.split(".")[1];
  if (id === "bare") return <BareSoilIcon {...p} />;
  if (id === "heat") return <HeatIcon {...p} />;
  if (id === "dry") return <DryIcon {...p} />;
  return <WarnIcon {...p} />;
}

export function SearchIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m15.5 15.5 5.5 5.5" />
    </Svg>
  );
}

export function LocateIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="6.5" />
      <circle cx="12" cy="12" r="2" fill="currentColor" stroke="none" />
      <path d="M12 1.5v4M12 18.5v4M1.5 12h4M18.5 12h4" />
    </Svg>
  );
}

export function PencilIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M4 20l1-5L16 4l4 4L9 19z" />
      <path d="M13.5 6.5l4 4" />
    </Svg>
  );
}

export function CheckIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M4 12.5 9.5 18 20 6" strokeWidth={2.4} />
    </Svg>
  );
}

export function WarnIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 3 22 20.5H2z" />
      <path d="M12 9.5v5" strokeWidth={2.2} />
      <circle cx="12" cy="17.4" r="1.1" fill="currentColor" stroke="none" />
    </Svg>
  );
}

export function ChevronIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="m9 5 7 7-7 7" strokeWidth={2.2} />
    </Svg>
  );
}

export function BackIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="m15 5-7 7 7 7" strokeWidth={2.2} />
    </Svg>
  );
}

export function PrintIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M6 9V3h12v6M6 17H3v-7h18v7h-3" />
      <path d="M6 14h12v7H6z" />
    </Svg>
  );
}

export function ChatIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M4 19.5 5.3 15A8 8 0 1 1 9 18.6z" />
      <path d="M8.5 10.5h7M8.5 13.5h4.5" strokeWidth={1.6} />
    </Svg>
  );
}

export function LinkIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M10 14a4 4 0 0 0 5.7 0l3.6-3.6a4 4 0 0 0-5.7-5.7L12 6.3" />
      <path d="M14 10a4 4 0 0 0-5.7 0l-3.6 3.6a4 4 0 0 0 5.7 5.7l1.6-1.6" />
    </Svg>
  );
}

export function DropIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 3c3.2 4 5.8 7.3 5.8 10.4a5.8 5.8 0 0 1-11.6 0C6.2 10.3 8.8 7 12 3z" />
    </Svg>
  );
}

export function NitrogenIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="9.5" />
      <path d="M8.8 16.5v-9l6.4 9v-9" strokeWidth={2} />
    </Svg>
  );
}

export function EuroIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M17.5 6.2A7 7 0 1 0 17.5 17.8" />
      <path d="M4.5 10h9M4.5 14h8" />
    </Svg>
  );
}

export function RiskShieldIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 2.5 20 5.5v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10v-6z" />
      <path d="M12 8v5" strokeWidth={2.2} />
      <circle cx="12" cy="16.2" r="1.1" fill="currentColor" stroke="none" />
    </Svg>
  );
}

/** Public support: a columned public building. */
export function SupportIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M3 9.5 12 4l9 5.5zM5 20.5h14M6.5 10v8M10 10v8M14 10v8M17.5 10v8" />
    </Svg>
  );
}

/** Settings: a gear. */
export function GearIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="3.2" />
      <path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1" strokeWidth={2.4} />
      <circle cx="12" cy="12" r="6.6" />
    </Svg>
  );
}

/** Your field: a square plot. */
export function FieldScaleIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M5 5h14v14H5z" />
      <path d="M5 12h14M12 5v14" strokeWidth={1.2} />
    </Svg>
  );
}

/** Your area: a wide circle around a point. */
export function AreaScaleIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="9" strokeDasharray="2.6 2.4" />
      <circle cx="12" cy="12" r="2.2" fill="currentColor" stroke="none" />
    </Svg>
  );
}

/** Standard view: satellite tiles. */
export function TilesIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" />
    </Svg>
  );
}

/** Simple view: large type. */
export function BigTextIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M3 20 9 4l6 16M5.3 14h7.4" strokeWidth={2.2} />
      <path d="M16 20v-7M21 20v-7M16 16.5h5" strokeWidth={1.6} />
    </Svg>
  );
}

/** Voice: a microphone. */
export function MicIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M8.5 21h7" />
    </Svg>
  );
}

/** Listening: the microphone filled, with sound waves either side, so the state shows without colour. */
export function MicLiveIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x="9" y="3" width="6" height="11" rx="3" fill="currentColor" />
      <path d="M6.5 11a5.5 5.5 0 0 0 11 0M12 16.5V21M8.5 21h7" />
      <path d="M3 7.5v5M21 7.5v5" strokeWidth={2.4} />
    </Svg>
  );
}

/** Read aloud: a loudspeaker with sound waves. */
export function SpeakerIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" />
      <path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" />
    </Svg>
  );
}

/** Stop reading: a filled square. */
export function StopIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x="6" y="6" width="12" height="12" rx="1.5" fill="currentColor" />
    </Svg>
  );
}
