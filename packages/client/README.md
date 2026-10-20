# Lucid CMS - Client

> The official client package for Lucid CMS

The Lucid CMS client provides a lightweight way to call Lucid's public document, media, and locale endpoints from browsers, edge runtimes, and modern Node environments. It unwraps response data and returns shared refs and response metadata alongside it. It never throws request or response errors.

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

| Property | Type | Description |
|----------|------|-------------|
| `baseUrl` | `string` | Your site or app base URL. The client appends Lucid's public content endpoint path internally |
| `auth` | `LucidClientAuth` | An integration key or OAuth access token configuration |
| `fetch` | `typeof fetch` | A custom fetch implementation |
| `headers` | `HeadersInit \| () => HeadersInit \| Promise<HeadersInit>` | Additional headers to send with every request |
| `timeoutMs` | `number` | A default request timeout in milliseconds |
| `retry` | `false \| Partial<LucidRetryConfig>` | Retry configuration for requests |
| `middleware` | `LucidMiddleware[]` | Request, response, and error middleware |

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
    query: {
        filter: {
            _fullSlug: {
                value: "/about",
            },
        },
    },
});

const pages = await client.documents.getMultiple({
    collectionKey: "page",
    version: "published",
    query: {
        page: 1,
        perPage: 10,
    },
});
```

## Media

Use the media client to fetch media items or resolve transformed media URLs.

```typescript
const media = await client.media.getMultiple({
    query: {
        filter: {
            title: {
                value: "Hero",
            },
        },
    },
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
    query: {
        include: ["bricks"],
    },
});

if (!response.error) {
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
    query: {
        filter: { _fullSlug: { value: "/about" } },
    },
});
```

## Frontend Toolbar

The `@lucidcms/client/toolbar` browser entry exports an isolated `<lucid-toolbar>` with Admin, edit-page, preview-status, and exit actions. Authentication and previews are resolved automatically. Set `host` when Lucid is served from another origin.

```html
<script type="module">
    import { LucidToolbarElement } from "@lucidcms/client/toolbar";

    if (!customElements.get(LucidToolbarElement.tagName)) {
        customElements.define(LucidToolbarElement.tagName, LucidToolbarElement);
    }
</script>

<lucid-toolbar
    edit-collection="page"
    edit-document-id="42"
    edit-version="latest"
></lucid-toolbar>
```

For JavaScript-controlled integrations, `setupToolbar()` returns a controller for SPA route updates and cleanup.

```typescript
import { setupToolbar } from "@lucidcms/client/toolbar";

const toolbar = setupToolbar({
    document: {
        collectionKey: "page",
        id: 42,
        version: "latest",
    },
});

window.addEventListener("pagehide", toolbar.cleanup, { once: true });
```

## Builder Preview Runtime

The `@lucidcms/client/preview` browser entry lazily installs safe exact/session navigation, scroll restoration, and click-to-field targeting inside Lucid's builder iframe. `setupPreview()` reads the mode and token from the builder-controlled frame context; outside the recognized iframe it remains inactive and does not load the runtime.

```typescript
import { setupPreview } from "@lucidcms/client/preview";

const preview = setupPreview();

window.addEventListener("pagehide", preview.cleanup, { once: true });
```

For click-to-field targeting, add `previewFieldMarkup(target)` from `@lucidcms/client/markup` to the element rendering a field while previewing, such as `<h1${previewFieldMarkup(target)}>`. The target names the document, the brick when the field is in one, and the field's path, such as `{ collectionKey: page.collectionKey, documentId: page.id, locale: page.locale ?? undefined, brick: { type: "builder", key: brick.key, order: brick.order }, path: ["sections", 0, "heading"] }`. Consumers should not construct preview attributes or messages directly.

## Server-Rendered Toolbar

Server-rendered frontends can create `<lucid-toolbar>` attributes with `createToolbarAttributes()`, passing what the server already knows.

```typescript
import { createToolbarAttributes } from "@lucidcms/client/toolbar";

const [authentication, preview] = await Promise.all([
    toolkit.auth.status(authOptions),
    toolkit.previews.state(previewOptions),
]);

const toolbarAttributes = createToolbarAttributes({
    host: "https://cms.example.com",
    document: { collectionKey: "page", id: page.id, version: page.version },
    authentication: authentication.data?.authenticated ?? "auto",
    preview: preview.data ?? "auto",
});
```
