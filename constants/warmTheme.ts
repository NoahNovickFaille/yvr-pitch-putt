/**
 * Warm Design System
 *
 * Inspired by "How We Feel" app aesthetic - cozy, inviting colors
 * for emotional companion experience.
 */

export const WarmColors = {
  // Backgrounds
  background: '#FFF9F0',        // Warm cream - main app background
  cardBackground: '#FFFBF5',    // Lighter cream - cards and surfaces

  // Primary brand colors
  primary: '#F4A460',           // Sandy brown - primary accent
  primaryDark: '#E89451',       // Darker sandy brown - pressed states

  // Text colors
  text: '#4A3F35',              // Warm dark brown - primary text
  textSecondary: '#8B7E74',     // Muted brown - secondary text

  // UI elements
  border: '#E8DFD6',            // Soft warm border
  shadow: 'rgba(139, 126, 116, 0.1)', // Subtle warm shadow

  // Message bubbles
  userMessage: '#F4A460',       // Sandy brown - user messages
  assistantMessage: '#FFEFD5',  // Papaya whip - assistant messages

  // Semantic colors
  danger: '#D94A3D',            // Warm red for delete actions
  dangerLight: '#FFE5E2',       // Light red background for danger states
  success: '#7CAA67',           // Warm green
  warning: '#E89451',           // Warm orange
} as const;

export const WarmSpacing = {
  // Border radius
  cardRadius: 24,
  buttonRadius: 20,
  bubbleRadius: 18,
  smallRadius: 12,

  // Padding and margins
  screenPadding: 16,
  cardPadding: 16,
  sectionSpacing: 24,
  itemSpacing: 12,
} as const;

export const WarmTypography = {
  // Font families (SF Rounded is default on iOS)
  rounded: 'System',  // iOS will use SF Rounded

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
} as const;

export const WarmShadows = {
  small: {
    shadowColor: WarmColors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 2,
  },
  medium: {
    shadowColor: WarmColors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 4,
  },
  large: {
    shadowColor: WarmColors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 8,
  },
} as const;
