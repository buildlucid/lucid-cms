# Lucid CMS - Client

> The official client package for Lucid CMS

The Lucid CMS client provides a lightweight way to call Lucid's public document, media, and locale endpoints from browsers, edge runtimes, and modern Node environments. It unwraps response data and returns it beside the original response. It never throws request or response errors.

## Installation

```bash
npm install @lucidcms/client
```

## Setup

To use the client, create it with your site base URL and either a Lucid integration key or an OAuth access token.

```typescript
import { createClient } from "@lucidcms/client";

const client = createClient({
  baseUrl: "https://example.com",
  auth: {
    type: "apiKey",
    apiKey: "<your-integration-key>",
  },
});
```

For OAuth connections, provide an access token or a function that resolves the current access token:

```typescript
const client = createClient({
  baseUrl: "https://example.com",
  auth: {
    type: "oauth",
    accessToken: () => tokenStore.getValidAccessToken(),
  },
});
```

The access-token function runs for every request attempt so it can return a refreshed token. The client does not perform the OAuth authorization flow, refresh tokens, or persist tokens.

## Configuration

The `createClient` function accepts the following options:

| Property     | Type                                                       | Description                                                                                   |
| ------------ | ---------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `baseUrl`    | `string`                                                   | Your site or app base URL. The client appends Lucid's public content endpoint path internally |
| `auth`       | `LucidClientAuth`                                          | An integration key or OAuth access token configuration                                        |
| `fetch`      | `typeof fetch`                                             | A custom fetch implementation                                                                 |
| `headers`    | `HeadersInit \| () => HeadersInit \| Promise<HeadersInit>` | Additional headers to send with every request                                                 |
| `timeoutMs`  | `number`                                                   | A default request timeout in milliseconds                                                     |
| `retry`      | `false \| Partial<LucidRetryConfig>`                       | Retry configuration for requests                                                              |
| `middleware` | `LucidMiddleware[]`                                        | Request, response, and error middleware                                                       |

## Account

User-scoped credentials with the `account:read` scope can fetch the account associated with the credential.

```typescript
const account = await client.account.get();
```

## Documents

Use the documents client to fetch a single document or a paginated list of documents from a collection.

```typescript
const page = await client.documents.getSingle({
  collectionKey: "page",
  version: "published",
  filter: { fields: { path: "/about" } },
});

const pages = await client.documents.getMultiple({
  collectionKey: "page",
  version: "published",
  page: 1,
  perPage: 10,
});
```

`getSingle` returns `data: null` when nothing matches. `getMultiple` returns `data: { items, pagination }`.

Set `version` once with `createClient({ version: "published" })` to leave it out of each read.

### Filters

Filters are shaped like the document: document properties such as `id` at the top, then `fields` by field key and `bricks` by brick and field key. A plain value matches for equality, a list matches any of its values, and `{ value, operator }` uses another operator. Fields inside repeaters use the same keys. Pass a list of filter objects to match any of them.

```typescript
const posts = await client.documents.getMultiple({
  collectionKey: "blog",
  version: "published",
  filter: {
    id: [1, 2, 3],
    fields: { title: { value: "News", operator: "starts-with" } },
    bricks: { hero: { heading: "Welcome" } },
  },
  sort: [{ key: "fields.title", direction: "asc" }],
});
```

### Types

Lucid generates your collection types into `.lucid/client.d.ts`. For a front end in another folder or package, list where to write a copy in your Lucid config, and include that file in the front end's TypeScript project:

```typescript
build: {
  clientTypes: ["../web/src/lucid.d.ts"],
}
```

## Media

Use the media client to fetch media items or resolve transformed media URLs.

```typescript
const media = await client.media.getMultiple({
  filter: { type: "image", title: { value: "Hero", operator: "contains" } },
});

const resolved = await client.media.resolveUrl({
  key: "public/hero.jpg",
  preset: "thumbnail-small",
  format: "webp",
});
```

## Locales

Use the locales client to fetch every configured locale.

```typescript
const locales = await client.locales.getAll();
```

## Reading Documents

Document responses are ready to render. Media and users are filled in, relations are related documents, builder bricks are listed in order under `bricks`, fixed bricks are keyed by brick key under `fixed`, and rich text has its embedded bricks and linked documents in its node attrs. Pass a `locale` to read translated fields, routes and media text in one locale; collections without it use their default locale. Add a `fallbackLocale` to fill empty translations from another locale. Related documents are filled in one level deep by default; set `depth` from 0, for just their IDs, to 3.

```typescript
import { createClient } from "@lucidcms/client";

const client = createClient({
  baseUrl: "https://example.com",
  auth: {
    type: "apiKey",
    apiKey: "<your-integration-key>",
  },
});

const response = await client.documents.getSingle({
  collectionKey: "page",
  version: "published",
  locale: "fr",
  fallbackLocale: "en",
  include: ["bricks"],
});

if (response.data) {
  const page = response.data;

  console.log(page.fields.page_title, page.route?.path);
  console.log(page.fields.hero[0]?.alt, page.fields.related_page[0]?.route);
  console.log(page.fixed?.seo?.fields.canonical_url);

  for (const brick of page.bricks ?? []) {
    console.log(brick.key, brick.fields);
  }
}
```

## Types

A separate type-only entrypoint is also available:

```typescript
import type {
  CollectionDocument,
  ContentDocument,
  DocumentRef,
  MediaRef,
  UserRef,
} from "@lucidcms/client/types";
```

## Error Handling

The client never throws request or response errors. Instead, every method resolves to an object containing either `data` or `error`.

```typescript
const response = await client.documents.getSingle({
  collectionKey: "page",
  version: "published",
});

if (response.error) {
  console.error(response.error.message);
} else {
  console.log(response.data);
}
```

## Previews

Browser applications can resolve a Lucid-generated preview token to obtain its mode and expiry. Every document fetch still declares its baseline `version`; the preview token can override that version where the preview perspective maps to the requested collection. Treat preview tokens as bearer credentials and never forward them to another origin.

```typescript
const token = "PREVIEW_TOKEN";
const preview = await client.previews.resolve({ token });

const page = await client.documents.getSingle({
  collectionKey: "page",
  version: "published",
  preview: token,
  filter: { fields: { path: "/about" } },
});
```

## Builder Preview Runtime

The `@lucidcms/client/preview` browser entry lazily installs scroll restoration and click-to-field targeting inside Lucid's builder iframe. `setupPreview()` reads the token from the builder-controlled frame context; outside the recognized iframe it remains inactive and does not load the runtime.

```typescript
import { setupPreview } from "@lucidcms/client/preview";

const preview = setupPreview();
```

Call `preview.cleanup()` only when tearing the app down without leaving the page; the builder then reloads the frame to show changes. Pages that leave or enter the back/forward cache tell the builder themselves.

### Live Updates

The builder shows unsaved edits in the preview. Every document read that passes the preview token gets the editor's current content, with relations, media and locales filled in as they would be after a save. By default the page reloads after each change.

Register an update handler to re-render in place instead. Handlers receive the change's `revision` and a `signal` that aborts when a newer change arrives. They run one change at a time, and if one throws, the page reloads. `setupPreview()` returns the same controller each time it is called, so separate parts of a page can register their own handlers.

```typescript
import { setupPreview } from "@lucidcms/client/preview";

const preview = setupPreview();

// Single-page apps: read again and re-render
preview.onUpdate(async ({ signal }) => {
  const response = await client.documents.getSingle({
    collectionKey: "page",
    version: "published",
    preview: preview.token ?? undefined,
    filter: { fields: { path: location.pathname } },
    request: { signal },
  });
  if (response.data) render(response.data);
});
```

Filters and sorting still match saved content, so a list keeps the previewed document where it was, showing its unsaved fields.

For click-to-field targeting, spread `previewAttributes(source, field?)` from `@lucidcms/client/markup` onto the element rendering a field, such as `<h1 {...previewAttributes(page, "title")}>`. `source` is the document, brick or repeater item the content API returned while previewing, and leaving out `field` marks the brick or item itself. String templates can use `previewFieldMarkup(target)` instead. The attributes are empty outside previews. Consumers should not construct preview attributes or messages directly.

### Editing on the Page

With "Edit on page" on, clicking a marked field selects it and opens it in the builder, and clicking it again (or pressing Enter) edits it. Text and textarea fields are typed into where the page shows them; other fields open in the builder's fields column, with their picker open when they have one, such as media or a link.

A field is typed into on the page only when its element holds nothing but the field's text, so mark the element that renders the text itself, eg. `<h1 {...previewAttributes(page, "title")}>{page.fields.title}</h1>`, rather than a wrapper around it. Fields shown alongside other text, or changed for display, open in the builder instead. For an empty field, render a placeholder in the marked element while previewing; it's cleared once typing starts.
