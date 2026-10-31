# Lucid CMS - Google reCAPTCHA Plugin

> The official Google reCAPTCHA plugin for Lucid

The Lucid CMS Google reCAPTCHA plugin registers a captcha adapter and a widget for the admin. It checks tokens with the reCAPTCHA Enterprise API, which every reCAPTCHA key now uses.

reCAPTCHA sets cookies, so visitors in the EU and UK may need to consent before it loads. If that is a concern, use the Cloudflare Turnstile plugin instead.

## Installation

```bash
npm install @lucidcms/plugin-google-recaptcha
```

## Setup

1. Create a reCAPTCHA key in the Google Cloud console for a website, and add your CMS hostname to its domains.
2. Create an API key in the same project, restricted to the reCAPTCHA Enterprise API.
3. Add the plugin to your Lucid CMS config file.

```typescript
import { defineConfig } from "@lucidcms/core";
import { sqlite } from "@lucidcms/db-sqlite";
import { googleRecaptchaPlugin } from "@lucidcms/plugin-google-recaptcha";
import { node } from "@lucidcms/runtime-node";

export default defineConfig({
  runtime: node,
  db: sqlite,
  config: (env) => ({
    plugins: [
      googleRecaptchaPlugin({
        siteKey: env.RECAPTCHA_SITE_KEY,
        projectId: env.RECAPTCHA_PROJECT_ID,
        apiKey: env.RECAPTCHA_API_KEY,
      }),
    ],
  }),
});
```

## Configuration

| Property       | Type       | Description                                                               |
| -------------- | ---------- | ------------------------------------------------------------------------- |
| `siteKey`      | `string`   | The reCAPTCHA key ID                                                      |
| `projectId`    | `string`   | The Google Cloud project the key belongs to                               |
| `apiKey`       | `string`   | A Google Cloud API key restricted to the reCAPTCHA Enterprise API         |
| `mode`         | `string`   | `"score"` or `"checkbox"`, matching the key's type. Defaults to `"score"` |
| `minScore`     | `number`   | The lowest score that passes. Defaults to `0.5` for score keys            |
| `hostnames`    | `string[]` | Hostnames tokens may come from. Checked when set                          |
| `sendRemoteIp` | `boolean`  | Send the visitor's IP address to Google. Defaults to `false`              |

### mode

Score keys run without a challenge and show a reCAPTCHA badge while a protected form is open. Checkbox keys show the "I'm not a robot" box. Checkbox tokens are only scored when you set `minScore`.

### minScore

Scores run from 0 (likely a bot) to 1. Privacy-focused browsers can score low, so lower `minScore` if real people get blocked.

## Quotas

Google's free tier covers 10,000 assessments a month. Over that, assessments fail, so protected forms are rejected rather than let through. Check your usage in the Google Cloud console.

## Protected forms

Once the plugin is added, login, first-user setup, password reset requests and share-link passwords need a reCAPTCHA token. Signed-in users sending a reset email from their account page skip the check. Choose the forms with `captcha.forms` in your config:

```typescript
config: (env) => ({
  captcha: {
    forms: { resetPassword: true, acceptInvitation: true, sharePassword: false },
  },
  plugins: [googleRecaptchaPlugin({ /* ... */ })],
}),
```

If reCAPTCHA can't be reached, protected forms are rejected rather than let through. To get back in during an outage, set `captcha.forms` to `false` and redeploy. An environment variable makes this a quick change:

```typescript
captcha: { forms: env.CAPTCHA_DISABLED === "true" ? false : undefined },
```

## Your own forms

Check tokens from your own form endpoints with `toolkit.captcha`. Pass the action you used in the browser, which tokens must match. Checkbox widgets post their token as `g-recaptcha-response`. Check it before doing any work.

```typescript
const form = await request.formData();
const captcha = await toolkit.captcha.verify({
  token: form.get("g-recaptcha-response")?.toString(),
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

When your config sets `http.security.headers.contentSecurityPolicy`, the plugin adds `https://www.google.com/recaptcha/` and `https://www.gstatic.com/recaptcha/` to `scriptSrc` (and `scriptSrcElem` when set), `https://www.google.com/recaptcha/` and `https://recaptcha.google.com/recaptcha/` to `frameSrc`, and `https://www.google.com/recaptcha/` to `connectSrc`.
