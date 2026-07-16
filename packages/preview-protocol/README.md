# Lucid CMS - Preview Protocol

`@lucidcms/preview-protocol` is the private wire contract shared by the Lucid admin and the frontend preview runtime. It keeps both sides speaking the same versioned language, even when a customer frontend and the admin are deployed at different times.

This package is bundled into its consumers. It is not published and is not a public integration API. Frontends should use the preview helpers from `@lucidcms/client` rather than importing this package directly.

## What belongs here

The package owns the small, transport-safe part of preview communication:

- Protocol scope, version, and message names.
- Serializable field targets and scroll state.
- Message envelope creation and direction-specific validation.
- Versioned field-target attribute encoding and decoding.

It deliberately does not contain DOM access, iframe handling, origin policy, event listeners, scrolling, highlighting, or application state. Those behaviours remain in the [client preview runtime](../client/src/preview/) and the [admin preview bridge](../admin/src/utils/preview-bridge.ts).

The root export is intentionally narrow. Keep implementation-only message types and validation helpers internal unless a consumer genuinely needs them.

## How the connection works

1. The frontend preview announces that it is ready.
2. The admin validates the iframe window and configured origin, then replies with a connection message.
3. The frontend records that exact parent origin.
4. Field-focus and scroll messages are exchanged only after that connection is established.

The protocol validates message versions and payload shapes. The admin and client remain responsible for checking windows and origins. Unsupported or malformed messages are ignored safely.

## Field targets

A field target describes a logical location in a document: its collection, document ID, optional brick, locale, and field path. Paths use field keys and repeater indexes so they remain independent of admin-only group references.

```ts
{
    collectionKey: "page",
    documentId: 42,
    brick: { type: "builder", key: "hero", order: 0 },
    path: ["items", 0, "heading"],
    locale: "en",
}
```

Frontend code should annotate fields with `document.field(...).preview()`. Do not construct the attribute or protocol message by hand; their encoding is an internal detail that may change with the protocol version.

## Making changes

Treat the wire format as a compatibility boundary. A deployed frontend may be older or newer than the admin it is loaded within.

- Bump the protocol version for incompatible message or attribute changes. Version mismatches intentionally fail closed rather than being negotiated.
- Update the relevant runtime validator whenever a message shape changes.
- Add round-trip and malformed-input coverage for new target data.
- Keep the package dependency-free and avoid browser or framework-specific code.
