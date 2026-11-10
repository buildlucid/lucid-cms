# Lucid CMS - Sharp Plugin

> The official Sharp media delivery plugin for Lucid CMS

This plugin registers a Lucid media delivery adapter that uses Sharp for on-demand image presets. Files remain behind Lucid's CDN endpoint.

## Installation

```bash
npm install @lucidcms/sharp
```

## Setup

```ts
import { defineConfig } from "@lucidcms/core";
import { node } from "@lucidcms/node";
import { sharp } from "@lucidcms/sharp";
import { sqlite } from "@lucidcms/sqlite";

export default defineConfig({
  runtime: node,
  db: sqlite,
  config: () => ({
    url: "https://cms.example.com",
    plugins: [sharp()],
  }),
});
```
