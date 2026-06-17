# Lucid CMS - Filesystem Plugin

> The official Filesystem storage plugin for Lucid CMS

This plugin registers a local filesystem media adapter and the upload/download routes used for signed direct uploads in Lucid CMS.

## Installation

```bash
npm install @lucidcms/plugin-filesystem
```

## Setup

```ts
import { configureLucid } from "@lucidcms/core";
import { node } from "@lucidcms/node-adapter";
import { filesystemPlugin } from "@lucidcms/plugin-filesystem";
import { sqlite } from "@lucidcms/sqlite-adapter";

export default configureLucid({
	runtime: node,
	db: sqlite,
	config: () => ({
		plugins: [
			filesystemPlugin({
				uploadDir: "uploads",
			}),
		],
	}),
});
```

## Configuration

| Property | Type | Description |
|----------|------|-------------|
| `uploadDir` | `string` | Directory used to store uploaded files. Defaults to `uploads`. |
| `secretKey` | `string` | Secret used to sign filesystem media URLs. Defaults to the Lucid encryption secret. |
