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

The browser-safe `@lucidcms/client/toolbar` entrypoint provides Lucid's Admin, edit-page, and preview controls as an isolated Shadow DOM pill. Register the declarative element once in your browser entrypoint:

```typescript
import { defineToolbarElement } from "@lucidcms/client/toolbar";

defineToolbarElement();
```

Then render the page state alongside the document. The element initializes when connected and cleans up when disconnected.

```html
<lucid-toolbar
    host="https://cms.example.com"
    edit-collection="page"
    edit-document-id="42"
    edit-status="latest"
    preview="perspective"
    preview-token="PREVIEW_TOKEN"
></lucid-toolbar>
```

Use `preview="published"` when the server resolved published mode and stale preview state should be cleared. Omit `preview` to detect preview state from the current URL or browser session. The preview token attribute is consumed and removed after the element initializes.

| Attribute | Purpose |
| --- | --- |
| `host` | Public host of the Lucid instance; defaults to the page origin. |
| `edit-collection` | Collection key for the edit action. |
| `edit-document-id` | Integer document ID for the edit action. |
| `edit-status` | Document version type; defaults to `latest`. |
| `edit-version-id` | Version ID required by the `revision` edit status. |
| `edit-label` | Accessible label for the edit action. |
| `preview` | `published`, `perspective`, or `exact`. |
| `preview-token` | Lucid preview bearer token. |
| `preview-exit-href` | Destination restored when preview ends. |

Only set `host` when Lucid is served from a different origin. The toolbar derives the admin and API URLs from the fixed `/lucid` mount, sends the session-status request with credentials, and does not send a referrer. Add the frontend origin to Lucid's `http.security.cors.origin` configuration when it differs. Browser cookie rules still apply, so the authenticated actions only appear when the Lucid session cookies are eligible for the request.

For advanced lifecycle, authentication, or exit callbacks, use the programmatic API instead:

```typescript
import { setupToolbar } from "@lucidcms/client/toolbar";

const toolbar = setupToolbar({
    host: "https://cms.example.com",
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
