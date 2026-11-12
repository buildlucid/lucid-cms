/**
 * The header the harness's client sends each session's client address in. Every setup's config
 * trusts it as its proxy header, so each test session has its own rate limits.
 */
export const CLIENT_ADDRESS_HEADER = "x-harness-client-address";

/** The only token the `captcha` variant's adapter accepts, which `login` sends when asked. */
export const CAPTCHA_TOKEN = "harness-captcha-pass";
