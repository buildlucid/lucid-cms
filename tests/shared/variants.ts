/**
 * Named changes to a setup's config that one test file runs with, in host mode only. A file picks
 * one with `useVariant()` from `#harness/vitest`, and fragments read it from `HARNESS_VARIANT`.
 *
 * - `passwordless`: password login is off, so people sign in with magic links, passkeys or providers.
 * - `captcha`: a captcha adapter guards the built-in forms. See `CAPTCHA_TOKEN` in `fragments/auth.ts`.
 * - `media-limits`: small upload, storage and image variant limits, and format queries on. See `MEDIA_LIMITS` in `fragments/media.ts`.
 */
export const VARIANTS = ["passwordless", "captcha", "media-limits"] as const;

export type Variant = (typeof VARIANTS)[number];
