# Lucid CMS - Rich Text

> Shared Tiptap extensions and rich text utilities for Lucid CMS

`@lucidcms/rich-text` centralises the rich text setup used across Lucid CMS.

It provides:

- A shared `extensions` array for Tiptap.
- A `RichTextJSON` type for rich text field values.
- Browser and server conversion utilities for HTML and JSON.

## Installation

```bash
npm install @lucidcms/rich-text
```

## Exports

This package provides three entry points:

- `@lucidcms/rich-text`
- `@lucidcms/rich-text/browser`
- `@lucidcms/rich-text/server`

## Main Entry

The main entry exports the shared extensions array and the `RichTextJSON` type.

```typescript
import { extensions, type RichTextJSON } from "@lucidcms/rich-text";
```

## Browser Utilities

Use browser-safe conversion helpers from `@lucidcms/rich-text/browser`.

```typescript
import { toHTML, toJSON } from "@lucidcms/rich-text/browser";
import type { RichTextJSON } from "@lucidcms/rich-text";

const json: RichTextJSON = {
	type: "doc",
	content: [
		{
			type: "paragraph",
			content: [{ type: "text", text: "Hello world" }],
		},
	],
};

const html = toHTML(json);
const nextJson = toJSON(html);
```

## Server Utilities

Use server-safe conversion helpers from `@lucidcms/rich-text/server`.

```typescript
import { toHTML, toJSON } from "@lucidcms/rich-text/server";

const html = toHTML({
	type: "doc",
	content: [
		{
			type: "paragraph",
			content: [{ type: "text", text: "Server render" }],
		},
	],
});

const json = toJSON(html);
```

## Shared Extensions

Both browser and server conversion helpers use the shared `extensions` array internally.

This means consumers do not need to provide extension definitions when converting rich text content.
