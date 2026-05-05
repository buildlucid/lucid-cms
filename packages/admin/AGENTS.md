# Admin Package Guide

`packages/admin` contains the Solid admin UI, API hooks, routes, stores, reusable components, and translations.

## Structure

- `src/routes`: Route-level screens and document-builder views.
- `src/components`: Reusable UI components and grouped feature components.
- `src/services/api`: API hooks. Hooks should match existing service patterns and keep response types close to the request.
- `src/hooks`: Shared UI/domain hooks, especially document builder state and mutations.
- `src/store`: Global client state.
- `src/translations`: Admin translation strings. Visible copy should live here.
- `src/utils`: Shared helpers including request, query param, routing, and error utilities.

## Conventions

- Use existing UI primitives (`Button`, `Link`, `Pill`, form groups, modal groups) before adding new markup.
- Put visible UI copy in translation files.
- Organize larger components with the local section-comment style: state/hooks, memos, effects, functions, render.
- API get hooks should use `serviceHelpers.getQueryParams` and `serviceHelpers.getQueryKey`.
- Get-multiple hooks should use the existing `filters`, `include`, `exclude`, `perPage`, and `queryString` patterns.
- Mutation hooks usually expect `ResponseBody<undefined>` and rely on invalidation/refetch after `204` responses.
- Import shared response/domain types directly from `@types`; avoid local type re-export files.
- Keep casts and `any` rare; use narrower types or local guards when possible.
