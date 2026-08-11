# Lucid CMS - Rich Text

> Shared Tiptap extensions and rich text utilities for Lucid CMS

`@lucidcms/rich-text` centralises the rich text setup used across Lucid CMS.

It provides:

- A shared `extensions` array for Tiptap.
- Lucid document-link, document, media, variable, and embedded-brick nodes.
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

```typescript
import { generateHTML } from "@lucidcms/rich-text/server";

const html = generateHTML(document.fields.body);

const htmlWithReferences = generateHTML(document.fields.body, {
  document,
  renderers: {
    brick: ({ brick }) => (brick ? renderBrick(brick) : ""),
    document: ({ document: target }) =>
      target ? renderDocumentCard(target) : "",
  },
});
```

- Document links retain their document identity and receive the current URL as a response-only `href`. Missing links render as plain text.
- Document nodes store only their collection and document IDs. When `document` is supplied, the renderer receives either that source document for a self-reference or the matching item from `document.refs.relation`. They render nothing unless `renderers.document` or `renderers.fallback` is supplied.
- Media nodes retain their media ID and receive compact response-only render data. Images render as responsive `<picture>` markup; files render as links.
- Variable nodes retain their document and field identity and receive the current scalar value.
- Embedded-brick nodes store a stable brick ref. When `document` is supplied, `renderers.brick` receives the matching item from `document.bricks`.

The source document is optional. Fetch it with refs and bricks included when those callbacks need related documents or embedded-brick data; unresolved targets are passed as `null`.

Hydrated link, media, and variable attributes are derived data. Lucid removes them before persisting an edited rich-text value.

### Custom element rendering

Each built-in element and mark can be overridden directly. Every callback receives the source `node`, rendered `children`, and `defaultHTML`, making small wrappers straightforward. `fallback` handles extension nodes or marks without a more specific callback.

```typescript
const html = generateHTML(document.fields.body, {
  renderers: {
    h2: ({ children }) => `<h2 class="section-title">${children}</h2>`,
    link: ({ defaultHTML }) => `<span class="link-wrap">${defaultHTML}</span>`,
    media: ({ media, defaultHTML }) =>
      media?.type === "image" ? `<figure>${defaultHTML}</figure>` : defaultHTML,
    fallback: ({ element, children }) =>
      `<div data-rich-text-element="${element}">${children}</div>`,
  },
});
```

Callbacks return trusted HTML and must escape any untrusted values they add themselves.

## Editor configuration

Rich-text capabilities are opt-in on the custom field. For example:

```typescript
collection.addRichText("body", {
  editor: {
    links: {
      external: true,
      internal: ["pages", "posts"],
    },
    media: true,
    documents: ["pages", "posts", "site-settings"],
    variables: ["site-settings"],
    bricks: ["callout", "quote"],
    appearance: "seamless",
    fullscreen: true,
  },
});
```

- `links.internal` is `true` for every collection with routing configured, or an array of allowed collection keys.
- `media` is `true` for every media type, or an allowed array of `image`, `video`, `audio`, `document`, `archive`, and `unknown`.
- `documents` is `true` for every collection, or an allowed collection-key array.
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

A link does not store a fallback path, so a missing document, route, or path value renders as plain text.

The default image renderer uses the smallest configured preset for `<img src>`, includes the remaining presets and original in `srcset`, and places the image base64 preview in `style.background-image`. The marker `data-lucid-rich-text-image-placeholder` is present when a placeholder is applied, so client JavaScript can remove that background after the real image loads. Video posters use the equivalent `data-lucid-rich-text-poster-placeholder` and `data-lucid-rich-text-poster-srcset` attributes. SVGs remain external image sources and are never inlined.
