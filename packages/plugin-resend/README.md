# Lucid - Resend Plugin

> The official Resend plugin for Lucid

This plugin registers the required email strategy config and uses Resend's REST API to send emails. Perfect for serverless environments like Cloudflare Workers.

## Installation

```bash
npm install @lucidcms/plugin-resend
```

## Usage

```typescript
import LucidResend from "@lucidcms/plugin-resend";

export default lucid.config({
  // ...other config
  plugins: [
    LucidResend({
      from: {
        email: "admin@lucidcms.io",
        name: "Lucid CMS",
      },
      apiKey: process.env.RESEND_API_KEY,
    }),
  ],
});
```