// Hand-drawn product illustrations for the categories we source. Two-tone line art:
// ink strokes, marigold and kraft fills. 64x64 viewBox.

const S = { stroke: "#0A1628", strokeWidth: 1.6, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
const KRAFT = "#E9C996";
const GOLD = "#FFB21E";
const SOFT = "#FFF4DB";

export function CupArt() {
  return (
    <svg viewBox="0 0 64 64" className="h-full w-full" aria-hidden>
      <path d="M19 18h26l-3.2 36a3 3 0 0 1-3 2.8H25.2a3 3 0 0 1-3-2.8L19 18Z" fill="#fff" {...S} />
      <path d="M20.3 31h23.4l-1.2 13H21.5l-1.2-13Z" fill={GOLD} />
      <path d="M20.3 31h23.4M21.5 44h21" fill="none" {...S} />
      <path d="M16.5 13.5h31a1.5 1.5 0 0 1 1.5 1.5v1.5a1.5 1.5 0 0 1-1.5 1.5h-31A1.5 1.5 0 0 1 15 16.5V15a1.5 1.5 0 0 1 1.5-1.5Z" fill={SOFT} {...S} />
      <path d="M26 9.5c0-2 1.2-3 3-3h6c1.8 0 3 1 3 3v4H26v-4Z" fill="#fff" {...S} />
      <path d="M29 37.5l2 2 4-4" stroke="#0A1628" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function BoxArt() {
  return (
    <svg viewBox="0 0 64 64" className="h-full w-full" aria-hidden>
      <path d="M10 28l22-9 22 9v18l-22 9-22-9V28Z" fill={KRAFT} {...S} />
      <path d="M10 28l22 9 22-9M32 37v18" fill="none" {...S} />
      <path d="M10 28l-3-7 22-9 3 7M54 28l3-7-22-9-3 7" fill={SOFT} {...S} />
      <path d="M19 41.5l6 2.5" stroke={GOLD} strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function BagArt() {
  return (
    <svg viewBox="0 0 64 64" className="h-full w-full" aria-hidden>
      <path d="M24 22v-5a8 8 0 0 1 16 0v5" fill="none" {...S} />
      <path d="M14 22h36l2.5 32a2 2 0 0 1-2 2.2H13.5a2 2 0 0 1-2-2.2L14 22Z" fill={KRAFT} {...S} />
      <path d="M14 22l6 6h24l6-6" fill="none" {...S} />
      <circle cx="32" cy="41" r="6" fill={GOLD} />
      <path d="M29.5 41h5M32 38.5v5" stroke="#0A1628" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function PouchArt() {
  return (
    <svg viewBox="0 0 64 64" className="h-full w-full" aria-hidden>
      <path d="M18 9h28v6c0 10 4 22 4 32 0 5-3 9-6 9H20c-3 0-6-4-6-9 0-10 4-22 4-32V9Z" fill="#fff" {...S} />
      <path d="M18 15h28" fill="none" {...S} strokeDasharray="2 2.5" />
      <path d="M17 26h30v14H17z" fill={GOLD} stroke="none" />
      <path d="M16.6 26h30.8M15.6 40h32.8" fill="none" {...S} />
      <rect x="25" y="29.5" width="14" height="7" rx="3.5" fill="#fff" {...S} />
      <path d="M20 56c2-3 22-3 24 0" fill="none" {...S} />
    </svg>
  );
}

export function CartonArt() {
  return (
    <svg viewBox="0 0 64 64" className="h-full w-full" aria-hidden>
      <path d="M21 14l18-5 10 6v38l-18 5-10-6V14Z" fill="#fff" {...S} />
      <path d="M21 14l10 6 18-5M31 20v38" fill="none" {...S} />
      <path d="M31 20l18-5v38l-18 5V20Z" fill={SOFT} {...S} />
      <path d="M35 30l10-2.8v8L35 38v-8Z" fill={GOLD} />
      <path d="M24 26v14" stroke={GOLD} strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function LabelArt() {
  return (
    <svg viewBox="0 0 64 64" className="h-full w-full" aria-hidden>
      <ellipse cx="22" cy="32" rx="10" ry="18" fill={SOFT} {...S} />
      <ellipse cx="22" cy="32" rx="4" ry="7" fill="#fff" {...S} />
      <path d="M22 14h24c4 0 6 8 6 18s-2 18-6 18H22" fill="none" {...S} />
      <rect x="35" y="23" width="12" height="8" rx="2" fill={GOLD} />
      <rect x="35" y="34" width="12" height="8" rx="2" fill="#fff" {...S} />
    </svg>
  );
}

export function FabricArt() {
  return (
    <svg viewBox="0 0 64 64" className="h-full w-full" aria-hidden>
      <path d="M12 20c0-4 3-7 7-7h0c4 0 7 3 7 7v26c0 4-3 7-7 7s-7-3-7-7V20Z" fill={GOLD} {...S} />
      <ellipse cx="19" cy="20" rx="7" ry="7" fill={SOFT} {...S} />
      <circle cx="19" cy="20" r="2.2" fill="none" {...S} />
      <path d="M19 53h33l-4-8 4-8-4-8 4-8H26" fill="#fff" {...S} />
      <path d="M32 31l4 4 4-4 4 4" fill="none" {...S} />
    </svg>
  );
}

export const PRODUCTS = [
  { name: "Paper cups", art: CupArt },
  { name: "Food boxes", art: BoxArt },
  { name: "Carry bags", art: BagArt },
  { name: "Pouches", art: PouchArt },
  { name: "Mono cartons", art: CartonArt },
  { name: "Labels", art: LabelArt },
  { name: "Fabric", art: FabricArt },
];
