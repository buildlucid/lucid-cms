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
            from: {
                email: "team@lucidjs.build",
                name: "Lucid CMS",
            },
            transporter: transporter,
        }),
    ],
}));
```

## Configuration

This plugin offers the following configuration options to control email sending behavior.

| Property | Type | Description |
|----------|------|-------------|
| `from` | `object` | The default sender information for emails |
| `transporter` | `Transporter` | A configured Nodemailer transporter instance |

### from

The `from` object contains the default sender information that will be used for all emails sent through this plugin.

| Property | Type | Description |
|----------|------|-------------|
| `email` | `string` | The email address that emails will be sent from |
| `name` | `string` | The display name that will appear as the sender |

### transporter

This should be a configured Nodemailer transporter instance. You can create this using any of the transport methods supported by Nodemailer, such as SMTP, Gmail, or other email service providers.