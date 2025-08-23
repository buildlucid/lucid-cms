# Lucid CMS - Resend Plugin

> The official Resend plugin for Lucid

The Lucid CMS Resend plugin registers the email strategy config and uses Resend's REST API to send emails. This plugin is perfect for serverless environments such as Cloudflare Workers.

## Installation

```bash
npm install @lucidcms/plugin-resend
```

## Setup

To use the Resend plugin, you need to add it to your Lucid CMS config file. You'll need to provide the from email configuration and your Resend API key.

```typescript
import { nodeAdapter, defineConfig } from "@lucidcms/node-adapter";
import LucidResend from "@lucidcms/plugin-resend";

export const adapter = nodeAdapter();

export default defineConfig((env) => ({
    // ...other config
    plugins: [
        LucidResend({
            from: {
                email: "team@lucidjs.build",
                name: "Lucid CMS",
            },
            apiKey: env.RESEND_API_KEY,
        }),
    ],
}));
```

## Configuration

This plugin offers the following configuration options to control email sending behaviour.

| Property | Type | Description |
|----------|------|-------------|
| `from` | `object` | The default sender information for emails |
| `apiKey` | `string` | Your Resend API key |

### from

The `from` object contains the default sender information that will be used for all emails sent through this plugin.

| Property | Type | Description |
|----------|------|-------------|
| `email` | `string` | The email address that emails will be sent from |
| `name` | `string` | The display name that will appear as the sender |

### apiKey

Your Resend API key, which you can obtain from your Resend dashboard. It's recommended to store this as an environment variable for security.