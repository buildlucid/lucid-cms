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

This plugin offers the following configuration options to control email sending behavior.

| Property | Type | Description |
|----------|------|-------------|
| `from` | `object` | The default sender information for emails |
| `apiKey` | `string` | Your Resend API key |
| `simulate` | `boolean` | If true, the email will not send, but still register as a success |
| `webhook` | `object` | Configure the Resend webhook |

### from

The `from` object contains the default sender information that will be used for all emails sent through this plugin.

| Property | Type | Description |
|----------|------|-------------|
| `email` | `string` | The email address that emails will be sent from |
| `name` | `string` | The display name that will appear as the sender |

### apiKey

Your Resend API key, which you can obtain from your Resend dashboard. It's recommended to store this as an environment variable for security.

### simulate

When this is set to true, no emails will be sent out, however the strategy will still return as if it was a success.

### webhook

The `webhook` object contains the options needed to enable the webhook endpoint. This is used so that Resend can send delivery status updates back to Lucid CMS allowing you to see it on the emails page instead of having to navigate to Resends own dashboard.

| Property | Type | Description |
|----------|------|-------------|
| `enabled` | `boolean` | Determines if the webhook route should be registered or not |
| `secret` | `string` | Your webhooks signing secret |

This listens to the following event types:

- email.bounced
- email.clicked
- email.complained
- email.delivered
- email.delivery_delayed
- email.failed
- email.opened
- email.scheduled
- email.sent

The webhook route is registered at `/api/v1/resend/webhook`.