# Lucid CMS - Rich Text

> Shared Tiptap extensions and rich text utilities for Lucid CMS

`@lucidcms/rich-text` centralises the rich text setup used across Lucid CMS.

It provides:

- A shared `extensions` array for Tiptap.
- A `RichTextJSON` type for rich text field values.
- Browser and server HTML generation utilities.
- Browser and server JSON generation utilities.

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
import { generateHTML, generateJSON } from "@lucidcms/rich-text/browser";
import type { RichTextJSON } from "@lucidcms/rich-text";
import Heading from "@tiptap/extension-heading";

const json: RichTextJSON = {
	type: "doc",
	content: [
		{
			type: "paragraph",
			content: [{ type: "text", text: "Hello world" }],
		},
	],
};

const html = generateHTML(json);
const customHtml = generateHTML(json, {
	extensions: [
		Heading.configure({
			HTMLAttributes: {
				class: "prose-heading",
			},
		}),
	],
});
const nextJson = generateJSON(html);
```

Browser `generateHTML` accepts optional custom extensions, which are merged into Lucid's required extension set by extension name.

## Server Utilities

Use server-safe conversion helpers from `@lucidcms/rich-text/server`.

```typescript
import { generateHTML, generateJSON } from "@lucidcms/rich-text/server";

const html = generateHTML({
	type: "doc",
	content: [
		{
			type: "paragraph",
			content: [{ type: "text", text: "Server render" }],
		},
	],
});

const json = generateJSON(html);
```

## Shared Extensions

Both browser and server helpers use the shared `extensions` array internally.

This means consumers do not need to provide extension definitions when converting rich text content.
