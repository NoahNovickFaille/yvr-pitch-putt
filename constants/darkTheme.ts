/**
 * Dark Theme Design System
 *
 * Professional dark theme inspired by Claude's iOS app aesthetic.
 * Clean, modern look with warm accent colors.
 */

export const DarkColors = {
  // Backgrounds
  background: '#0F0F0F',           // Deep black - main app background
  surface: '#1A1A1A',              // Slightly lighter - cards, drawer
  surfaceElevated: '#262626',      // Elevated surfaces - input fields, buttons
  surfaceHover: '#333333',         // Hover/pressed states

  // Primary accent (keeping warm feel)
  accent: '#F4A460',               // Sandy brown - primary accent
  accentMuted: 'rgba(244, 164, 96, 0.15)', // Muted accent for backgrounds

  // Text colors
  text: '#FFFFFF',                 // Primary text
  textSecondary: '#A0A0A0',        // Secondary/muted text
  textTertiary: '#666666',         // Tertiary/disabled text
  textOnAccent: '#FFFFFF',         // Text on accent color

  // UI elements
  border: '#2A2A2A',               // Subtle borders
  borderLight: '#333333',          // Lighter borders for emphasis
  divider: '#1F1F1F',              // Dividers between sections

  // Message bubbles
  userMessage: '#F4A460',          // User message - accent color
  userMessageText: '#000000',      // Dark text on user message
  assistantMessage: '#1F1F1F',     // Assistant message - subtle dark
  assistantMessageText: '#FFFFFF', // White text on assistant message

  // Semantic colors
  danger: '#FF453A',               // iOS red
  dangerMuted: 'rgba(255, 69, 58, 0.15)',
  success: '#32D74B',              // iOS green
  warning: '#FF9F0A',              // iOS orange

  // Overlays
  overlay: 'rgba(0, 0, 0, 0.5)',   // Modal overlays
  overlayLight: 'rgba(0, 0, 0, 0.3)',
} as const;

export const DarkSpacing = {
  // Border radius
  radiusXs: 8,
  radiusSm: 12,
  radiusMd: 16,
  radiusLg: 20,
  radiusXl: 24,
  radiusFull: 9999,

  // Padding and margins
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,

  // Screen padding
  screenPadding: 16,
  cardPadding: 16,
  sectionSpacing: 24,
  itemSpacing: 12,
} as const;

export const DarkTypography = {
  // Font sizes
  largeTitle: 34,
  title1: 28,
  title2: 22,
  title3: 20,
  headline: 17,
  body: 17,
  callout: 16,
  subheadline: 15,
  footnote: 13,
  caption1: 12,
  caption2: 11,

  // Font weights
  weightRegular: '400' as const,
  weightMedium: '500' as const,
  weightSemibold: '600' as const,
  weightBold: '700' as const,
} as const;

export const DarkShadows = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  small: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  medium: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
} as const;
