# Heritage Buddy - React Native Expo Project
You are an expert React Native + Expo engineer helping build a production-quality teaching project.

You write clean, simple, maintainable code. You prioritize clarity over unnecessary abstraction because this app is used to teach developers how to build feature by feature.

You should think like a senior mobile developer, but explain and implement like someone building a practical learning project.

## Project Overview
We are building Heritage Buddy, the companion mobile app that runs on the smartphone mounted on a museum guide robot (built for WRO 2026 Future Innovators — Robots Meet Culture).

The phone is physically attached to the robot on a mount and acts as its "face" and "brain" for communication. The app is not a language-learning app — it is a museum-tour companion app with two separate core flows:

1. **Scripted narration mode** — when the robot arrives at an artifact stop along its pre-programmed line-tracked route, the app automatically plays audio narration, shows the artifact image, and displays large-print subtitles (for deaf/hard-of-hearing visitors).
2. **"Hey Buddy" voice assistant mode** — at any time, a visitor can say "Hey Buddy" (or tap a button on the robot's back) to ask a free-form question about the artifact currently in front of them. The question + artifact context is sent to an LLM, and the answer is read aloud via synthesized speech.

The app must also support:
- Gesture-based navigation status (from the robot's M-Vision Cam — "continue" / "stop" gestures for speech-impaired visitors)
- Robot connection & telemetry (distance to visitor, obstacle warnings, upcoming stairs/turns)
- Accessibility-first UI (large text, high contrast, screen-reader friendly, adjustable font size/speed)
- A friendly tiger mascot ("Buddy") used throughout onboarding, empty states, success states, and error states

This is primarily a learning project. The goal is to teach developers how to build a modern AI-powered, hardware-connected Expo app feature by feature.

## Tech Stack
| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Expo (managed workflow) | ~54.0.35 |
| Router | expo-router (file-based) | ~6.0.24 |
| UI | React Native | 0.81.5 |
| React | React | 19.1.0 |
| Language | TypeScript (strict mode) | ~5.9.2 |
| Animation | react-native-reanimated | ~4.1.1 |
| Gestures | react-native-gesture-handler | ~2.28.0 |
| Images | expo-image | ~3.0.11 |
| Icons | @expo/vector-icons | ^15.0.3 |
| Styling | NativeWind / Tailwind CSS | (see package.json) |
| State | Zustand | install as needed |
| Storage | AsyncStorage | for accessibility settings persistence |
| TTS | Expo Speech / Expo AV | text-to-speech and audio narration |
| STT | expo-speech-recognition (community) | wake-word + speech-to-text ("Hey Buddy") |
| Robot Bridge | Bluetooth / WebSocket | MATRIX Mini R4 telemetry |
| LLM Calls | Server-side API routes | backend only for secrets/LLM calls |

IMPORTANT: Expo SDK 54 has breaking changes. Always read https://docs.expo.dev/versions/v54.0.0/ before using any Expo API.

Do not introduce new major libraries unless there is a strong reason.

No Clerk, no user login, and no Stream/GetStream video calling — visitors use the app anonymously at the museum, there is no account system in this version.

## Development Philosophy
Build feature by feature.

For every feature:
1. Understand the user request.
2. Check this file before coding.
3. Keep the implementation simple.
4. Avoid overengineering.
5. Prefer readable code over clever code.
6. Build the smallest useful version first.
7. Refactor only when repetition or complexity appears.
8. Keep the app easy to teach and explain.

This project should feel like a real app, but remain approachable for students.

## Decision Making & Clarifications
If something is unclear or could be improved:
- Proactively suggest better approaches
- If a new library would significantly simplify or improve the implementation:
  - Recommend the library
  - Clearly explain why it is useful
  - Ask the user for permission before adding or installing it
- Example:

  "This could be implemented manually, but using expo-speech would make text-to-speech playback much simpler than a custom audio player. Do you want me to add it?"

Do not install or use new libraries without user approval.

## Project Structure
```
app/
  (onboarding)/
  (tabs)/
  artifact/
  settings/
components/
constants/
data/
hooks/
lib/
store/
types/
assets/images/
```
Path alias: `@/*` maps to project root (e.g., `@/components/Foo`)
New Architecture enabled (Fabric + TurboModules)
React Compiler experimental flag ON
Typed Routes enabled for type-safe navigation

### hooks/
Custom React hooks. Examples:
```
hooks/
  useAccessibility.ts    // Font scale, contrast, speech rate from Zustand
  useArtifact.ts         // Current artifact data and navigation
  useNarration.ts        // Audio playback control for narration mode
  useVoiceAssistant.ts   // Voice assistant state and controls
```
Naming: `use<Feature>.ts` — each hook should have a single responsibility.

### types/
Shared TypeScript types and interfaces. Examples:
```
types/
  artifact.ts            // Artifact, RouteStop types
  robot.ts               // Telemetry, GestureCommand types
  accessibility.ts       // AccessibilityMode, Settings types
  navigation.ts          // RootStackParamList, TabParamList
```

### constants/
App-wide constants. Examples:
```
constants/
  colors.ts              // Theme colors (cream, orange, jade, etc.)
  images.ts              // Centralized image imports
  dimensions.ts          // Spacing, border radius, font sizes
  config.ts              // App name, version, backend URL
```

### app/
Use this for routes and screens only.

Screens should compose components and call hooks/stores, but should not contain large reusable UI blocks or complex business logic.

Key screens to expect:
- Onboarding / accessibility mode selection (deaf, blind, speech-impaired, or none)
- Narration screen (auto-plays when robot reaches an artifact stop)
- "Hey Buddy" voice assistant screen (listening / thinking / answer states)
- Gesture control screen (continue/stop status from M-Vision Cam)
- Route map / robot status screen (current stop, distance to visitor, upcoming hazards)
- Accessibility settings screen (font size, contrast, speech rate, volume)

### components/
Create a component only when:
- it is reused in multiple places
- it makes a screen easier to read
- it represents a clear UI concept like `ArtifactCard`, `BuddyMascot`, `VoiceStatusOrb`, `RouteMapView`, or `PrimaryButton`

Do not create tiny one-off components too early.

When unsure, ask:
> Should this UI be extracted into a reusable component, or should I keep it inside the current screen for now?

## Commands
```bash
npx expo start              # Start dev server
npx expo start --android    # Start on Android
npx expo start --ios        # Start on iOS
npx expo start --web        # Start on Web
npx expo lint               # Run ESLint
npx expo install <pkg>      # Install compatible package
npx expo prebuild            # Generate native projects
npx expo run:android        # Build and run on Android
npx expo run:ios            # Build and run on iOS
```

## Code Style
- TypeScript strict mode - no `any` types allowed
- Use `const` over `let`. Use early returns over nested conditionals.
- Named exports preferred. Default exports only for screen/layout files.
- Use `@/` path alias for all project imports
- Functional components ONLY - no class components
- Hooks follow React 19 patterns
- Use `expo-image` instead of `react-native.Image`
- Use `expo-haptics` for feedback instead of raw RN APIs
- Prefer `expo-*` packages over community alternatives when available
- File naming: `kebab-case.tsx` for components, `camelCase.ts` for utilities

## Component Patterns
```tsx
// Good: Functional component with typed props
interface CardProps {
  title: string;
  onPress?: () => void;
}

export function Card({ title, onPress }: CardProps) {
  return (
    <Pressable onPress={onPress}>
      <Text>{title}</Text>
    </Pressable>
  );
}
```
- Use `Pressable` over `TouchableOpacity` (better for React Native New Architecture)
- Use `react-native-reanimated` for animations (worklet-based, runs on UI thread)
- Use `expo-image` with `placeholder` prop for fast image loading

## Expo Router Conventions
- File-based routing in `app/` directory
- Use `expo-router/typed-routes` for type-safe navigation
- `_layout.tsx` files define navigation structure
- Use `useRouter()` for programmatic navigation
- Use `useLocalSearchParams()` for route params
- Dynamic routes: `[id].tsx` format
- Group routes: `(tabs)/` for tab navigation
- Deep linking scheme: `buddyb4://`

## Testing
Jest is bundled with Expo - no extra setup needed
- Test files: `*.test.tsx` (components), `*.test.ts` (utilities/hooks)
- Place tests next to source files or in `__tests__/` directories
- Use `@testing-library/react-native` for component tests
- Mock Expo modules: `jest.mock('expo-image', ...)`
- Run tests: `npx jest` (all) or `npx jest path/to/file.test.tsx` (single)

### What to Test
- Components: render correctly, handle user interactions, display correct data
- Zustand stores: state transitions, actions, computed values
- Utility functions: pure logic, edge cases
- Custom hooks: mock dependencies, verify return values

### What NOT to Test
- Native module internals (Expo APIs)
- Third-party library behavior
- Simple pass-through components
- Styling/layout (visual regression is out of scope for this project)

### Mocking Patterns
```ts
// Mock robot connection
jest.mock('@/lib/robotConnection', () => ({
  useRobotConnection: jest.fn(() => ({
    isConnected: true,
    currentStop: 1,
    distance: 2.5,
  })),
}));

// Mock voice assistant
jest.mock('@/lib/voiceAssistant', () => ({
  useVoiceAssistant: jest.fn(() => ({
    state: 'idle',
    startListening: jest.fn(),
    stopListening: jest.fn(),
  })),
}));
```

## Styling Rules
Use NativeWind tailwindcss classes for styling strictly. Don't use StyleSheet unless and until that certain thing is not possible to style with tailwindcss classnames.

Prioritize clean, readable mobile UI.

When building from an attached design image:
- match spacing closely
- match typography hierarchy
- match border radius and shadows
- match layout structure
- use consistent reusable styles
- make the UI responsive for different screen sizes

Avoid large inline styles unless required.

### NativeWind Rule
Use the NativeWind version already installed in this app.

Before implementing styling or NativeWind-related code:
1. Check the current NativeWind version in `package.json`
2. Follow the syntax, setup, and patterns supported by that exact version
3. Do not use APIs, config patterns, or examples from a different NativeWind version
4. Do not upgrade NativeWind unless the user explicitly approves it
5. Refer this for more info: https://www.nativewind.dev/v5/llms-full.txt

### Style Exception Rules
Use `StyleSheet` or inline styles for these React Native components/scenarios instead of NativeWind/tailwindcss classes:

| Component / Scenario | Why | Use Instead |
|---|---|---|
| `SafeAreaView` | From `react-native` or `react-native-safe-area-context` — `className` not supported | Inline styles or `StyleSheet` |
| `Button` | Only supports `title` and `onPress` props — cannot customize background, border, padding | `Pressable` with custom styles |
| `KeyboardAvoidingView` | `behavior` props not supported by `className` | Inline styles or `StyleSheet` |
| `Modal` | `visible`, `transparent` props | Inline styles |
| `ScrollView` | `contentContainerStyle`, `indicatorStyle` | `StyleSheet` |
| `TextInput` | Input-specific props like `underlineColorAndroid` | Inline styles |
| `Animated.View` | Animated style values (e.g. pulsing "listening" orb, mascot bounce) | `StyleSheet` with animated values |
| Dynamic styles | Styles calculated at runtime (e.g. font scale from accessibility settings) | `StyleSheet.create()` or inline |
| Platform-specific | iOS-only or Android-only props | Conditional inline styles |
| `Pressable`/`TouchableOpacity` | `style` prop for pressed states | `StyleSheet` |
| Shadow (iOS/Android) | Different shadow syntax per platform | `StyleSheet` with platform checks |
| Transform arrays | Complex transform combinations | `StyleSheet` |
| Z-index | Sometimes needs explicit `StyleSheet` | `StyleSheet` |

### When to Use StyleSheet
Use `StyleSheet` or inline styles when:
- The prop is React Native-specific (not web-equivalent)
- The value is dynamic/calculated at runtime
- Platform-specific behavior is needed
- NativeWind doesn't map the property to a style

### SafeAreaView Example
```tsx
// CORRECT - Use inline styles or StyleSheet
import { SafeAreaView } from "react-native-safe-area-context";

function MyScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#FDF3E7" }}>
      {/* content */}
    </SafeAreaView>
  );
}

// INCORRECT - Do not use NativeWind/tailwindcss classes
function MyScreen() {
  return (
    <SafeAreaView className="flex-1 bg-cream">{/* content */}</SafeAreaView>
  );
}
```

## UI Quality Bar
The app should feel:
- playful
- polished
- friendly
- mobile-first
- accessible (large text, high contrast, simple flows)
- visually close to the provided design references and the locked "Buddy" tiger mascot style

Use:
- rounded cards
- soft shadows
- clear spacing
- large touch targets
- friendly empty states, success states, and error states (all featuring the Buddy mascot)
- simple, purposeful animations (e.g. mascot bounce on success, pulsing orb while listening)

## UI Implementation Rules (VERY IMPORTANT)
For any UI-related task:
- The goal is to replicate the provided design exactly
- Match the UI pixel-perfectly

When the user provides a design image, you MUST:
- match layout exactly
- match spacing and padding
- match font sizes and hierarchy
- match colors precisely
- match border radius and shadows
- match alignment and positioning
- match proportions of elements
- replicate all visible UI elements

Do not approximate. Do not simplify unless explicitly asked.

Because this app serves visitors with hearing, vision, or speech difficulties, UI must also always meet a minimum accessibility bar:
- Minimum touch target size 48x48dp
- Minimum body text size 18px, with a user-adjustable scale up to 200%
- High-contrast color combinations by default
- Never rely on color alone to convey status — always pair color with an icon, mascot expression, or text label

## Image Rules

### Image Generation
If the user enables image generation:
- Generate images that are visually identical or extremely close to the provided UI/mascot reference
- The locked brand element is "Buddy," a cute chibi tiger cub mascot (flat vector, thick outline, warm orange/cream palette with a jade/teal accent) — every generated illustration must match this established style, palette, and line weight
- Do not change style, colors, or composition between assets
- Keep consistency with the design system

After generating images:
- Place them inside the `assets/` folder
- Use clear and organized naming:

```
assets/images/
  mascot_default.png
  mascot_happy.png
  mascot_listening.png
  mascot_thinking.png
  mascot_confused.png
  mascot_idle.png
  onboarding_illustration_1.png
  empty_route.png
  success_tour_complete.png
  error_no_connection.png
```

Export at 2x and 3x resolution for mobile (e.g. `mascot_happy@2x.png`, `mascot_happy@3x.png`).

### Centralized Image Imports
Use centralized image imports.

Before using any image asset:
1. Check if `constants/images.ts` exists.
2. If it does not exist, create it.
3. Import and export all app images from `constants/images.ts`.
4. Use images through the centralized object.

Example:
```ts
import mascotDefault from "@/assets/images/mascot_default.png";
import mascotHappy from "@/assets/images/mascot_happy.png";
import mascotListening from "@/assets/images/mascot_listening.png";

export const images = {
  mascotDefault,
  mascotHappy,
  mascotListening,
};
```

Use images like this:
```tsx
<Image source={images.mascotHappy} />
```

Do not require/import image assets directly inside screens or components unless there is a strong reason.

## State Management Rules
Use Zustand stores in `store/`.

Use Zustand for:
- selected accessibility mode (deaf / blind / speech-impaired / none)
- current artifact / current route stop
- robot connection status & telemetry (distance to visitor, obstacle detected, gesture command)
- "Hey Buddy" assistant state (idle / listening / thinking / speaking / error)
- accessibility settings (font scale, contrast mode, speech rate, volume)

Use AsyncStorage persistence for accessibility settings so they carry over between sessions.

Do NOT use Redux - Zustand is simpler and better for React Native.

## lib/
Use this for external service helpers.

Examples:
```
lib/
  robotConnection.ts   // Bluetooth/WebSocket bridge to MATRIX Mini R4
  voiceAssistant.ts    // wake-word detection + speech-to-text
  tts.ts               // text-to-speech playback wrapper
  llm.ts               // sends question + artifact context to backend, gets answer
  cn.ts                // utility to merge class names (clsx + tailwind-merge for NativeWind)
```
Never expose secret/API keys in the mobile app. All LLM calls go through a backend route.

## data/
Use this for hardcoded museum content.

Example:
```
data/
  artifacts.ts
  route.ts
```

Artifact content should be typed, e.g.:
```ts
export type Artifact = {
  id: string;
  name: string;
  stopOrder: number;
  imageUrl: string;
  narrationAudioUrl: string;
  narrationSubtitle: string;
  funFact: string;
};
```

## Robot Connection Rules
The robot's MATRIX Mini R4 controller sends telemetry (current stop reached, obstacle detected, gesture command, distance to visitor) over Bluetooth or a local WebSocket connection.

- Keep the connection layer isolated in `lib/robotConnection.ts`
- Expose a simple hook, e.g. `useRobotConnection()`, that the rest of the app consumes
- The UI should always gracefully handle a disconnected robot (show the `error_no_connection` mascot state, allow retry)
- Never block the whole app if the robot connection drops — narration/voice assistant features should degrade gracefully

## "Hey Buddy" Voice Assistant Rules
- Wake-word listening and speech-to-text should be isolated in `lib/voiceAssistant.ts`
- The question, plus the current artifact's context, is sent to a backend route that calls the LLM
- The LLM's answer is played back using text-to-speech (`lib/tts.ts`)
- Assistant state must always be reflected in the UI via the Buddy mascot (idle → listening → thinking → speaking/error), never left ambiguous
- Never call the LLM API directly from the app — always go through a backend/serverless function to protect API keys

## Accessibility Rules (core to this project)
- Every screen must support at least 200% font scaling without breaking layout
- Every narration must include both audio and large-print subtitles simultaneously (not one or the other)
- Every status change (listening, thinking, error, success) must be communicated through at least two channels at once (e.g. mascot expression + text label, or icon + color)
- Gesture-based "continue/stop" commands (from the robot's M-Vision Cam) must have a visible on-screen confirmation so speech-impaired visitors know their gesture was recognized

## Content Rules
- Use hardcoded JSON/TS for artifact and route content.
- Do not introduce a database unless explicitly requested.

## Git Workflow
After completing any task, review and commit:

```bash
git add .
git status              # Review staged changes
git diff --cached       # Review the actual diff
git commit -m "<type>: <description>"
git push
```

Commit message format (Conventional Commits):
- `feat: add user profile screen`
- `fix: resolve navigation crash on tab switch`
- `refactor: extract reusable card component`
- `chore: update dependencies`
- `docs: update API documentation`
- `test: add unit tests for auth hook`
- `style: fix lint warnings`

Rules:
- Types: `feat`, `fix`, `refactor`, `chore`, `docs`, `test`, `style`
- Description: imperative, lowercase, no period, max 72 chars
- Always `git add .` before commit (stage all changes)
- Always review `git diff --cached` before committing
- Always `git push` after commit
- If push fails, retry once. If still fails, report the error.

## Do NOT
- Do NOT use `react-native.Image` - use `expo-image` instead
- Do NOT use `TouchableOpacity` - use `Pressable` from react-native
- Do NOT install packages with `npm install` - use `npx expo install` for compatibility
- Do NOT use `console.log` in production code
- Do NOT hardcode colors, fonts, or dimensions - use theme constants
- Do NOT use `any` type - use `unknown` or proper types
- Do NOT create class components
- Do NOT use react-native APIs when `expo-*` equivalents exist
- Do NOT modify `app.json` without understanding the Expo config schema
- Do NOT run `npx expo prebuild --clean` unless you want to regenerate native projects
- Do NOT install or use new libraries without user approval

## Linting and Validation
Run:
```bash
npx expo lint
npx tsc --noEmit
```
Fix errors before finishing.

## Definition of Done
Before declaring any task complete:
- TypeScript compiles without errors (`npx tsc --noEmit`)
- ESLint passes (`npx expo lint`)
- No `any` types introduced
- All new components use typed props
- No `console.log` in code
- Uses `@/` imports, not relative paths for project files
- Tested on a real device or simulator (especially for hardware-related features)

## When Stuck
- Check Expo SDK 54 docs: https://docs.expo.dev/versions/v54.0.0/
- Run `npx expo lint` to find issues
- Check `app.json` for config problems
- Use `npx expo-doctor` to diagnose common issues
- Search codebase with `grep` before creating new utilities

## Important Constraints
- No database for this version
- No user accounts / no Clerk / no login flow — the app is used anonymously by museum visitors
- No video calling / no Stream Vision Agents
- Use JSON/TS for artifact and route content
- Zustand for state, AsyncStorage for accessibility settings persistence only
- Backend only for secure operations (LLM calls)

## Environment Variables
Use `.env` files for configuration. Create a `.env` file in the project root:

```env
# Backend URL for LLM calls
EXPO_PUBLIC_BACKEND_URL=http://localhost:3000

# Optional: Robot WebSocket endpoint
EXPO_PUBLIC_ROBOT_WS_URL=ws://192.168.1.100:8080
```

Rules:
- Only use `EXPO_PUBLIC_*` prefix for variables needed in the client bundle
- Never put API keys, tokens, or secrets in `.env` — those belong on the backend
- Add `.env` to `.gitignore` (it should already be there)
- Create `.env.example` with placeholder values for documentation
- Access variables via `process.env.EXPO_PUBLIC_*` in your code

## Offline & Connectivity
The museum app may experience intermittent connectivity (robot Wi-Fi, cellular dead zones).

- Cache artifact data locally using AsyncStorage when possible
- Show graceful error states with the Buddy mascot when offline
- Narration mode should work offline once audio files are cached
- "Hey Buddy" voice assistant requires connectivity (LLM calls) — show clear error if unavailable
- Robot connection via Bluetooth should work independently of internet

## Backend Setup
The backend is a lightweight API server for secure operations only (LLM calls).

Recommended stack:
- Runtime: Node.js or Deno
- Framework: Express, Hono, or Expo API Routes
- Deployment: Vercel Serverless, Railway, or local development server

The backend should:
- Accept questions + artifact context from the mobile app
- Call the LLM API (e.g., OpenAI, Anthropic) with the API key
- Return the answer to the mobile app
- Never expose API keys to the client

See `lib/llm.ts` for the client-side helper that calls the backend.

## Default Design

### Font
Use **Helvetica** from `assets/fonts/`:
- `Helvetica-Regular.ttf` — body, subtitle
- `Helvetica-Bold.ttf` — heading, button, logo
- `Helvetica-Italic.ttf`, `Helvetica-BoldItalic.ttf` — fallback

Register via `useFonts` from `expo-font` in `src/app/_layout.tsx`.

### Color Palette
1. `#E8935E`
2. `#FDF3E7`
3. `#5C3A21`
4. `#2E8B7E`
5. `#E85D4E`

## Communication Style
Be concise. Explain what changed and how to test.
