# Lucid CMS - Client

> The official client package for Lucid CMS

The Lucid CMS client provides a lightweight way to call Lucid's public document, media, and locale endpoints from browsers, edge runtimes, and modern Node environments. It returns the Lucid response body as-is and never throws request or response errors.

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

## Document Helpers

You can also wrap a document response with `asDocument` to get locale-aware field and brick helpers without changing the raw client response shape.

```typescript
import { asDocument, asDocuments, createClient } from "@lucidcms/client";

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

For a multiple-document response, use `asDocuments` to apply the same options to every document:

```typescript
const response = await client.documents.getMultiple({
    collectionKey: "page",
    version: "published",
});

if (!response.error) {
    const pages = asDocuments(response.data.data, { locale: "en" });

    for (const page of pages) {
        console.log(page.field("page_title").value());
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
    version: "published",
});

if (response.error) {
    console.error(response.error.message);
} else {
    console.log(response.data.data);
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

For click-to-field targeting, pass the active preview state to `asDocument(..., { preview: true })` and spread `field.preview()` onto the element rendering that field. It returns an empty object outside preview mode; consumers should not construct preview attributes or messages directly.

## Toolkit Toolbar Helper

Server-rendered frontends using the Lucid Toolkit can create `<lucid-toolbar>` attributes with `toolbarFromToolkit()`.

```typescript
import { toolbarFromToolkit } from "@lucidcms/client/toolbar";

const [authentication, preview] = await Promise.all([
    toolkit.auth.status(authOptions),
    toolkit.previews.state(previewOptions),
]);
const document = await toolkit.documents.getSingle(documentOptions);

const toolbarAttributes = toolbarFromToolkit({
    authentication,
    document,
    preview,
    host: "https://cms.example.com",
});
```
