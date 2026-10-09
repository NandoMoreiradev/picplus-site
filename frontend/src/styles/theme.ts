export const theme = {
  colors: {
    background: '#0a0a0a',
    surface: '#171717',
    surfaceHover: '#262626',
    surfaceElevated: '#1f1f1f',
    primary: '#B6E829', // Lime green from the logo
    primaryHover: '#9DD61E',
    primarySoft: 'rgba(182, 232, 41, 0.12)',
    primaryBorder: 'rgba(182, 232, 41, 0.35)',
    text: '#FFFFFF',
    textSecondary: '#A3A3A3',
    textMuted: '#737373',
    textDark: '#0a0a0a', // Used when text is inside primary color button
    danger: '#ef4444',
    dangerSoft: 'rgba(239, 68, 68, 0.12)',
    success: '#22c55e',
    successSoft: 'rgba(34, 197, 94, 0.12)',
    warning: '#f59e0b',
    warningSoft: 'rgba(245, 158, 11, 0.12)',
    info: '#38bdf8',
    infoSoft: 'rgba(56, 189, 248, 0.12)',
    border: '#262626',
    borderStrong: '#404040',
    overlay: 'rgba(0, 0, 0, 0.72)',
  },
  fonts: {
    main: "'Poppins', system-ui, sans-serif",
    heading: "'Hero', 'Poppins', system-ui, sans-serif",
  },
  radii: {
    sm: '6px',
    md: '10px',
    lg: '16px',
    xl: '24px',
    pill: '999px',
  },
  shadows: {
    card: '0 1px 2px rgba(0, 0, 0, 0.4), 0 8px 24px rgba(0, 0, 0, 0.25)',
    cardHover: '0 2px 4px rgba(0, 0, 0, 0.4), 0 16px 40px rgba(0, 0, 0, 0.4)',
    glow: '0 0 0 1px rgba(182, 232, 41, 0.35), 0 12px 40px rgba(182, 232, 41, 0.18)',
    overlay: '0 24px 80px rgba(0, 0, 0, 0.6)',
  },
  breakpoints: {
    mobile: '480px',
    tablet: '768px',
    laptop: '1024px',
    desktop: '1200px',
  },
  transitions: {
    default: '0.3s ease-in-out',
    fast: '0.18s ease-out',
  },
  layout: {
    maxWidth: '1200px',
    headerHeight: '76px',
  },
};

export type Theme = typeof theme;
