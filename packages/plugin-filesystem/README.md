# Lucid CMS - Filesystem Plugin

> The official Filesystem storage plugin for Lucid CMS

This plugin registers a local filesystem storage adapter and the upload/download routes used for signed direct uploads in Lucid CMS.

## Installation

```bash
npm install @lucidcms/filesystem
```

## Setup

```ts
import { defineConfig } from "@lucidcms/core";
import { filesystem } from "@lucidcms/filesystem";
import { node } from "@lucidcms/node";
import { sqlite } from "@lucidcms/sqlite";

export default defineConfig({
  runtime: node,
  db: sqlite,
  config: () => ({
    url: "https://cms.example.com",
    plugins: [
      filesystem({
        uploadDir: "uploads",
      }),
    ],
  }),
});
```

## Configuration

| Property    | Type     | Description                                                                         |
| ----------- | -------- | ----------------------------------------------------------------------------------- |
| `uploadDir` | `string` | Directory used to store uploaded files. Defaults to `uploads`.                      |
| `secretKey` | `string` | Secret used to sign filesystem media URLs. Defaults to the Lucid encryption secret. |
