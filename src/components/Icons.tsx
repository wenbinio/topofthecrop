// Small inline SVG icons. All drawn in currentColor so the theme decides the colour.
// Crop icons must stay distinguishable without colour at about 22 px:
// durum = tall ear with awns, chickpea = round puffy pod, faba = long diagonal pod, vetch-oat = tied sheaf.
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
