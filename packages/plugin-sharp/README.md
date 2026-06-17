# Lucid CMS - Sharp Plugin

> The official Sharp image processing for Lucid CMS

This plugin registers a Sharp-backed image processor for Lucid media presets.

## Installation

```bash
npm install @lucidcms/plugin-sharp
```

## Setup

```ts
import { configureLucid } from "@lucidcms/core";
import { node } from "@lucidcms/node-adapter";
import { sharpPlugin } from "@lucidcms/plugin-sharp";
import { sqlite } from "@lucidcms/sqlite-adapter";

export default configureLucid({
	runtime: node,
	db: sqlite,
	config: () => ({
		plugins: [sharpPlugin()],
	}),
});
```
