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
  MessageCircle,
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

export const WhatsAppIcon = (p: LucideProps) => <MessageCircle {...p} />;

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
