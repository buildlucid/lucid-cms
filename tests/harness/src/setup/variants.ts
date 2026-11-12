/**
 * Named changes to a setup's config that one test file runs with, in host mode only. A file picks
 * one with `useVariant()` from `#harness/vitest`, the harness passes it as `HARNESS_VARIANT`, and
 * the fragments in `shared/config/fragments` make the change.
 *
 * - `passwordless`: password login is off, so people sign in with magic links, passkeys or providers.
 *   The admin signs in with a magic link, so the setup needs `harness:outbox`.
 * - `captcha`: a captcha adapter guards the built-in forms, and only `CAPTCHA_TOKEN` passes it.
 * - `media-limits`: small upload, storage and image variant limits, and format queries on. See `MEDIA_LIMITS` in `fragments/media.ts`.
 */
export const VARIANTS = ["passwordless", "captcha", "media-limits"] as const;

export type Variant = (typeof VARIANTS)[number];
