# Lucid Integration Playground

A browser app for testing Lucid integrations. Switch between OAuth and Search using the navigation. Your OAuth session stays available while you move between pages.

## Run locally

Copy `.env.example` to `.env`, then run `npm run dev -w @lucidcms/integration-playground` from the repository root. The app opens on `http://localhost:5173`.

## OAuth

Test discovery, consent with PKCE, token refresh and revocation. The request console also accepts a Lucid integration key.

By default, the playground publishes its own client metadata document. To test a registered public application, set `VITE_OAUTH_CLIENT_ID` and register `http://localhost:5173/callback` as its redirect URL.

## Search

Choose published pages or public media, enter a query, and select English or French. Use an integration key or OAuth session with permission to read the `page` collection for pages, or `media:read` for media. The page calls the node playground’s content search routes.

Run the node playground with the Typesense plugin configured and publish some pages or upload public media first. Typesense credentials stay on the server. Browser credentials stay in memory and clear when the page reloads.
