import React from 'react';

/** Ícones simples (SVG próprio, herdam a cor do texto). Decorativos: quem usa deve ter rótulo de texto. */
type IconProps = React.SVGProps<SVGSVGElement>;

function Svg({ children, ...rest }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="1.5em"
      height="1.5em"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
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

export const HomeIcon = (p: IconProps) => (
  <Svg {...p}><path d="M3 11.5 12 4l9 7.5" /><path d="M5.5 10.5V20h13v-9.5" /><path d="M10 20v-5h4v5" /></Svg>
);
export const TargetIcon = (p: IconProps) => (
  <Svg {...p}><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.2" fill="currentColor" /></Svg>
);
export const GavelIcon = (p: IconProps) => (
  <Svg {...p}><path d="m14 4 6 6" /><path d="m11.5 6.5 6 6" /><path d="m9 9 6 6" /><path d="m3 21 7-7" /><path d="M4 21h8" /></Svg>
);
export const GamepadIcon = (p: IconProps) => (
  <Svg {...p}><rect x="2.5" y="7" width="19" height="11" rx="5" /><path d="M7.5 10.5v4M5.5 12.5h4" /><circle cx="15.5" cy="11.5" r=".9" fill="currentColor" /><circle cx="18" cy="14" r=".9" fill="currentColor" /></Svg>
);
export const UserIcon = (p: IconProps) => (
  <Svg {...p}><circle cx="12" cy="8" r="4" /><path d="M4.5 20c.8-4 3.7-6 7.5-6s6.7 2 7.5 6" /></Svg>
);
export const TrophyIcon = (p: IconProps) => (
  <Svg {...p}><path d="M8 4h8v5a4 4 0 0 1-8 0V4Z" /><path d="M8 6H4.5v1.5A3.5 3.5 0 0 0 8 11M16 6h3.5v1.5A3.5 3.5 0 0 1 16 11" /><path d="M12 13v4M8.5 20h7M10 17h4" /></Svg>
);
export const MedalIcon = (p: IconProps) => (
  <Svg {...p}><circle cx="12" cy="15" r="5" /><path d="m9 10.5-2.5-7h4L12 7M15 10.5l2.5-7h-4L12 7" /></Svg>
);
export const BellIcon = (p: IconProps) => (
  <Svg {...p}><path d="M6 17V11a6 6 0 1 1 12 0v6l1.5 2h-15L6 17Z" /><path d="M10 21h4" /></Svg>
);
export const StarIcon = (p: IconProps) => (
  <Svg {...p} fill="currentColor"><path d="m12 3.5 2.6 5.4 5.9.8-4.3 4.1 1 5.9L12 16.9l-5.2 2.8 1-5.9-4.3-4.1 5.9-.8L12 3.5Z" /></Svg>
);
export const CoinIcon = (p: IconProps) => (
  <Svg {...p}><circle cx="12" cy="12" r="9" fill="currentColor" fillOpacity={0.25} /><circle cx="12" cy="12" r="5.5" /><path d="M12 9.5v5" /></Svg>
);
export const SoundOnIcon = (p: IconProps) => (
  <Svg {...p}><path d="M4 9.5h3.5L12 6v12l-4.5-3.5H4v-5Z" fill="currentColor" fillOpacity={0.25} /><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" /></Svg>
);
export const SoundOffIcon = (p: IconProps) => (
  <Svg {...p}><path d="M4 9.5h3.5L12 6v12l-4.5-3.5H4v-5Z" fill="currentColor" fillOpacity={0.25} /><path d="m16 9.5 5 5M21 9.5l-5 5" /></Svg>
);
export const CheckIcon = (p: IconProps) => (
  <Svg {...p}><path d="m5 12.5 4.5 4.5L19 7.5" /></Svg>
);

export const SunIcon = (p: IconProps) => (
  <Svg {...p}><circle cx="12" cy="12" r="4" /><path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M18.7 5.3l-1.8 1.8M7.1 16.9l-1.8 1.8" /></Svg>
);
export const BookIcon = (p: IconProps) => (
  <Svg {...p}><path d="M4 5.5C6.5 4.5 9.5 4.5 12 6c2.5-1.5 5.5-1.5 8-.5v13c-2.5-1-5.5-1-8 .5-2.5-1.5-5.5-1.5-8-.5Z" /><path d="M12 6v13" /></Svg>
);
export const MoreIcon = (p: IconProps) => (
  <Svg {...p}><circle cx="12" cy="5" r="1.4" fill="currentColor" /><circle cx="12" cy="12" r="1.4" fill="currentColor" /><circle cx="12" cy="19" r="1.4" fill="currentColor" /></Svg>
);
