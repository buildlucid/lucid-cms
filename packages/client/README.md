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
    localeCode: "en",
});

const processed = await client.media.process({
    key: "public/hero.jpg",
    body: {
        width: 1200,
        format: "webp",
    },
});
```

The `localeCode` option is request-scoped and is primarily useful for media list requests where Lucid needs a locale when filtering or sorting translated media fields.

## Locales

Use the locales client to fetch every configured locale.

```typescript
const locales = await client.locales.getAll();
```

## Types

A separate type-only entrypoint is also available:

```typescript
import type {
    CollectionDocument,
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
