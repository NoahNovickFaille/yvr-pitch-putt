/**
 * Dark Theme Design System
 *
 * Warm, accessible dark theme optimized for emotional companion UX.
 * Softer background reduces eye strain; honey-gold accent evokes warmth and comfort.
 *
 * Color Research:
 * - Background: Soft charcoal (#181818) vs pure black prevents halation effect
 * - Accent: Honey-gold (#E8A854) evokes warmth, comfort, optimism
 * - Danger: Coral-red (#E07B6E) feels caring rather than alarming
 * - Text: Off-white (#F5F5F5) reduces harsh contrast while maintaining readability
 */

export const DarkColors = {
  // Backgrounds - soft charcoal, not pure black (prevents eye strain & halation)
  background: '#181818',           // Soft charcoal - warm, easy on eyes
  surface: '#222222',              // Elevated surface - cards, drawer
  surfaceElevated: '#2A2A2A',      // Higher elevation - input fields, buttons
  surfaceHover: '#363636',         // Hover/pressed states

  // Primary accent - warm honey-gold (evokes comfort, warmth, optimism)
  accent: '#E8A854',               // Honey-gold - rich, warm primary accent
  accentMuted: 'rgba(232, 168, 84, 0.15)', // Muted accent for backgrounds

  // Text colors - off-white for comfortable reading (not harsh pure white)
  text: '#F5F5F5',                 // Primary text - soft white
  textSecondary: '#A8A8A8',        // Secondary/muted text
  textTertiary: '#707070',         // Tertiary/disabled text
  textOnAccent: '#1A1A1A',         // Dark text on accent for contrast

  // UI elements
  border: '#2E2E2E',               // Subtle borders
  borderLight: '#3A3A3A',          // Lighter borders for emphasis
  divider: '#252525',              // Dividers between sections

  // Message bubbles
  userMessage: '#E8A854',          // User message - warm honey-gold
  userMessageText: '#1A1A1A',      // Dark text on user message for readability
  assistantMessage: '#252525',     // Assistant message - slightly elevated
  assistantMessageText: '#F0F0F0', // Soft white text on assistant message

  // Semantic colors - warmer variants that feel caring, not alarming
  danger: '#E07B6E',               // Warm coral-red - friendly but clear
  dangerMuted: 'rgba(224, 123, 110, 0.15)',
  dangerBright: '#DC2626',         // Bright red - for crisis/emergency only
  success: '#6BBF7A',              // Warm green - softer than iOS green
  successMuted: 'rgba(107, 191, 122, 0.08)',   // Success background tint
  successBorder: 'rgba(107, 191, 122, 0.2)',   // Success border
  successContainer: 'rgba(107, 191, 122, 0.15)', // Success icon container
  warning: '#E8A854',              // Use accent as warning (warm amber)

  // Overlays
  overlay: 'rgba(0, 0, 0, 0.6)',   // Modal overlays - slightly stronger
  overlayLight: 'rgba(0, 0, 0, 0.4)',
  overlayHeavy: 'rgba(0, 0, 0, 0.7)', // Heavy overlay for crisis modal

  // Light modal colors (for high-visibility modals like crisis resources)
  modalBackground: '#FFFFFF',      // White modal background
  modalText: '#1C1C1E',            // Primary dark text on light modal
  modalTextSecondary: '#3C3C43',   // Secondary text on light modal
  modalTextTertiary: '#8E8E93',    // Tertiary/muted text on light modal
  modalSurface: '#F2F2F7',         // Light surface for buttons on modal
  textOnDangerBright: 'rgba(255, 255, 255, 0.9)', // Semi-transparent white on bright danger
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
