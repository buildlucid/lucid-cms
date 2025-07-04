# Lucid - S3 Plugin

> The official S3 plugin for Lucid

This plugin registers the required media strategy functions to stream, upload, update and delete media from any S3 compatible storage solution.

## Installation

```bash
npm install @lucidcms/plugin-s3
```

## lucid.config.ts/js

```typescript
import LucidS3 from "@lucidcms/plugin-s3";

export default lucid.config({
  // ...other config
    plugins: [
        LucidS3({
            endpoint: `https://${process.env.HEADLESS_CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
            bucket: "headless-cms",
            clientConfig: {
                region: "auto",
                accessKeyId: process.env.HEADLESS_S3_ACCESS_KEY as string,
                secretAccessKey: process.env.HEADLESS_S3_SECRET_KEY as string,
            },
        }),
    ],
});
```
## Bucket Configuration

As Lucid uses presigned URLs to upload media from the client, you will need to configure your S3 bucket's CORS policy. This will need to allow `PUT` requests, along with the `Content-Type` and `Origin` headers.

### Example Cloudflare R2 CORS Policy

```json
[
  {
    "AllowedOrigins": [
      "http://localhost:8787",
      "http://localhost:5432",
    ],
    "AllowedMethods": [
      "GET",
      "PUT"
    ],
    "AllowedHeaders": [
      "Origin",
      "Content-Type",
      "x-amz-meta-*"
    ]
  }
]
```