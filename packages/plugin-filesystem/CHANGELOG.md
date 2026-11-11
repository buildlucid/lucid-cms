# @lucidcms/filesystem

## v0.20.0 (unreleased)

### Breaking Changes:

- Renamed from `@lucidcms/plugin-filesystem` to `@lucidcms/filesystem`, and versions now match `@lucidcms/core`.

### Bug Fixes:

- Fixed uploads at the same time losing each other's file types, which left files served without one.
- Fixed uploads being read whole before their signed link was checked, with no size limit. They now stop at `media.limits.uploadBytes`.
- Fixed range requests that run past the end of a file being refused. They are now read up to its last byte.
- Fixed a new image variant answering with a different ETag than later requests, so browsers downloaded it again.
- Fixed bulk uploads failing after 20 files a minute. Signed upload and download links are no longer limited by address.
