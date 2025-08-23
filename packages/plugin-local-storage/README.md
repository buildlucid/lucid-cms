# Lucid CMS - Local Storage Plugin

> The official Local Storage plugin for Lucid

The Lucid CMS Local Storage plugin registers the required media strategy functions to stream, upload, update and delete media from a specified local directory. This plugin is ideal for development environments or when you want to store media files directly on your server.

## Installation

```bash
npm install @lucidcms/plugin-local-storage
```

## Setup

To use the Local Storage plugin, you need to add it to your Lucid CMS config file. You'll need to provide the upload directory and secret key.

```typescript
import { nodeAdapter, defineConfig } from "@lucidcms/node-adapter";
import LucidLocalStorage from "@lucidcms/plugin-local-storage";

export const adapter = nodeAdapter();

export default defineConfig((env) => ({
    // ...other config
    plugins: [
        LucidLocalStorage({
            uploadDir: "./uploads",
            secretKey: env.LOCAL_STORAGE_SECRET_KEY,
        }),
    ],
}));
```

## Configuration

This plugin offers the following configuration options to control local storage behaviour.

| Property | Type | Description |
|----------|------|-------------|
| `uploadDir` * | `string` | The local directory where media files will be stored |
| `secretKey` * | `string` | Secret key used for verifying the presigned URL |

### uploadDir

The local directory path where media files will be stored. This should be relative to the root of your project. The directory will be created automatically if it doesn't exist.

### secretKey

A secret key used for verifying the presigned URL. It's recommended to store this as an environment variable for security.