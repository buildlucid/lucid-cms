# Lucid CMS - SQLite KV Plugin

> The official SQLite-backed KV storage plugin for Lucid CMS

This plugin registers a local `better-sqlite3` KV adapter for Lucid CMS.

## Installation

```bash
npm install @lucidcms/plugin-sqlite-kv
```

## Setup

```ts
import { configureLucid } from "@lucidcms/core";
import { node } from "@lucidcms/runtime-node";
import { sqliteKVPlugin } from "@lucidcms/plugin-sqlite-kv";
import { sqlite } from "@lucidcms/db-sqlite";

export default configureLucid({
	runtime: node,
	db: sqlite,
	config: () => ({
		plugins: [
			sqliteKVPlugin(),
		],
	}),
});
```

## Configuration

The plugin accepts the standard Lucid KV adapter options.
