/**
 * Analytics and error tracking stubs.
 *
 * For production:
 *   - Sentry:   npx expo install @sentry/react-native  → add '@sentry/react-native' to app.json plugins
 *   - PostHog:  npm install posthog-react-native        → wrap root layout in <PostHogProvider>
 *
 * Both are stubbed here to keep dev bundling clean on Windows.
 */

export async function initAnalytics(): Promise<void> {
  // No-op in development. Enable Sentry/PostHog per the instructions above.
}

export function captureEvent(_event: string, _props?: Record<string, string | number | boolean>): void {
  // No-op until analytics SDK is installed.
}



