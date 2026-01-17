# Expo Template Components

Reusable UI components from the Expo template. These provide themed, accessible building blocks.

## Components

- **ExternalLink** - Pressable link that opens URLs in system browser
- **HapticTab** - Tab button with haptic feedback on press
- **HelloWave** - Animated waving hand emoji (example component)
- **ParallaxScrollView** - Scroll view with parallax header effect
- **ThemedText** - Text component that adapts to light/dark theme
- **ThemedView** - View component with theme-aware background colors
- **ui/** - Additional UI primitives

## Usage Patterns

All themed components use the color scheme from `constants/theme.ts`:
- Automatically switch between light/dark mode
- Use semantic color names (text, background, tint, etc.)
- Hook into `useColorScheme()` and `useThemeColor()`

## When to Use

Use these for general UI elements. For chat-specific components, see `src/components/`.
