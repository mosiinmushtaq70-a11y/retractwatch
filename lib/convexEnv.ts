/** True when Convex client is configured (browser bundle). */
export function hasConvexUrl(): boolean {
  return Boolean(
    typeof process !== "undefined" && process.env.NEXT_PUBLIC_CONVEX_URL,
  );
}
