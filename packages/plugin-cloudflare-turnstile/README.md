# Lucid CMS - Cloudflare Turnstile Plugin

> The official Cloudflare Turnstile plugin for Lucid

The Lucid CMS Cloudflare Turnstile plugin registers a captcha adapter and a widget for the admin. Turnstile is free and rarely asks people to solve a puzzle, so it is the captcha we recommend.

## Installation

```bash
npm install @lucidcms/plugin-cloudflare-turnstile
```

## Setup

Create a widget in the Cloudflare dashboard under Turnstile, add your CMS hostname to it, then add the plugin to your Lucid CMS config file with the widget's site key and secret key.

```typescript
import { defineConfig } from "@lucidcms/core";
import { sqlite } from "@lucidcms/db-sqlite";
import { cloudflareTurnstilePlugin } from "@lucidcms/plugin-cloudflare-turnstile";
import { node } from "@lucidcms/runtime-node";

export default defineConfig({
  runtime: node,
  db: sqlite,
  config: (env) => ({
    plugins: [
      cloudflareTurnstilePlugin({
        siteKey: env.TURNSTILE_SITE_KEY,
        secretKey: env.TURNSTILE_SECRET_KEY,
      }),
    ],
  }),
});
```

For local development, use Cloudflare's [testing keys](https://developers.cloudflare.com/turnstile/troubleshooting/testing/), such as the site key `1x00000000000000000000AA` and secret key `1x0000000000000000000000000000000AA`, which pass every check.

## Configuration

| Property       | Type       | Description                                                             |
| -------------- | ---------- | ----------------------------------------------------------------------- |
| `siteKey`      | `string`   | The widget's site key                                                   |
| `secretKey`    | `string`   | The widget's secret key                                                 |
| `hostnames`    | `string[]` | Hostnames tokens may come from. Checked when set                        |
| `size`         | `string`   | `"normal"`, `"compact"` or `"flexible"`. Defaults to `"flexible"`       |
| `appearance`   | `string`   | `"always"`, `"execute"` or `"interaction-only"`. Defaults to `"always"` |
| `sendRemoteIp` | `boolean`  | Send the visitor's IP address to Cloudflare. Defaults to `false`        |

## Protected forms

Once the plugin is added, login, first-user setup, password reset requests and share-link passwords need a Turnstile token. Signed-in users sending a reset email from their account page skip the check. Choose the forms with `captcha.forms` in your config:

```typescript
config: (env) => ({
  captcha: {
    forms: { resetPassword: true, acceptInvitation: true, sharePassword: false },
  },
  plugins: [cloudflareTurnstilePlugin({ /* ... */ })],
}),
```

If Turnstile can't be reached, protected forms are rejected rather than let through. To get back in during an outage, set `captcha.forms` to `false` and redeploy. An environment variable makes this a quick change:

```typescript
captcha: { forms: env.CAPTCHA_DISABLED === "true" ? false : undefined },
```

## Your own forms

Check tokens from your own form endpoints with `toolkit.captcha`. Give the widget an action with `data-action`, which tokens must match. The widget posts its token as `cf-turnstile-response`. Check it before doing any work.

```typescript
const form = await request.formData();
const captcha = await toolkit.captcha.verify({
  token: form.get("cf-turnstile-response")?.toString(),
  action: "contact",
});
if (captcha.error) {
  return new Response("Verification failed", {
    status: captcha.error.status ?? 400,
  });
}
```

`toolkit.captcha.getSettings()` returns the site key for rendering the widget.

## Content Security Policy

When your config sets `http.security.headers.contentSecurityPolicy`, the plugin adds `https://challenges.cloudflare.com` to `scriptSrc` (and `scriptSrcElem` when set) and `frameSrc`.
