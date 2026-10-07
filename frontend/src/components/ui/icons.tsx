import type { ComponentType, SVGProps } from 'react';
import {
  BarChart3,
  Briefcase,
  Camera,
  Clapperboard,
  Compass,
  Handshake,
  Heart,
  Layers,
  Lightbulb,
  Megaphone,
  Play,
  Rocket,
  Shield,
  Sparkles,
  Star,
  Target,
  TrendingUp,
  Users,
} from 'lucide-react';
import type { LucideProps } from 'lucide-react';
import type { SocialNetwork } from '../../lib/types';

/* A versão atual do lucide não inclui logos de marcas; estes ícones seguem o mesmo traço. */

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function BrandIcon({ size = 20, children, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {children}
    </svg>
  );
}

export const InstagramIcon = (p: IconProps) => (
  <BrandIcon {...p}>
    <rect x="3" y="3" width="18" height="18" rx="5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" />
  </BrandIcon>
);

export const TikTokIcon = (p: IconProps) => (
  <BrandIcon {...p}>
    <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
  </BrandIcon>
);

export const YouTubeIcon = (p: IconProps) => (
  <BrandIcon {...p}>
    <path d="M2.5 17a24.1 24.1 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.6 49.6 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.1 24.1 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.6 49.6 0 0 1-16.2 0A2 2 0 0 1 2.5 17" />
    <path d="m10 15 5-3-5-3z" />
  </BrandIcon>
);

export const XIcon = (p: IconProps) => (
  <BrandIcon {...p}>
    <path d="M4 4l11.7 16H20L8.3 4z" />
    <path d="M4 20l6.8-6.8M13.2 10.8L20 4" />
  </BrandIcon>
);

export const TwitchIcon = (p: IconProps) => (
  <BrandIcon {...p}>
    <path d="M21 2H3v16h5v4l4-4h5l4-4V2z" />
    <path d="M11 11V7M16 11V7" />
  </BrandIcon>
);

export const LinkedInIcon = (p: IconProps) => (
  <BrandIcon {...p}>
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
    <rect width="4" height="12" x="2" y="9" />
    <circle cx="4" cy="4" r="2" />
  </BrandIcon>
);

/** Logotipo do WhatsApp (glifo preenchido, herda a cor do texto). */
export const WhatsAppIcon = ({ size = 20, ...rest }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 448 512" fill="currentColor" aria-hidden="true" {...rest}>
    <path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7.9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z" />
  </svg>
);

export const SOCIAL_META: Record<
  SocialNetwork,
  { label: string; Icon: ComponentType<IconProps> }
> = {
  instagram: { label: 'Instagram', Icon: InstagramIcon },
  tiktok: { label: 'TikTok', Icon: TikTokIcon },
  youtube: { label: 'YouTube', Icon: YouTubeIcon },
  twitter: { label: 'X (Twitter)', Icon: XIcon },
  twitch: { label: 'Twitch', Icon: TwitchIcon },
};

/** Ícones disponíveis para os serviços (campo `icon` no CMS). */
export const SERVICE_ICONS: Record<string, ComponentType<LucideProps>> = {
  megaphone: Megaphone,
  compass: Compass,
  clapperboard: Clapperboard,
  users: Users,
  camera: Camera,
  target: Target,
  chart: BarChart3,
  trending: TrendingUp,
  sparkles: Sparkles,
  rocket: Rocket,
  lightbulb: Lightbulb,
  handshake: Handshake,
  heart: Heart,
  star: Star,
  layers: Layers,
  play: Play,
  shield: Shield,
  briefcase: Briefcase,
};

export function ServiceIcon({ icon, ...rest }: { icon?: string | null } & LucideProps) {
  const Icon = (icon && SERVICE_ICONS[icon]) || Sparkles;
  return <Icon {...rest} />;
}
