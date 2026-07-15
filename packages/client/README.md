# Lucid CMS - Client

> The official client package for Lucid CMS

The Lucid CMS client provides a lightweight way to call Lucid's public document, media, and locale endpoints from browsers, edge runtimes, and modern Node environments. It returns the Lucid response body as-is and never throws request or response errors.

## Installation

```bash
npm install @lucidcms/client
```

## Setup

To use the client, create it with your site base URL and a Lucid client API key.

```typescript
import { createClient } from "@lucidcms/client";

const client = createClient({
    baseUrl: "https://example.com",
    apiKey: "<your-client-api-key>",
});
```

## Configuration

The `createClient` function accepts the following options:

| Property | Type | Description |
|----------|------|-------------|
| `baseUrl` | `string` | Your site or app base URL. The client appends Lucid's public client endpoint path internally |
| `apiKey` | `string` | Your Lucid client integration API key |
| `fetch` | `typeof fetch` | A custom fetch implementation |
| `headers` | `HeadersInit \| () => HeadersInit \| Promise<HeadersInit>` | Additional headers to send with every request |
| `timeoutMs` | `number` | A default request timeout in milliseconds |
| `retry` | `false \| Partial<LucidRetryConfig>` | Retry configuration for requests |
| `middleware` | `LucidMiddleware[]` | Request, response, and error middleware |

## Documents

Use the documents client to fetch a single document or a paginated list of documents from a collection.

```typescript
const page = await client.documents.getSingle({
    collectionKey: "page",
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
    query: {
        page: 1,
        perPage: 10,
    },
});
```

## Media

Use the media client to fetch media items or generate processed media URLs.

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

const processed = await client.media.process({
    key: "public/hero.jpg",
    body: {
        preset: "thumbnail-small",
        format: "webp",
    },
});
```

## Locales

Use the locales client to fetch every configured locale.

```typescript
const locales = await client.locales.getAll();
```

## Document Helpers

You can also wrap a document response with `asDocument` to get locale-aware field and brick helpers without changing the raw client response shape.

```typescript
import { asDocument, createClient } from "@lucidcms/client";

const client = createClient({
    baseUrl: "https://example.com",
    apiKey: "<your-client-api-key>",
});

const response = await client.documents.getSingle({
    collectionKey: "page",
    query: {
        include: ["bricks", "refs"],
    },
});

if (!response.error) {
    const page = asDocument(response.data.data, {
        locale: "en",
    });

    const title = page.field("page_title").value();
    const relatedPage = page.field("related_page").ref("relation");
    const seo = page.brick({
        type: "fixed",
        key: "seo",
    });
    const builderBricks = page.bricks({
        type: "builder",
    });

    console.log(seo?.field("canonical_url").value());

    for (const brick of builderBricks) {
        console.log(brick.key, brick.order);
    }
}
```

## Types

A separate type-only entrypoint is also available:

```typescript
import type {
    CollectionDocument,
    DocumentView,
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
});

if (response.error) {
    console.error(response.error.message);
} else {
    console.log(response.data.data);
}
```

## Previews

Browser applications can resolve a Lucid-generated preview token to obtain its mode and expiry, then pass the token instead of `status` or `versionId` when fetching documents. Treat preview tokens as bearer credentials and never forward them to another origin.

```typescript
const token = "PREVIEW_TOKEN";
const preview = await client.previews.resolve({ token });

const page = await client.documents.getSingle({
    collectionKey: "page",
    preview: token,
    query: {
        filter: { _fullSlug: { value: "/about" } },
    },
});
```

## Frontend Toolbar

The browser-safe `@lucidcms/client/toolbar` entrypoint provides Lucid's edit-page and preview controls. Set it up explicitly and clean it up with your application's page lifecycle.

```typescript
import { setupToolbar } from "@lucidcms/client/toolbar";

const toolbar = setupToolbar({
    edit: {
        collectionKey: "page",
        documentId: 42,
    },
    preview: {
        token: "PREVIEW_TOKEN",
        mode: "perspective",
    },
});

window.addEventListener("pagehide", toolbar.cleanup, { once: true });
```
