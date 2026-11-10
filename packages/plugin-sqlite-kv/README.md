# Lucid CMS - SQLite KV Plugin

> The official SQLite-backed KV storage plugin for Lucid CMS

This plugin registers a local `better-sqlite3` KV adapter for Lucid CMS.

## Installation

```bash
npm install @lucidcms/sqlite-kv
```

## Setup

```ts
import { defineConfig } from "@lucidcms/core";
import { node } from "@lucidcms/node";
import { sqlite } from "@lucidcms/sqlite";
import { sqliteKV } from "@lucidcms/sqlite-kv";

export default defineConfig({
  runtime: node,
  db: sqlite,
  config: () => ({
    url: "https://cms.example.com",
    plugins: [sqliteKV()],
  }),
});
```

## Configuration

The plugin accepts the standard Lucid KV adapter options.
