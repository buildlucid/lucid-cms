# Lucid CMS - Rich Text

> Shared Tiptap extensions and rich text utilities for Lucid CMS

`@lucidcms/rich-text` centralises the rich text setup used across Lucid CMS.

It provides:

- A shared `extensions` array for Tiptap.
- Lucid document-link, media, variable, and embedded-brick nodes.
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

## Rendering References

Reference nodes use the normal refs and bricks returned on a Lucid document. No rich-text-specific ref bucket is added.

Request `refs.media` for media nodes, `refs.relation` for document links and variables, and `bricks` for embedded bricks when fetching the document.

```typescript
import { generateHTML } from "@lucidcms/rich-text/server";

const html = generateHTML(document.fields.body, {
  refs: document.refs,
  bricks: document.bricks,
  locale: "en",
  renderers: {
    embeddedBrick: ({ brick }) => renderBrick(brick),
  },
});
```

- Document links store only a collection key and document ID. The current URL is read from the hydrated document ref's `route`. If either is unavailable, only the link text is rendered.
- Media nodes store only a media ID. URLs, titles, descriptions, and image alt text are read from `refs.media` at render time.
- Variable nodes identify a collection, document, and top-level scalar field. Their current value is read from the normal document relation ref.
- Embedded-brick nodes store a stable brick ref. Supply `renderers.embeddedBrick` to render the matching item from `document.bricks`.

Custom renderers are also available for document links, media, and variables when an application needs framework-specific markup.

## Editor configuration

Rich-text capabilities are opt-in on the custom field. For example:

```typescript
collection.addRichText("body", {
  editor: {
    links: {
      external: true,
      internal: ["pages", "posts"],
    },
    media: ["image", "audio", "video"],
    variables: ["site-settings"],
    bricks: ["callout", "quote"],
    appearance: "seamless",
    fullscreen: true,
  },
});
```

- `links.internal` is `true` for every collection with routing configured, or an array of allowed collection keys.
- `media` is `true` for images, audio, and video, or an allowed media-type array.
- `variables` is `true` for every collection, or an allowed collection-key array. The editor only exposes top-level scalar fields.
- `bricks` is `true` for every brick registered under `collection.bricks.embedded`, or an allowed brick-key array.
- `appearance: "seamless"` removes the field chrome; `fullscreen` adds an editor fullscreen toggle.

Document links require routing on their target collection. The configured field must contain the complete public path:

```typescript
const Posts = new CollectionBuilder("posts", {
  mode: "multiple",
  routing: "fullSlug",
  // ...
});
```

A link does not store a fallback path, so a missing document, route, or path value renders as plain text. A custom document-link renderer receives the resolved current `href`.
