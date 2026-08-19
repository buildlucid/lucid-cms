# Lucid CMS - Sharp Plugin

> The official Sharp media delivery plugin for Lucid CMS

This plugin registers a Lucid media delivery adapter that uses Sharp for on-demand image presets. Files remain behind Lucid's CDN endpoint.

## Installation

```bash
npm install @lucidcms/plugin-sharp
```

## Setup

```ts
import { configureLucid } from "@lucidcms/core";
import { node } from "@lucidcms/runtime-node";
import { sharpPlugin } from "@lucidcms/plugin-sharp";
import { sqlite } from "@lucidcms/db-sqlite";

export default configureLucid({
  runtime: node,
  db: sqlite,
  config: () => ({
    plugins: [sharpPlugin()],
  }),
});
```
