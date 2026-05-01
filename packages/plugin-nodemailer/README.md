# Lucid CMS - Nodemailer Plugin

> The official Nodemailer plugin for Lucid

The Lucid CMS Nodemailer plugin registers the email strategy config and uses Nodemailer to send emails. This plugin is ideal if you want to use your own SMTP server or email service provider that's compatible with Nodemailer.

## Installation

```bash
npm install @lucidcms/plugin-nodemailer
```

## Setup

To use the Nodemailer plugin, you need to add it to your Lucid CMS config file. You'll need to provide the from email configuration and a Nodemailer transporter instance.

```typescript
import { nodeAdapter, defineConfig } from "@lucidcms/node-adapter";
import LucidNodemailer from "@lucidcms/plugin-nodemailer";

export const adapter = nodeAdapter();

export default defineConfig((env) => ({
    // ...other config
    plugins: [
        LucidNodemailer({
            transporter: transporter,
        }),
    ],
}));
```

## Configuration

This plugin offers the following configuration options to control email sending behavior.

| Property | Type | Description |
|----------|------|-------------|
| `transporter` | `Transporter` | A configured Nodemailer transporter instance |
| `remoteAttachments` | `{ maxBytes?: number; timeoutMs?: number }` | Optional remote attachment handling config |

### transporter

This should be a configured Nodemailer transporter instance. You can create this using any of the transport methods supported by Nodemailer, such as SMTP, Gmail, or other email service providers.

### remoteAttachments

When an email includes URL-based attachments, this plugin fetches those remote files itself, checks the resolved addresses and redirects, enforces timeout and size limits, and passes the downloaded bytes to Nodemailer as `content`.

You can configure the maximum remote attachment size and request timeout:

```typescript
LucidNodemailer({
    transporter,
    remoteAttachments: {
        maxBytes: 10 * 1024 * 1024,
        timeoutMs: 15_000,
    },
});
```

`maxBytes` defaults to `10 * 1024 * 1024` and `timeoutMs` defaults to `15_000`.
