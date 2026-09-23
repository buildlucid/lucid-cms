# @lucidcms/rich-text

## v1.2.0

- Document node renderers now resolve related documents from the response-level refs object.
- Bumped `@lucidcms/types` to `0.6.0`.

## v1.1.1

- Fixed server-side rich text HTML generation in Cloudflare runtimes by using a DOM-free renderer.

## v1.1.0

- Added a `generateText` helper to the browser and server exports for converting rich text JSON to plain text.

## v1.0.0

- First release.
- Added shared Tiptap extensions and rich text conversion helpers for browser and server usage.
