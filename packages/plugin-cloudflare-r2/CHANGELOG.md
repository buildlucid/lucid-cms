# @lucidcms/cloudflare-r2

## v0.20.0 (unreleased)

### Features:

- The binding now reaches the Cloudflare runtime as a `cloudflare:bindings` artifact.

### Breaking Changes:

- Renamed from `@lucidcms/plugin-cloudflare-r2` to `@lucidcms/cloudflare-r2`, and versions now match `@lucidcms/core`.
- Removed the `previewBucketName` option, which Cloudflare's `cf` CLI has no equivalent for.

### Bug Fixes:

- Fixed bulk uploads failing after 20 files a minute. Signed upload and download links are no longer limited by address.
- Fixed missing files answering 500 instead of 404, and range requests past the end of a file failing, which also stopped uploads' types being checked from their bytes.
- Fixed media uploads through the R2 binding failing with "Inter-TransformStream ReadableStream.pipeTo() is not implemented."
