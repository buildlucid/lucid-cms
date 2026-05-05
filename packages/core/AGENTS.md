# Core Package Guide

`packages/core` contains the CMS API, service layer, database access, runtime config, and backend domain logic.

## Structure

- `src/libs/http/controllers`: Hono route handlers. Controllers validate input, call services through `serviceWrapper`, throw `LucidAPIError` for service errors, and shape HTTP responses.
- `src/libs/http/routes`: API route registration.
- `src/schemas`: Zod request/response schemas used by controllers and OpenAPI metadata.
- `src/services`: Domain logic. Services return errors as values via `ServiceFn`; they should not throw for expected failures.
- `src/libs/repositories`: Database repositories. Use repository/query-builder patterns already present in the package.
- `src/libs/formatters`: Response formatters. Keep formatting out of services/controllers.
- `src/libs/db/migrations`: Source migrations. 
- `src/translations`: Backend translation strings. User-facing errors/messages should use `T(...)`.
- `templates`: MJML email templates.

## Conventions

- Prefer service responses with direct `{ error, data }` returns over helper functions that manufacture service-response shapes.
- Create/update/delete controllers usually return `204` with no body; clients should invalidate and refetch.
- Keep controllers thin: validation, auth/permission middleware, service call, HTTP response.
- Keep services readable with early returns and clear sections when the workflow has multiple domain stages.
- Use formatter `formatSingle`/`formatMultiple` at the boundary where data becomes API response data.
- Use `QueryProps`, repository query config, and query-builder helpers for complex repository queries.
- Do not add compatibility aliases, deprecated API shapes, or type re-export shims unless explicitly needed.
