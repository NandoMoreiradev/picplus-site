export const theme = {
  colors: {
    background: '#0a0a0a',
    surface: '#171717',
    surfaceHover: '#262626',
    primary: '#B6E829', // Lime green from the logo
    primaryHover: '#9DD61E',
    text: '#FFFFFF',
    textSecondary: '#A3A3A3',
    textDark: '#0a0a0a', // Used when text is inside primary color button
    danger: '#ef4444',
    success: '#22c55e',
    border: '#262626',
  },
  fonts: {
    main: "'Nunito', 'Inter', sans-serif", // Nunito fits the rounded logo style
    heading: "'Nunito', 'Inter', sans-serif",
  },
  breakpoints: {
    mobile: '480px',
    tablet: '768px',
    laptop: '1024px',
    desktop: '1200px',
  },
  transitions: {
    default: '0.3s ease-in-out',
  },
};

export type Theme = typeof theme;
